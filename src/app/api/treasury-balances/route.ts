import { NextResponse } from "next/server";
import { ApiPromise, WsProvider } from "@polkadot/api";

const MOONBEAM_TREASURY = "0x6d6f646c70792f74727372790000000000000000";
const MOONRIVER_TREASURY = "0x6d6f646c70792f74727372790000000000000000";

async function getNativeBalance(address: string, network: "moonbeam" | "moonriver"): Promise<string> {
  let api: ApiPromise | null = null;
  try {
    const ws = network === "moonbeam" ? "wss://wss.api.moonbeam.network" : "wss://wss.api.moonriver.moonbeam.network";
    const wsProvider = new WsProvider(ws);
    api = await ApiPromise.create({ provider: wsProvider });
    await api.isReady;
    const accountInfo: any = await api.query.system.account(address);
    const raw = accountInfo.data.free.toBigInt();
    return (Number(raw) / 1e18).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } catch (e) {
    console.log(`Error fetching ${network} native:`, e);
    return "N/A";
  } finally {
    if (api) {
      try { await api.disconnect(); } catch {}
    }
  }
}

export async function GET() {
  try {
    const [glmr, movr] = await Promise.all([
      getNativeBalance(MOONBEAM_TREASURY, "moonbeam"),
      getNativeBalance(MOONRIVER_TREASURY, "moonriver")
    ]);

    // Try to fetch USDC from subscan (may fail without API key)
    let usdc = "N/A";
    try {
      const res = await fetch("https://moonbeam.subscan.io/api/scan/account/token_list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: MOONBEAM_TREASURY })
      });
      const data = await res.json();
      if (data?.data) {
        for (const t of data.data) {
          if (t.symbol === "USDC" || t.symbol === "xcUSDC") {
            usdc = parseFloat(t.balance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            break;
          }
        }
      }
    } catch (e) {
      console.log("USDC fetch error:", e);
    }

    return NextResponse.json({ glmr, movr, usdc });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ glmr: "N/A", movr: "N/A", usdc: "N/A" });
  }
}
