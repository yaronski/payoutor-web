import { NextRequest, NextResponse } from 'next/server';

// Simple test endpoint
export async function GET(request: NextRequest) {
  console.log('[TEST API] Test endpoint hit');
  return NextResponse.json({ 
    status: 'ok', 
    message: 'Test API is working',
    timestamp: new Date().toISOString() 
  });
}

export async function POST(request: NextRequest) {
  console.log('[TEST API] POST endpoint hit');
  
  // Get body
  let body;
  try {
    body = await request.json();
  } catch (e) {
    console.log('[TEST API] Error parsing body:', e);
  }
  
  console.log('[TEST API] Received body:', body);
  
  return NextResponse.json({ 
    status: 'ok', 
    message: 'POST API is working',
    body: body,
    timestamp: new Date().toISOString() 
  });
}
