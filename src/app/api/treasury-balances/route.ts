import { NextResponse } from "next/server";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { decodeAddress } from "@polkadot/util-crypto";

const MOONBEAM_TREASURY = "0x6d6f646C70792f74727372790000000000000000";
const MOONRIVER_TREASURY = "0x6d6f646C70792f74727372790000000000000000";
const USDC_ASSET_ID = 133; // USDC on Moonbeam (XC-20)

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

async function getXC20Balance(assetId: number, accountAddress: string, network: "moonbeam" | "moonriver"): Promise<string> {
  const ws = network === "moonbeam"
    ? "wss://wss.api.moonbeam.network"
    : "wss://wss.api.moonriver.moonbeam.network";
  
  const wsProvider = new WsProvider(ws);
  const api = await ApiPromise.create({ provider: wsProvider });
  
  // Convert EVM address to Substrate address
  const substrateAddress = api.createType('AccountId32', decodeAddress(accountAddress)).toString();
  
  try {
    // Try assets pallet first (for XC-20)
    const assetAccount: any = await api.query.assets.account(assetId, substrateAddress);
    if (assetAccount && assetAccount.balance) {
      const raw = assetAccount.balance.toBigInt();
      await api.disconnect();
      // XC-20 USDC has 6 decimals
      return (Number(raw) / 1e6).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  } catch (e) {
    // Try tokens pallet as fallback
    try {
      const tokenAccount: any = await api.query.tokens.accounts(substrateAddress, { Token: network === "moonbeam" ? "USDC" : "MOVR" });
      if (tokenAccount && tokenAccount.free) {
        const raw = tokenAccount.free.toBigInt();
        await api.disconnect();
        return (Number(raw) / 1e6).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
    } catch (e2) {
      console.log("Token query failed:", e2);
    }
  }
  
  await api.disconnect();
  return "N/A";
}

export async function GET() {
  try {
    const [glmrBalance, movrBalance, usdcBalance] = await Promise.all([
      getNativeBalance(MOONBEAM_TREASURY, "moonbeam").catch(() => "N/A"),
      getNativeBalance(MOONRIVER_TREASURY, "moonriver").catch(() => "N/A"),
      getXC20Balance(USDC_ASSET_ID, MOONBEAM_TREASURY, "moonbeam").catch(() => "N/A"),
    ]);

    return NextResponse.json({
      glmr: glmrBalance,
      movr: movrBalance,
      usdc: usdcBalance,
    });
  } catch (error) {
    console.error("Error fetching treasury balances:", error);
    return NextResponse.json(
      { error: "Failed to fetch treasury balances" },
      { status: 500 }
    );
  }
}
