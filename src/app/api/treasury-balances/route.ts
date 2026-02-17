import { NextResponse } from "next/server";
import { ApiPromise, WsProvider } from "@polkadot/api";

const MOONBEAM_TREASURY = "0x6d6f646C70792f74727372790000000000000000";
const MOONRIVER_TREASURY = "0x6d6f646C70792f74727372790000000000000000";
const USDC_MOONBEAM = "0xFFfffffF7D2B0B761Af01Ca8e25242976ac0aD7D";

const ERC20_ABI = {
  queryInfo: "0x5c60fa1b" // queryInfo(uint256)
};

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

async function getERC20Balance(tokenAddress: string, accountAddress: string, network: "moonbeam" | "moonriver"): Promise<string> {
  const ws = network === "moonbeam"
    ? "wss://wss.api.moonbeam.network"
    : "wss://wss.api.moonriver.moonbeam.network";
  
  const wsProvider = new WsProvider(ws);
  const api = await ApiPromise.create({ provider: wsProvider });
  
  const balance: any = await api.query.evm.accountStates(tokenAddress, accountAddress);
  await api.disconnect();
  
  const raw = balance.toBigInt();
  return (Number(raw) / 1e6).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export async function GET() {
  try {
    // Fetch all balances in parallel
    const [glmrBalance, movrBalance, usdcBalance] = await Promise.all([
      getNativeBalance(MOONBEAM_TREASURY, "moonbeam").catch(() => "N/A"),
      getNativeBalance(MOONRIVER_TREASURY, "moonriver").catch(() => "N/A"),
      getERC20Balance(USDC_MOONBEAM, MOONBEAM_TREASURY, "moonbeam").catch(() => "N/A"),
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
