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
  inputAmount?: number;
  inputCurrency?: string;
  fxRate?: number;
  fxDate?: string | null;
}

export interface PayoutResult {
  glmrAmount: number;
  movrAmount: number;
  glmrCallData: {
    treasuryCallHex: string;
    treasuryCallHash: string;
    councilCallHex: string;
    councilCallHash: string;
  };
  movrCallData: {
    treasuryCallHex: string;
    treasuryCallHash: string;
    councilCallHex: string;
    councilCallHash: string;
  };
}

export interface PayoutDetails {
  summary: string;
  forumReply: string;
  usdAmount: number;
  inputAmount?: number;
  inputCurrency?: string;
  fxRate?: number;
  fxSource?: string;
  fxDate?: string;
  glmrUsd: number;
  movrUsd: number;
  glmrPrice: number;
  movrPrice: number;
  glmrAmount: number;
  movrAmount: number;
  moonbeamBlock: number;
  moonriverBlock: number;
  moonbeamProposalIndex: number;
  moonriverProposalIndex: number;
  moonbeamSpendIndex: number;
  moonriverSpendIndex: number;
  glmrCallData: {
    treasuryCallHex: string;
    treasuryCallHash: string;
    councilCallHex: string;
    councilCallHash: string;
  };
  movrCallData: {
    treasuryCallHex: string;
    treasuryCallHash: string;
    councilCallHex: string;
    councilCallHash: string;
  };
  glmrVoteCallData: {
    voteCallHex: string;
  };
  movrVoteCallData: {
    voteCallHex: string;
  };
  glmrCloseCallData: {
    closeCallHex: string;
  };
  movrCloseCallData: {
    closeCallHex: string;
  };
  glmrPayoutCallData: {
    payoutCallHex: string;
  };
  movrPayoutCallData: {
    payoutCallHex: string;
  };
  glmrProxyCallData?: {
    treasuryCallHex: string;
    treasuryCallHash: string;
    councilCallHex: string;
    councilCallHash: string;
  };
  movrProxyCallData?: {
    treasuryCallHex: string;
    treasuryCallHash: string;
    councilCallHex: string;
    councilCallHash: string;
  };
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

// Helper: fetch current council proposal count
async function fetchProposalCount(network: 'moonbeam' | 'moonriver'): Promise<number> {
  const wsProvider = new WsProvider(network === 'moonbeam' ? 'wss://wss.api.moonbeam.network' : 'wss://wss.api.moonriver.moonbeam.network');
  const api = await ApiPromise.create({ provider: wsProvider });
  await api.isReady;
  const proposalCount = await api.query.treasuryCouncilCollective.proposalCount();
  await api.disconnect();
  return Number(proposalCount);
}

// Helper: fetch current treasury spend count
async function fetchSpendCount(network: 'moonbeam' | 'moonriver'): Promise<number> {
  const wsProvider = new WsProvider(network === 'moonbeam' ? 'wss://wss.api.moonbeam.network' : 'wss://wss.api.moonriver.moonbeam.network');
  const api = await ApiPromise.create({ provider: wsProvider });
  await api.isReady;
  const spendCount = await api.query.treasury.spendCount();
  await api.disconnect();
  return Number(spendCount);
}



// Calculate payout split
export async function calculatePayout(input: PayoutInput): Promise<PayoutDetails> {
  // Fetch block numbers
  const moonbeamBlock = await fetchRecentBlock('moonbeam');
  const moonriverBlock = await fetchRecentBlock('moonriver');
  // Fetch prices
  const glmrPrice = await fetchEma30Price('moonbeam', 'GLMR', moonbeamBlock);
  const movrPrice = await fetchEma30Price('moonriver', 'MOVR', moonriverBlock);
  // Fetch current proposal counts (next index = count)
  const moonbeamProposalIndex = await fetchProposalCount('moonbeam');
  const moonriverProposalIndex = await fetchProposalCount('moonriver');
  // Fetch current spend counts (next spend index = count)
  const moonbeamSpendIndex = await fetchSpendCount('moonbeam');
  const moonriverSpendIndex = await fetchSpendCount('moonriver');
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
  // Vote call data for voting AYE on the proposals
  const glmrVoteCallData = await generateVoteCall(moonbeamProposalIndex, input.config.moonbeamWs);
  const movrVoteCallData = await generateVoteCall(moonriverProposalIndex, input.config.moonriverWs);
  
  // Close call data for closing proposals after voting
  const glmrCloseCallData = await generateCloseCall(moonbeamProposalIndex, input.config.moonbeamWs);
  const movrCloseCallData = await generateCloseCall(moonriverProposalIndex, input.config.moonriverWs);
  
  // Payout call data for claiming treasury funds (uses spend index, not proposal index)
  const glmrPayoutCallData = await generatePayoutCall(moonbeamSpendIndex, input.config.moonbeamWs);
  const movrPayoutCallData = await generatePayoutCall(moonriverSpendIndex, input.config.moonriverWs);
  
  let glmrProxyCallData = undefined;
  let movrProxyCallData = undefined;
  let proxySummary = '';
  if (input.proxy && input.proxyAddress) {
    glmrProxyCallData = await generateCouncilProposal(
      input.recipient,
      glmrAmount,
      input.config.councilThreshold,
      input.config.councilLengthBound,
      input.config.moonbeamWs,
      input.proxyAddress
    );
    movrProxyCallData = await generateCouncilProposal(
      input.recipient,
      movrAmount,
      input.config.councilThreshold,
      input.config.councilLengthBound,
      input.config.moonriverWs,
      input.proxyAddress
    );
    proxySummary = `\nMoonbeam Proxy Council Proposal\n============================\n- Proxy Address: ${input.proxyAddress}\n- Amount: ${glmrAmount.toFixed(4)} GLMR (${BigInt(Math.floor(glmrAmount * 1e18)).toString()} Planck)\n- Recipient: ${input.recipient}\n- Proxy Council Proposal Call Data: ${glmrProxyCallData.councilCallHex}\n- Proxy Decode Link: https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fwss.api.moonbeam.network#/extrinsics/decode/${glmrProxyCallData.councilCallHex}\n\nMoonriver Proxy Council Proposal\n===============================\n- Proxy Address: ${input.proxyAddress}\n- Amount: ${movrAmount.toFixed(4)} MOVR (${BigInt(Math.floor(movrAmount * 1e18)).toString()} Planck)\n- Recipient: ${input.recipient}\n- Proxy Council Proposal Call Data: ${movrProxyCallData.councilCallHex}\n- Proxy Decode Link: https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fwss.api.moonriver.moonbeam.network#/extrinsics/decode/${movrProxyCallData.councilCallHex}\n`;
  }
  // Format summary string
  const summary = `==================================\n=== PAYOUT CALCULATION RESULTS ===\n==================================\n\nUSD Amount: ${input.usdAmount.toFixed(2)}\nGLMR Allocation: ${glmrUsd.toFixed(2)} USD\nMOVR Allocation: ${movrUsd.toFixed(2)} USD\nGLMR EMA30 Price: ${glmrPrice.toFixed(4)} USD\nMOVR EMA30 Price: ${movrPrice.toFixed(4)} USD\nGLMR Amount: ${glmrAmount.toFixed(4)}\nMOVR Amount: ${movrAmount.toFixed(4)}\nMoonbeam Block: ${moonbeamBlock}\nMoonriver Block: ${moonriverBlock}\n\n\nMoonbeam\n========\n- GLMR EMA30 price block: ${moonbeamBlock}\n- https://moonbeam.subscan.io/tools/price_converter?value=1&type=block&from=GLMR&to=USD&time=${moonbeamBlock}\n- ${Math.round(input.config.glmrRatio * 100)}% share in GLMR: ${glmrAmount.toFixed(4)}\n- https://moonbeam.subscan.io/tools/price_converter?value=${glmrAmount.toFixed(4)}&type=block&from=GLMR&to=USD&time=${moonbeamBlock}\n\nMoonriver\n=========\n- MOVR EMA30 price block: ${moonriverBlock}\n- https://moonriver.subscan.io/tools/price_converter?value=1&type=block&from=MOVR&to=USD&time=${moonriverBlock}\n- ${Math.round(input.config.movrRatio * 100)}% share in MOVR: ${movrAmount.toFixed(4)}\n- https://moonriver.subscan.io/tools/price_converter?value=${movrAmount.toFixed(4)}&type=block&from=MOVR&to=USD&time=${moonriverBlock}\n\n==================================\n=== COUNCIL PROPOSAL CALL DATA ===\n==================================\n\nMoonbeam Council Proposal\n=========================\n- Amount: ${glmrAmount.toFixed(4)} GLMR (${BigInt(Math.floor(glmrAmount * 1e18)).toString()} Planck)\n- Recipient: ${input.recipient}\n- Council Proposal Call Data: ${glmrCallData.councilCallHex}\n- Decode Link: https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fwss.api.moonbeam.network#/extrinsics/decode/${glmrCallData.councilCallHex}\n\nMoonriver Council Proposal\n==========================\n- Amount: ${movrAmount.toFixed(4)} MOVR (${BigInt(Math.floor(movrAmount * 1e18)).toString()} Planck)\n- Recipient: ${input.recipient}\n- Council Proposal Call Data: ${movrCallData.councilCallHex}\n- Decode Link: https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fwss.api.moonriver.moonbeam.network#/extrinsics/decode/${movrCallData.councilCallHex}\n${proxySummary}\n==================================`;
  const glmrRatioPct = Math.round(input.config.glmrRatio * 100);
  const movrRatioPct = Math.round(input.config.movrRatio * 100);

  const placeholderHash = '0x0000000000000000000000000000000000000000000000000000000000000000';
  const glmrVoteUrl = `https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fwss.api.moonbeam.network#/extrinsics/decode/${glmrVoteCallData.voteCallHex}`;
  const movrVoteUrl = `https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fwss.api.moonriver.moonbeam.network#/extrinsics/decode/${movrVoteCallData.voteCallHex}`;

  const inputCurrency = input.inputCurrency || 'USD';
  const displayInputAmount = input.inputAmount || input.usdAmount;
  const displayFxRate = input.fxRate || 1;
  
  const formatNumber = (num: number, decimals: number = 2) => {
    return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };
  
  const formatTokenAmount = (num: number) => {
    return num.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  };
  
  let fxLine = '';
  if (inputCurrency === 'EUR' && input.fxRate) {
    fxLine = `Your payout is a grand total of EUR ${formatNumber(displayInputAmount)} which was converted to USD ${formatNumber(input.usdAmount)} at an exchange rate of ${input.fxRate.toFixed(4)} EUR/USD as of today (source: [Frankfurter](https://www.frankfurter.app/docs/) ${input.fxDate ? `- ${input.fxDate}` : ''}).`;
  } else {
    fxLine = `Your payout is a grand total of USD ${formatNumber(input.usdAmount)}.`;
  }

  const glmrPriceLink = `https://moonbeam.subscan.io/tools/price_converter?value=1&type=block&from=GLMR&to=USD&time=${moonbeamBlock}`;
  const movrPriceLink = `https://moonriver.subscan.io/tools/price_converter?value=1&type=block&from=MOVR&to=USD&time=${moonriverBlock}`;
  
  const forumReply = `Hey @${input.recipient.slice(0, 6)}...${input.recipient.slice(-4)}

${fxLine}

That USD total was divided between GLMR and MOVR tokens in a ${glmrRatioPct}:${movrRatioPct} ratio.
We've captured 30d EMA prices at [$${glmrPrice.toFixed(4)}](${glmrPriceLink}) for GLMR at block ${moonbeamBlock} and [$${movrPrice.toFixed(4)}](${movrPriceLink}) for MOVR at block ${moonriverBlock}. This will result in a payout of ${formatTokenAmount(glmrAmount)} GLMR and ${formatTokenAmount(movrAmount)} MOVR.

Both proposals were put on-chain moments ago and are currently awaiting additional votes of members of the Treasury Council. Expect their confirmations and payouts to hit your wallets *very* soon.

Thank you for your contributions to the Moonbeam ecosystem — Much appreciated!
yaron`;

  return {
    summary,
    forumReply,
    usdAmount: input.usdAmount,
    inputAmount: input.inputAmount,
    inputCurrency: input.inputCurrency,
    fxRate: input.fxRate,
    glmrUsd,
    movrUsd,
    glmrPrice,
    movrPrice,
    glmrAmount,
    movrAmount,
    moonbeamBlock,
    moonriverBlock,
    moonbeamProposalIndex,
    moonriverProposalIndex,
    moonbeamSpendIndex,
    moonriverSpendIndex,
    glmrCallData,
    movrCallData,
    glmrVoteCallData,
    movrVoteCallData,
    glmrCloseCallData,
    movrCloseCallData,
    glmrPayoutCallData,
    movrPayoutCallData,
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
  wsEndpoint: string,
  proxyAddress?: string
) {
  const wsProvider = new WsProvider(wsEndpoint);
  const api = await ApiPromise.create({ provider: wsProvider });
  await api.isReady;
  // Convert amount to planck (assume 18 decimals for GLMR/MOVR)
  const amountPlanck = BigInt(Math.floor(amount * 1e18)).toString();
  const treasuryCall = api.tx.treasury.spend({ Native: null }, amountPlanck, recipient, null);
  const councilCall = api.tx.treasuryCouncilCollective.propose(threshold, treasuryCall, lengthBound);
  
  let finalCall = councilCall;
  if (proxyAddress) {
    // Wrap the council call in a proxy.proxy call
    finalCall = api.tx.proxy.proxy(proxyAddress, null, councilCall);
  }
  
  const result = {
    treasuryCallHex: treasuryCall.method.toHex(),
    treasuryCallHash: treasuryCall.method.hash.toHex(),
    councilCallHex: finalCall.method.toHex(),
    councilCallHash: finalCall.method.hash.toHex(),
  };
  await api.disconnect();
  return result;
}

// Generate vote extrinsic call data (for voting AYE on a council proposal)
export async function generateVoteCall(
  proposalIndex: number,
  wsEndpoint: string
) {
  const wsProvider = new WsProvider(wsEndpoint);
  const api = await ApiPromise.create({ provider: wsProvider });
  await api.isReady;
  
  const placeholderHash = '0x0000000000000000000000000000000000000000000000000000000000000000';
  const voteCall = api.tx.treasuryCouncilCollective.vote(placeholderHash, proposalIndex, true);
  
  const result = {
    voteCallHex: voteCall.method.toHex(),
  };
  await api.disconnect();
  return result;
}

// Generate close extrinsic call data (for closing a council proposal after voting)
export async function generateCloseCall(
  proposalIndex: number,
  wsEndpoint: string
) {
  const wsProvider = new WsProvider(wsEndpoint);
  const api = await ApiPromise.create({ provider: wsProvider });
  await api.isReady;
  
  const placeholderHash = '0x0000000000000000000000000000000000000000000000000000000000000000';
  const refTime = 5000000000;
  const proofSize = 100000;
  const lengthBound = 10000;
  
  const closeCall = api.tx.treasuryCouncilCollective.close(
    placeholderHash,
    proposalIndex,
    { refTime, proofSize },
    lengthBound
  );
  
  const result = {
    closeCallHex: closeCall.method.toHex(),
  };
  await api.disconnect();
  return result;
}

// Generate payout extrinsic call data (for claiming treasury funds)
export async function generatePayoutCall(
  spendIndex: number,
  wsEndpoint: string
) {
  const wsProvider = new WsProvider(wsEndpoint);
  const api = await ApiPromise.create({ provider: wsProvider });
  await api.isReady;
  
  const payoutCall = api.tx.treasury.payout(spendIndex);
  
  const result = {
    payoutCallHex: payoutCall.method.toHex(),
  };
  await api.disconnect();
  return result;
}

// USDC on Moonbeam
const USDC_MOONBEAM = '0xFFfffffF7D2B0B761Af01Ca8e25242976ac0aD7D';

export interface UsdcPayoutInput {
  usdAmount: number;
  recipient: string;
  config: {
    councilThreshold: number;
    councilLengthBound: number;
    moonbeamWs: string;
  };
  proxy?: boolean;
  proxyAddress?: string;
}

export interface UsdcPayoutDetails {
  summary: string;
  forumReply: string;
  usdAmount: number;
  usdcAmount: number;
  moonbeamBlock: number;
  moonbeamProposalIndex: number;
  moonbeamSpendIndex: number;
  usdcCallData: {
    treasuryCallHex: string;
    treasuryCallHash: string;
    councilCallHex: string;
    councilCallHash: string;
  };
  usdcVoteCallData: {
    voteCallHex: string;
  };
  usdcCloseCallData: {
    closeCallHex: string;
  };
  usdcPayoutCallData: {
    payoutCallHex: string;
  };
  proxy?: boolean;
  proxyAddress?: string;
  recipient: string;
}

// Generate USDC transfer call data via treasury
// Uses treasury.spend for multi-asset treasury payouts on Moonbeam
async function generateUsdcProposal(
  recipient: string,
  usdcAmount: number,
  threshold: number,
  lengthBound: number,
  wsEndpoint: string,
  proxyAddress?: string
) {
  const wsProvider = new WsProvider(wsEndpoint);
  const api = await ApiPromise.create({ provider: wsProvider });
  await api.isReady;
  
  // USDC has 6 decimals
  const amountRaw = BigInt(Math.floor(usdcAmount * 1e6));
  
  // xcUSDC asset ID: 166377000701797186346254371275954761085
  const assetId = BigInt('166377000701797186346254371275954761085');
  
  // Build asset_kind using WithId variant
  // The asset_kind is an enum: { Native: Null } | { WithId: u128 }
  const assetKind = { WithId: assetId };
  
  // Use treasury.spend with 4 params: assetKind, amount, beneficiary, validFrom
  const treasuryCall = api.tx.treasury.spend(
    assetKind,
    amountRaw,
    recipient,
    null  // validFrom - null for immediate validity
  );
  
  const councilCall = api.tx.treasuryCouncilCollective.propose(threshold, treasuryCall, lengthBound);
  
  let finalCall = councilCall;
  if (proxyAddress) {
    finalCall = api.tx.proxy.proxy(proxyAddress, null, councilCall);
  }
  
  const result = {
    treasuryCallHex: treasuryCall.method.toHex(),
    treasuryCallHash: treasuryCall.method.hash.toHex(),
    councilCallHex: finalCall.method.toHex(),
    councilCallHash: finalCall.method.hash.toHex(),
  };
  await api.disconnect();
  return result;
}

// Calculate USDC payout
export async function calculateUsdcPayout(input: UsdcPayoutInput): Promise<UsdcPayoutDetails> {
  const moonbeamBlock = await fetchRecentBlock('moonbeam');
  const moonbeamProposalIndex = await fetchProposalCount('moonbeam');
  const moonbeamSpendIndex = await fetchSpendCount('moonbeam');
  
  const usdcAmount = input.usdAmount; // USDC is 1:1 with USD
  
  const usdcCallData = await generateUsdcProposal(
    input.recipient,
    usdcAmount,
    input.config.councilThreshold,
    input.config.councilLengthBound,
    input.config.moonbeamWs,
    input.proxyAddress
  );
  
  const usdcVoteCallData = await generateVoteCall(moonbeamProposalIndex, input.config.moonbeamWs);
  
  const usdcCloseCallData = await generateCloseCall(moonbeamProposalIndex, input.config.moonbeamWs);
  
  const usdcPayoutCallData = await generatePayoutCall(moonbeamSpendIndex, input.config.moonbeamWs);
  
  const placeholderHash = '0x0000000000000000000000000000000000000000000000000000000000000000';
  const usdcVoteUrl = `https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fwss.api.moonbeam.network#/extrinsics/decode/${usdcVoteCallData.voteCallHex}`;
  
  const summary = `==================================
=== USDC PAYOUT CALCULATION RESULTS ===
=================================

USD Amount: ${input.usdAmount.toFixed(2)}
USDC Amount: ${usdcAmount.toFixed(2)}
Moonbeam Block: ${moonbeamBlock}

Moonbeam USDC Treasury Proposal
================================
- Amount: ${usdcAmount.toFixed(2)} USDC
- Recipient: ${input.recipient}
- Council Proposal Call Data: ${usdcCallData.councilCallHex}
- Decode Link: https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fwss.api.moonbeam.network#/extrinsics/decode/${usdcCallData.councilCallHex}

Vote: index=${moonbeamProposalIndex} → ${usdcVoteUrl}
NOTE: Replace placeholder hash in Polkadot.js after submission
`;
  
  const forumReply = `Hey @${input.recipient.slice(0, 6)}...${input.recipient.slice(-4)}

Your payout of USD ${input.usdAmount.toFixed(2)} will be sent as ${usdcAmount.toFixed(2)} USDC to your address on Moonbeam.

The proposal has been submitted on-chain and is awaiting approval from 3 Treasury Council members. This is expected to happen very soon.

Thank you for your contributions to the Moonbeam ecosystem — Much appreciated!
yaron`;
  
  return {
    summary,
    forumReply,
    usdAmount: input.usdAmount,
    usdcAmount,
    moonbeamBlock,
    moonbeamProposalIndex,
    moonbeamSpendIndex,
    usdcCallData,
    usdcVoteCallData,
    usdcCloseCallData,
    usdcPayoutCallData,
    proxy: input.proxy,
    proxyAddress: input.proxyAddress,
    recipient: input.recipient,
  };
} 