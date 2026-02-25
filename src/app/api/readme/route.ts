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
      const lines = readme.split('\n');
      let insertIndex = -1;
      let inMoonbeamSection = false;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('### Moonbeam')) {
          inMoonbeamSection = true;
        } else if (inMoonbeamSection && lines[i].startsWith('### ')) {
          break;
        } else if (inMoonbeamSection && lines[i].startsWith('|') && lines[i].includes('Status')) {
          insertIndex = i + 2;
          break;
        }
      }
      
      if (insertIndex > 0) {
        lines.splice(insertIndex, 0, moonbeamRow);
        readme = lines.join('\n');
      }
    } else {
      // For native payouts, add to both sections
      const lines = readme.split('\n');
      
      // Find Moonbeam section
      let moonbeamInsertIndex = -1;
      let inMoonbeamSection = false;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('### Moonbeam')) {
          inMoonbeamSection = true;
        } else if (inMoonbeamSection && lines[i].startsWith('### ')) {
          break;
        } else if (inMoonbeamSection && lines[i].startsWith('|') && lines[i].includes('Status')) {
          moonbeamInsertIndex = i + 2;
          break;
        }
      }
      
      // Find Moonriver section
      let moonriverInsertIndex = -1;
      let inMoonriverSection = false;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('### Moonriver')) {
          inMoonriverSection = true;
        } else if (inMoonriverSection && lines[i].startsWith('### ')) {
          break;
        } else if (inMoonriverSection && lines[i].startsWith('|') && lines[i].includes('Status')) {
          moonriverInsertIndex = i + 2;
          break;
        }
      }
      
      // Insert rows (in reverse order to maintain correct indices)
      if (moonriverInsertIndex > 0) {
        lines.splice(moonriverInsertIndex, 0, moonriverRow);
      }
      if (moonbeamInsertIndex > 0) {
        lines.splice(moonbeamInsertIndex, 0, moonbeamRow);
      }
      
      readme = lines.join('\n');
    }
    
    return NextResponse.json({ readme });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
