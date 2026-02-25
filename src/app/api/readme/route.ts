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
    const lines = readme.split('\n');
    
    if (payoutType === 'usdc') {
      // For USDC, only add to Moonbeam section
      let insertIndex = -1;
      let inMoonbeamSection = false;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('### Moonbeam')) {
          inMoonbeamSection = true;
        } else if (inMoonbeamSection && lines[i].includes('### Moonriver')) {
          // Found Moonriver section, stop
          break;
        } else if (inMoonbeamSection && lines[i].startsWith('|') && lines[i].includes('Status')) {
          // Found table header, insert after separator (i+2)
          insertIndex = i + 2;
          break;
        }
      }
      
      console.error(`USDC: Insert at index ${insertIndex}`);
      
      if (insertIndex > 0) {
        lines.splice(insertIndex, 0, moonbeamRow);
        readme = lines.join('\n');
      } else {
        console.error('Could not find Moonbeam table header');
      }
    } else {
      // For native payouts, add to both sections
      let moonbeamInsertIndex = -1;
      let moonriverInsertIndex = -1;
      let inMoonbeamSection = false;
      let inMoonriverSection = false;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('### Moonbeam')) {
          inMoonbeamSection = true;
          inMoonriverSection = false;
        } else if (lines[i].includes('### Moonriver')) {
          inMoonriverSection = true;
          inMoonbeamSection = false;
        } else if (inMoonbeamSection && lines[i].startsWith('|') && lines[i].includes('Status') && moonbeamInsertIndex === -1) {
          moonbeamInsertIndex = i + 2;
        } else if (inMoonriverSection && lines[i].startsWith('|') && lines[i].includes('Status') && moonriverInsertIndex === -1) {
          moonriverInsertIndex = i + 2;
        }
      }
      
      console.error(`Native: Moonbeam insert at ${moonbeamInsertIndex}, Moonriver insert at ${moonriverInsertIndex}`);
      
      // Insert rows (in reverse order to maintain correct indices after first insertion)
      if (moonriverInsertIndex > 0) {
        lines.splice(moonriverInsertIndex, 0, moonriverRow);
      } else {
        console.error('Could not find Moonriver table header');
      }
      if (moonbeamInsertIndex > 0) {
        lines.splice(moonbeamInsertIndex, 0, moonbeamRow);
      } else {
        console.error('Could not find Moonbeam table header');
      }
      
      readme = lines.join('\n');
    }
    
    return NextResponse.json({ readme });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('README API error:', errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
