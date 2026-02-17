import { NextResponse } from "next/server";

const MOONBEAM_TREASURY = "0x6d6f646c70792f74727372790000000000000000";
const MOONRIVER_TREASURY = "0x6d6f646c70792f74727372790000000000000000";

export async function GET() {
  // Fetch balances from subscan (no API key needed for basic queries)
  const fetchFromSubscan = async (addr: string, net: string, type: 'balance' | 'tokens') => {
    try {
      const endpoint = type === 'balance' 
        ? `https://${net}.subscan.io/api/scan/account`
        : `https://${net}.subscan.io/api/scan/account/token_list`;
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: addr })
      });
      
      if (!res.ok) return null;
      const data = await res.json();
      return data?.data || null;
    } catch (e) {
      console.log(`Subscan ${type} error for ${net}:`, e);
      return null;
    }
  };

  try {
    // Fetch all in parallel
    const [moonbeamData, moonriverData, moonbeamTokens] = await Promise.all([
      fetchFromSubscan(MOONBEAM_TREASURY, "moonbeam", "balance"),
      fetchFromSubscan(MOONRIVER_TREASURY, "moonriver", "balance"),
      fetchFromSubscan(MOONBEAM_TREASURY, "moonbeam", "tokens")
    ]);

    // Parse GLMR
    let glmr = "N/A";
    if (moonbeamData?.balance) {
      glmr = parseFloat(moonbeamData.balance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // Parse MOVR
    let movr = "N/A";
    if (moonriverData?.balance) {
      movr = parseFloat(moonriverData.balance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // Parse USDC from tokens
    let usdc = "N/A";
    if (moonbeamTokens && Array.isArray(moonbeamTokens)) {
      for (const token of moonbeamTokens) {
        const symbol = token.symbol?.toUpperCase() || '';
        if (symbol === 'USDC' || symbol === 'XCUSDC') {
          usdc = parseFloat(token.balance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          break;
        }
      }
    }

    return NextResponse.json({ glmr, movr, usdc });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ glmr: "N/A", movr: "N/A", usdc: "N/A" });
  }
}
