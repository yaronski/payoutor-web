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
    
    // Validate ratio values
    const finalGlmrRatio = glmrRatio ?? 0.5;
    const finalMovrRatio = movrRatio ?? 0.5;
    
    // Validate that ratios sum to 1 (with some tolerance for floating point errors)
    if (Math.abs(finalGlmrRatio + finalMovrRatio - 1.0) > 0.01) {
      return NextResponse.json({ 
        error: 'GLMR and MOVR ratios must sum to 100%' 
      }, { status: 400 });
    }
    
    const config: PayoutConfig = {
      glmrRatio: finalGlmrRatio,
      movrRatio: finalMovrRatio,
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