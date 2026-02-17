import { NextResponse } from "next/server";

const MOONBEAM_TREASURY = "0x6d6f646c70792f74727372790000000000000000";
const MOONRIVER_TREASURY = "0x6d6f646c70792f74727372790000000000000000";

async function fetchSubscanBalance(address: string, network: "moonbeam" | "moonriver"): Promise<string> {
  const res = await fetch(`https://${network}.subscan.io/api/scan/account`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address })
  });
  const data = await res.json();
  if (data?.data?.balance) {
    return parseFloat(data.data.balance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return "N/A";
}

async function fetchSubscanTokenList(address: string, network: "moonbeam" | "moonriver"): Promise<{usdc: string, glmr: string, movr: string}> {
  const res = await fetch(`https://${network}.subscan.io/api/scan/account/token_list`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address })
  });
  const data = await res.json();
  
  let usdcBalance = "N/A";
  let glmrBalance = "N/A";
  let movrBalance = "N/A";
  
  if (data?.data) {
    for (const token of data.data) {
      if (network === "moonbeam") {
        if (token.symbol === "GLMR") {
          glmrBalance = parseFloat(token.balance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        if (token.contract === "0xffffffff7d2b0b761af01ca8e25242976ac0ad7d" || token.symbol === "USDC" || token.symbol === "xcUSDC") {
          usdcBalance = parseFloat(token.balance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
      }
      if (network === "moonriver") {
        if (token.symbol === "MOVR") {
          movrBalance = parseFloat(token.balance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
      }
    }
  }
  
  return { usdc: usdcBalance, glmr: glmrBalance, movr: movrBalance };
}

export async function GET() {
  try {
    const [moonbeamTokens, moonriverBal] = await Promise.all([
      fetchSubscanTokenList(MOONBEAM_TREASURY, "moonbeam"),
      fetchSubscanBalance(MOONRIVER_TREASURY, "moonriver").catch(() => "N/A"),
    ]);

    return NextResponse.json({
      glmr: moonbeamTokens.glmr,
      movr: moonriverBal,
      usdc: moonbeamTokens.usdc,
    });
  } catch (error) {
    console.error("Error fetching treasury balances:", error);
    return NextResponse.json(
      { error: "Failed to fetch treasury balances" },
      { status: 500 }
    );
  }
}
