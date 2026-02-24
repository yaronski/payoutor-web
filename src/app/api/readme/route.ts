import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { moonbeamRow, moonriverRow, payoutType } = body;
    
    // Fetch the current README from GitHub
    const readmeUrl = 'https://raw.githubusercontent.com/moonbeam-foundation/treasury/main/README.md';
    
    const res = await fetch(readmeUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Payoutor/1.0)',
      },
    });
    
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch README from GitHub' }, { status: 500 });
    }
    
    let readme = await res.text();
    
    if (payoutType === 'usdc') {
      // For USDC, only add to Moonbeam section
      // Find the Moonbeam table header and add the row after it
      const moonbeamSectionMatch = readme.match(/(## Moonbeam[\s\S]*?\|.*\|.*\|.*\|.*\|.*\|.*\|.*\|)/);
      if (moonbeamSectionMatch) {
        const insertPoint = moonbeamSectionMatch.index! + moonbeamSectionMatch[0].length;
        readme = readme.slice(0, insertPoint) + '\n' + moonbeamRow + readme.slice(insertPoint);
      }
    } else {
      // For native payouts, add to both sections
      // Find Moonbeam section and add row
      const moonbeamSectionMatch = readme.match(/(## Moonbeam[\s\S]*?\|.*\|.*\|.*\|.*\|.*\|.*\|.*\|)/);
      if (moonbeamSectionMatch) {
        const insertPoint = moonbeamSectionMatch.index! + moonbeamSectionMatch[0].length;
        readme = readme.slice(0, insertPoint) + '\n' + moonbeamRow + readme.slice(insertPoint);
      }
      
      // Find Moonriver section and add row
      const moonriverSectionMatch = readme.match(/(## Moonriver[\s\S]*?\|.*\|.*\|.*\|.*\|.*\|.*\|.*\|)/);
      if (moonriverSectionMatch) {
        const insertPoint = moonriverSectionMatch.index! + moonriverSectionMatch[0].length;
        readme = readme.slice(0, insertPoint) + '\n' + moonriverRow + readme.slice(insertPoint);
      }
    }
    
    return NextResponse.json({ readme });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
