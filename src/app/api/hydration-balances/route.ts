import { NextResponse } from "next/server";
import { ApiPromise, WsProvider } from "@polkadot/api";

const HYDRATION_ENDPOINTS = [
  "wss://hydration-rpc.n.dwellir.com",
  "wss://hydration.ibp.network",
  "wss://rpc.hydration.network",
];
const MOONBEAM_PARA_ID = 2004;
const HYDRATION_GLMR_ASSET_ID = 16;
const HYDRATION_USDC_ASSET_ID = 22;

function moonbeamSovereignOnHydration(): string {
  const sibl = Buffer.from("sibl");
  const paraId = Buffer.alloc(4);
  paraId.writeUInt32LE(MOONBEAM_PARA_ID);
  return "0x" + Buffer.concat([sibl, paraId, Buffer.alloc(24)]).toString("hex");
}

function connectWithTimeout(wsProvider: WsProvider, ms: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("WS connect timeout")), ms);
    wsProvider.on("connected", () => { clearTimeout(timer); resolve(); });
    wsProvider.on("error", (err) => { clearTimeout(timer); reject(err); });
    wsProvider.connect();
  });
}

async function fetchSubscanGlmrPrice(): Promise<number> {
  try {
    const blockRes = await fetch("https://moonbeam.subscan.io/block");
    const blockHtml = await blockRes.text();
    const blockMatch = blockHtml.match(/block\/(\d+)/);
    if (!blockMatch) return 0;
    const block = parseInt(blockMatch[1], 10) - 200;
    const priceUrl = `https://moonbeam.subscan.io/tools/price_converter?value=1&type=block&from=GLMR&to=USD&time=${block}`;
    const priceRes = await fetch(priceUrl);
    const priceText = await priceRes.text();
    const priceMatch = priceText.match(/"ema30_average":"([0-9.]+)"/);
    if (!priceMatch) return 0;
    return parseFloat(priceMatch[1]);
  } catch {
    return 0;
  }
}

async function getHydrationBalances(): Promise<{ glmr: string; usdc: string; glmrUsd: string }> {
  const account = moonbeamSovereignOnHydration();

  for (const endpoint of HYDRATION_ENDPOINTS) {
    let api: ApiPromise | null = null;
    try {
      const wsProvider = new WsProvider(endpoint, false);
      await connectWithTimeout(wsProvider, 15_000);
      api = await ApiPromise.create({ provider: wsProvider });
      await api.isReady;

      const [glmrData, usdcData]: any[] = await Promise.all([
        api.query.tokens.accounts(account, HYDRATION_GLMR_ASSET_ID),
        api.query.tokens.accounts(account, HYDRATION_USDC_ASSET_ID),
      ]);

      const glmrFree = glmrData.free.toBigInt();
      const glmrReserved = glmrData.reserved.toBigInt();
      const usdcRaw = usdcData.free.toBigInt();
      const glmrNum = Number(glmrFree + glmrReserved) / 1e18;
      const usdcNum = Number(usdcRaw) / 1e6;

      const glmrPrice = await fetchSubscanGlmrPrice();
      const glmrUsd = glmrNum * glmrPrice;

      return {
        glmr: glmrNum.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        usdc: usdcNum.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        glmrUsd: glmrUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      };
    } catch (e) {
      console.log(`Hydration endpoint ${endpoint} failed:`, e);
    } finally {
      if (api) {
        try { await api.disconnect(); } catch {}
      }
    }
  }

  return { glmr: "N/A", usdc: "N/A", glmrUsd: "N/A" };
}

export async function GET() {
  const balances = await getHydrationBalances();
  return NextResponse.json(balances);
}
