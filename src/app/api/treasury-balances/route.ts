import { NextResponse } from "next/server";
import { ApiPromise, WsProvider } from "@polkadot/api";

const MOONBEAM_TREASURY = "0x6d6f646c70792f74727372790000000000000000";
const MOONRIVER_TREASURY = "0x6d6f646c70792f74727372790000000000000000";

async function getNativeBalance(address: string, network: "moonbeam" | "moonriver"): Promise<string> {
  const ws = network === "moonbeam" 
    ? "wss://wss.api.moonbeam.network" 
    : "wss://wss.api.moonriver.moonbeam.network";
  
  const wsProvider = new WsProvider(ws);
  const api = await ApiPromise.create({ provider: wsProvider });
  const accountInfo: any = await api.query.system.account(address);
  await api.disconnect();
  
  const raw = accountInfo.data.free.toBigInt();
  return (Number(raw) / 1e18).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function fetchSubscanTokenList(address: string, network: "moonbeam" | "moonriver"): Promise<{usdc: string, glmr: string, movr: string}> {
  try {
    const res = await fetch(`https://${network}.subscan.io/api/scan/account/token_list`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "X-API-Key": process.env.SUBSCAN_API_KEY || ""
      },
      body: JSON.stringify({ address })
    });
    const data = await res.json();
    
    if (data?.data) {
      for (const token of data.data) {
        if (network === "moonbeam") {
          if (token.symbol === "GLMR") {
            return { usdc: "N/A", glmr: parseFloat(token.balance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), movr: "N/A" };
          }
          if (token.contract === "0xffffffff7d2b0b761af01ca8e25242976ac0ad7d" || token.symbol === "USDC" || token.symbol === "xcUSDC") {
            return { usdc: parseFloat(token.balance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), glmr: "N/A", movr: "N/A" };
          }
        }
      }
    }
  } catch (e) {
    console.log("Subscan fetch failed, using RPC:", e);
  }
  return { usdc: "N/A", glmr: "N/A", movr: "N/A" };
}

export async function GET() {
  try {
    const [glmrBalance, movrBalance, usdcData] = await Promise.all([
      getNativeBalance(MOONBEAM_TREASURY, "moonbeam").catch(() => "N/A"),
      getNativeBalance(MOONRIVER_TREASURY, "moonriver").catch(() => "N/A"),
      fetchSubscanTokenList(MOONBEAM_TREASURY, "moonbeam"),
    ]);

    return NextResponse.json({
      glmr: glmrBalance,
      movr: movrBalance,
      usdc: usdcData.usdc,
    });
  } catch (error) {
    console.error("Error fetching treasury balances:", error);
    return NextResponse.json(
      { error: "Failed to fetch treasury balances" },
      { status: 500 }
    );
  }
}
