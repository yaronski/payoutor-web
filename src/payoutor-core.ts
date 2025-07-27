// payoutor-core.ts
// Core logic for payout calculation and council proposal generation

import { ApiPromise, WsProvider } from '@polkadot/api';

export interface PayoutConfig {
  glmrRatio: number;
  movrRatio: number;
  councilThreshold: number;
  councilLengthBound: number;
  moonbeamWs: string;
  moonriverWs: string;
}

export interface PayoutInput {
  usdAmount: number;
  recipient: string;
  config: PayoutConfig;
  proxy?: boolean;
  proxyAddress?: string;
}

export interface PayoutResult {
  glmrAmount: number;
  movrAmount: number;
  glmrCallData: any;
  movrCallData: any;
}

export interface PayoutDetails {
  summary: string;
  usdAmount: number;
  glmrUsd: number;
  movrUsd: number;
  glmrPrice: number;
  movrPrice: number;
  glmrAmount: number;
  movrAmount: number;
  moonbeamBlock: number;
  moonriverBlock: number;
  glmrCallData: any;
  movrCallData: any;
  glmrProxyCallData?: any;
  movrProxyCallData?: any;
  recipient: string;
  proxy?: boolean;
  proxyAddress?: string;
}

// Helper: fetch recent block number and adjust by -200 for price stability
async function fetchRecentBlock(network: 'moonbeam' | 'moonriver'): Promise<number> {
  const res = await fetch(`https://${network}.subscan.io/block`);
  const html = await res.text();
  const match = html.match(/block\/(\d+)/);
  if (!match) throw new Error(`Could not fetch block number for ${network}`);
  return parseInt(match[1], 10) - 200;
}

// Helper: fetch 30d EMA price from Subscan price_converter tool
async function fetchEma30Price(network: 'moonbeam' | 'moonriver', token: 'GLMR' | 'MOVR', block: number): Promise<number> {
  const url = `https://${network}.subscan.io/tools/price_converter?value=1&type=block&from=${token}&to=USD&time=${block}`;
  const res = await fetch(url);
  const text = await res.text();
  const match = text.match(/"ema30_average":"([0-9.]+)"/);
  if (!match) throw new Error(`Could not fetch EMA30 price for ${token} at block ${block}`);
  return parseFloat(match[1]);
}

// Fetch real token price using Subscan (30d EMA at recent block)
async function fetchTokenPrice(token: 'GLMR' | 'MOVR'): Promise<number> {
  const network = token === 'GLMR' ? 'moonbeam' : 'moonriver';
  const block = await fetchRecentBlock(network);
  return fetchEma30Price(network, token, block);
}

// Calculate payout split
export async function calculatePayout(input: PayoutInput): Promise<PayoutDetails> {
  // Fetch block numbers
  const moonbeamBlock = await fetchRecentBlock('moonbeam');
  const moonriverBlock = await fetchRecentBlock('moonriver');
  // Fetch prices
  const glmrPrice = await fetchEma30Price('moonbeam', 'GLMR', moonbeamBlock);
  const movrPrice = await fetchEma30Price('moonriver', 'MOVR', moonriverBlock);
  // USD splits
  const glmrUsd = input.usdAmount * input.config.glmrRatio;
  const movrUsd = input.usdAmount * input.config.movrRatio;
  // Token amounts
  const glmrAmount = glmrUsd / glmrPrice;
  const movrAmount = movrUsd / movrPrice;
  // Call data
  const glmrCallData = await generateCouncilProposal(
    input.recipient,
    glmrAmount,
    input.config.councilThreshold,
    input.config.councilLengthBound,
    input.config.moonbeamWs
  );
  const movrCallData = await generateCouncilProposal(
    input.recipient,
    movrAmount,
    input.config.councilThreshold,
    input.config.councilLengthBound,
    input.config.moonriverWs
  );
  let glmrProxyCallData = undefined;
  let movrProxyCallData = undefined;
  let proxySummary = '';
  if (input.proxy && input.proxyAddress) {
    glmrProxyCallData = await generateCouncilProposal(
      input.recipient,
      glmrAmount,
      input.config.councilThreshold,
      input.config.councilLengthBound,
      input.config.moonbeamWs
    );
    movrProxyCallData = await generateCouncilProposal(
      input.recipient,
      movrAmount,
      input.config.councilThreshold,
      input.config.councilLengthBound,
      input.config.moonriverWs
    );
    proxySummary = `\nMoonbeam Proxy Council Proposal\n============================\n- Proxy Address: ${input.proxyAddress}\n- Amount: ${glmrAmount.toFixed(4)} GLMR (${BigInt(Math.floor(glmrAmount * 1e18)).toString()} Planck)\n- Recipient: ${input.recipient}\n- Proxy Council Proposal Call Data: ${glmrProxyCallData.councilCallHex}\n- Proxy Decode Link: https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fwss.api.moonbeam.network#/extrinsics/decode/${glmrProxyCallData.councilCallHex}\n\nMoonriver Proxy Council Proposal\n===============================\n- Proxy Address: ${input.proxyAddress}\n- Amount: ${movrAmount.toFixed(4)} MOVR (${BigInt(Math.floor(movrAmount * 1e18)).toString()} Planck)\n- Recipient: ${input.recipient}\n- Proxy Council Proposal Call Data: ${movrProxyCallData.councilCallHex}\n- Proxy Decode Link: https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fwss.api.moonriver.moonbeam.network#/extrinsics/decode/${movrProxyCallData.councilCallHex}\n`;
  }
  // Format summary string
  const summary = `==================================\n=== PAYOUT CALCULATION RESULTS ===\n==================================\n\nUSD Amount: ${input.usdAmount.toFixed(2)}\nGLMR Allocation: ${glmrUsd.toFixed(2)} USD\nMOVR Allocation: ${movrUsd.toFixed(2)} USD\nGLMR EMA30 Price: ${glmrPrice.toFixed(4)} USD\nMOVR EMA30 Price: ${movrPrice.toFixed(4)} USD\nGLMR Amount: ${glmrAmount.toFixed(4)}\nMOVR Amount: ${movrAmount.toFixed(4)}\nMoonbeam Block: ${moonbeamBlock}\nMoonriver Block: ${moonriverBlock}\n\n\nMoonbeam\n========\n- GLMR EMA30 price block: ${moonbeamBlock}\n- https://moonbeam.subscan.io/tools/price_converter?value=1&type=block&from=GLMR&to=USD&time=${moonbeamBlock}\n- ${Math.round(input.config.glmrRatio * 100)}% share in GLMR: ${glmrAmount.toFixed(4)}\n- https://moonbeam.subscan.io/tools/price_converter?value=${glmrAmount.toFixed(4)}&type=block&from=GLMR&to=USD&time=${moonbeamBlock}\n\nMoonriver\n=========\n- MOVR EMA30 price block: ${moonriverBlock}\n- https://moonriver.subscan.io/tools/price_converter?value=1&type=block&from=MOVR&to=USD&time=${moonriverBlock}\n- ${Math.round(input.config.movrRatio * 100)}% share in MOVR: ${movrAmount.toFixed(4)}\n- https://moonriver.subscan.io/tools/price_converter?value=${movrAmount.toFixed(4)}&type=block&from=MOVR&to=USD&time=${moonriverBlock}\n\n==================================\n=== COUNCIL PROPOSAL CALL DATA ===\n==================================\n\nMoonbeam Council Proposal\n=========================\n- Amount: ${glmrAmount.toFixed(4)} GLMR (${BigInt(Math.floor(glmrAmount * 1e18)).toString()} Planck)\n- Recipient: ${input.recipient}\n- Council Proposal Call Data: ${glmrCallData.councilCallHex}\n- Decode Link: https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fwss.api.moonbeam.network#/extrinsics/decode/${glmrCallData.councilCallHex}\n\nMoonriver Council Proposal\n==========================\n- Amount: ${movrAmount.toFixed(4)} MOVR (${BigInt(Math.floor(movrAmount * 1e18)).toString()} Planck)\n- Recipient: ${input.recipient}\n- Council Proposal Call Data: ${movrCallData.councilCallHex}\n- Decode Link: https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fwss.api.moonriver.moonbeam.network#/extrinsics/decode/${movrCallData.councilCallHex}\n${proxySummary}\n==================================`;
  return {
    summary,
    usdAmount: input.usdAmount,
    glmrUsd,
    movrUsd,
    glmrPrice,
    movrPrice,
    glmrAmount,
    movrAmount,
    moonbeamBlock,
    moonriverBlock,
    glmrCallData,
    movrCallData,
    glmrProxyCallData,
    movrProxyCallData,
    recipient: input.recipient,
    proxy: input.proxy,
    proxyAddress: input.proxyAddress,
  };
}

// Generate council proposal call data (adapted from generate-council-proposal.js)
export async function generateCouncilProposal(
  recipient: string,
  amount: number,
  threshold: number,
  lengthBound: number,
  wsEndpoint: string
) {
  const wsProvider = new WsProvider(wsEndpoint);
  const api = await ApiPromise.create({ provider: wsProvider });
  await api.isReady;
  // Convert amount to planck (assume 18 decimals for GLMR/MOVR)
  const amountPlanck = BigInt(Math.floor(amount * 1e18)).toString();
  const treasuryCall = api.tx.treasury.spend({ Native: null }, amountPlanck, recipient, null);
  const councilCall = api.tx.treasuryCouncilCollective.propose(threshold, treasuryCall, lengthBound);
  const result = {
    treasuryCallHex: treasuryCall.method.toHex(),
    treasuryCallHash: treasuryCall.method.hash.toHex(),
    councilCallHex: councilCall.method.toHex(),
    councilCallHash: councilCall.method.hash.toHex(),
  };
  await api.disconnect();
  return result;
} 