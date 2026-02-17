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

async function getXCUSDCBalance(): Promise<string> {
  const wsProvider = new WsProvider("wss://wss.api.moonbeam.network");
  const api = await ApiPromise.create({ provider: wsProvider });
  
  // Convert EVM address to Substrate address
  const u8a = api.createType('AccountId32', MOONBEAM_TREASURY).toU8a();
  
  // Try assets pallet (asset ID 133 = USDC on Moonbeam)
  try {
    const assetAccount: any = await api.query.assets.account(133, u8a);
    if (assetAccount && assetAccount.balance) {
      const raw = assetAccount.balance.toBigInt();
      await api.disconnect();
      return (Number(raw) / 1e6).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  } catch (e) {
    console.log("Assets pallet query failed:", e);
  }
  
  // Try tokens pallet with ForeignAsset
  try {
    const tokenAccount: any = await api.query.tokens.accounts(u8a, { ForeignAsset: 133 });
    if (tokenAccount && tokenAccount.free) {
      const raw = tokenAccount.free.toBigInt();
      await api.disconnect();
      return (Number(raw) / 1e6).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  } catch (e) {
    console.log("Tokens pallet query failed:", e);
  }
  
  // Try EVM account state for ERC-20 balance
  try {
    const erc20Address = "0xFFFFFFFF7D2B0B761AF01CA8E25242976AC0AD7D";
    const evmAddress = "0x6d6f646c70792f74727372790000000000000000";
    const accountState: any = await api.query.evm.accountStates(erc20Address, evmAddress);
    // This returns EVM balance, not ERC-20 balance - won't work
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
      getXCUSDCBalance(),
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
