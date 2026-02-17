import { NextResponse } from "next/server";
import { ApiPromise, WsProvider } from "@polkadot/api";

const MOONBEAM_TREASURY = "0x6d6f646c70792f74727372790000000000000000";
const MOONRIVER_TREASURY = "0x6d6f646c70792f74727372790000000000000000";
const XCUSDC_CONTRACT = "0xFFFFFFFF7D2B0B761AF01CA8E25242976AC0AD7D";

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

async function getXCUSDCBalance(network: "moonbeam" | "moonriver"): Promise<string> {
  if (network !== "moonbeam") return "N/A";
  
  const wsProvider = new WsProvider("wss://wss.api.moonbeam.network");
  const api = await ApiPromise.create({ provider: wsProvider });
  
  try {
    // Try querying the assets pallet for USDC (asset ID 133)
    const assetAccount: any = await api.query.assets.account(133, MOONBEAM_TREASURY);
    if (assetAccount && assetAccount.balance) {
      const raw = assetAccount.balance.toBigInt();
      await api.disconnect();
      return (Number(raw) / 1e6).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  } catch (e) {
    console.log("Assets pallet query failed:", e);
  }
  
  // Try querying EVM state for ERC-20 balance
  try {
    // Get code hash first to check if contract exists
    const codeHash: any = await api.query.evm.accountCodes(XCUSDC_CONTRACT);
    if (codeHash.toHex() === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      await api.disconnect();
      return "0.00";
    }
    
    // For ERC-20, we need to call balanceOf - this requires a different approach
    // Let's try querying the account state
    const accountState: any = await api.query.evm.accountStates(XCUSDC_CONTRACT, MOONBEAM_TREASURY);
    await api.disconnect();
    
    // EVM account state has balance in native token terms - not the ERC-20 balance
    // Return N/A since we can't easily query ERC-20 from RPC without a contract call
    return "N/A";
  } catch (e) {
    console.log("EVM query failed:", e);
  }
  
  await api.disconnect();
  return "N/A";
}

export async function GET() {
  try {
    const [glmrBalance, movrBalance, usdcBalance] = await Promise.all([
      getNativeBalance(MOONBEAM_TREASURY, "moonbeam").catch(() => "N/A"),
      getNativeBalance(MOONRIVER_TREASURY, "moonriver").catch(() => "N/A"),
      getXCUSDCBalance("moonbeam"),
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
