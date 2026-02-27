import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { moonbeamRow, moonriverRow, payoutType } = body;
    
    const readmeUrl = 'https://raw.githubusercontent.com/moonbeam-foundation/treasury/main/README.md';
    
    const res = await fetch(readmeUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Payoutor/1.0)',
      },
      cache: 'no-store',
    });
    
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch README from GitHub' }, { status: 500 });
    }
    
    let readme = await res.text();
    const lines = readme.split('\n');
    
    // Find the END of each table (the last data row, not the section header)
    // Moonbeam section ends before "### Moonriver" or end of file
    // Moonriver section ends at end of file
    
    let moonbeamInsertIndex = -1;
    let moonriverInsertIndex = -1;
    let inMoonbeam = false;
    let lastMoonbeamDataRowIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Track when entering Moonbeam section
      if (trimmed === '### Moonbeam') {
        inMoonbeam = true;
        continue;
      }
      
      // Track when exiting Moonbeam section - insert right before ### Moonriver
      if (trimmed === '### Moonriver') {
        // Find position right after last data row, skipping empty lines
        if (lastMoonbeamDataRowIndex > 0) {
          // Insert immediately after the last data row
          moonbeamInsertIndex = lastMoonbeamDataRowIndex + 1;
        } else {
          // Fallback: insert before ### Moonriver
          moonbeamInsertIndex = i;
        }
        inMoonbeam = false;
        continue;
      }
      
      // Find last data row in Moonbeam section (lines starting with |, not |---)
      if (inMoonbeam && trimmed.startsWith('|') && !trimmed.startsWith('|---')) {
        lastMoonbeamDataRowIndex = i;
      }
    }
    
    // Moonriver always goes at the end
    moonriverInsertIndex = lines.length;
    
    // Handle USDC case (only Moonbeam)
    if (payoutType === 'usdc') {
      moonriverInsertIndex = -1; // Not used
    }
    
    console.log('Insert indices - Moonbeam:', moonbeamInsertIndex, 'Moonriver:', moonriverInsertIndex);
    
    // Insert rows (Moonriver first to preserve Moonbeam index)
    if (moonriverInsertIndex > 0) {
      lines.splice(moonriverInsertIndex, 0, moonriverRow);
    }
    
    if (moonbeamInsertIndex > 0) {
      lines.splice(moonbeamInsertIndex, 0, moonbeamRow);
    }
    
    readme = lines.join('\n');
    
    return NextResponse.json({ readme });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
