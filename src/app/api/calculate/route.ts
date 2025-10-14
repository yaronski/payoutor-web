import { NextRequest, NextResponse } from 'next/server';
import { calculatePayout, PayoutConfig } from '../../../payoutor-core';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { usdAmount, recipient, glmrRatio, movrRatio, councilThreshold, councilLengthBound, moonbeamWs, moonriverWs, proxy, proxyAddress } = body;
    // Basic validation
    if (!usdAmount || !recipient) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const config: PayoutConfig = {
      glmrRatio: glmrRatio ?? 0.5,
      movrRatio: movrRatio ?? 0.5,
      councilThreshold: councilThreshold ?? 3,
      councilLengthBound: councilLengthBound ?? 10000,
      moonbeamWs: moonbeamWs ?? 'wss://wss.api.moonbeam.network',
      moonriverWs: moonriverWs ?? 'wss://wss.api.moonriver.moonbeam.network',
    };
    const result = await calculatePayout({ usdAmount, recipient, config, proxy, proxyAddress });
    return NextResponse.json(result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 