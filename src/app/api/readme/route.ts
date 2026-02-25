import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { moonbeamRow, moonriverRow, payoutType } = body;
    
    console.log('README API called:', { payoutType, moonbeamRow: moonbeamRow?.substring(0, 50), moonriverRow: moonriverRow?.substring(0, 50) });
    
    // Fetch the current README from GitHub
    const readmeUrl = 'https://raw.githubusercontent.com/moonbeam-foundation/treasury/main/README.md';
    
    const res = await fetch(readmeUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Payoutor/1.0)',
      },
      cache: 'no-store',
    });
    
    if (!res.ok) {
      console.error('Failed to fetch README:', res.status);
      return NextResponse.json({ error: 'Failed to fetch README from GitHub' }, { status: 500 });
    }
    
    let readme = await res.text();
    const lines = readme.split('\n');
    
    console.log('README has', lines.length, 'lines');
    
    if (payoutType === 'usdc') {
      // For USDC, only add to Moonbeam section
      // Find the Moonbeam table (after "### Moonbeam" header)
      let insertIndex = -1;
      let foundMoonbeamSection = false;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line === '### Moonbeam') {
          foundMoonbeamSection = true;
          console.log('Found Moonbeam section at line', i);
          continue;
        }
        
        if (foundMoonbeamSection && line === '### Moonriver') {
          console.log('Found Moonriver section, stopping search');
          break;
        }
        
        // Look for the table separator line (contains only | and -)
        if (foundMoonbeamSection && line.match(/^\|[\|\-\s]+\|$/)) {
          insertIndex = i + 1;
          console.log('Found table separator at line', i, ', inserting at', insertIndex);
          break;
        }
      }
      
      if (insertIndex > 0) {
        lines.splice(insertIndex, 0, moonbeamRow);
        readme = lines.join('\n');
        console.log('Inserted Moonbeam row at index', insertIndex);
      } else {
        console.error('Could not find insertion point for Moonbeam');
      }
    } else {
      // For native payouts, add to both sections
      let moonbeamInsertIndex = -1;
      let moonriverInsertIndex = -1;
      let currentSection = '';
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line === '### Moonbeam') {
          currentSection = 'moonbeam';
          console.log('Found Moonbeam section at line', i);
          continue;
        }
        
        if (line === '### Moonriver') {
          currentSection = 'moonriver';
          console.log('Found Moonriver section at line', i);
          continue;
        }
        
        // Look for the table separator line
        if (line.match(/^\|[\|\-\s]+\|$/)) {
          if (currentSection === 'moonbeam' && moonbeamInsertIndex === -1) {
            moonbeamInsertIndex = i + 1;
            console.log('Found Moonbeam table separator at line', i, ', will insert at', moonbeamInsertIndex);
          } else if (currentSection === 'moonriver' && moonriverInsertIndex === -1) {
            moonriverInsertIndex = i + 1;
            console.log('Found Moonriver table separator at line', i, ', will insert at', moonriverInsertIndex);
          }
        }
      }
      
      // Insert Moonriver first (higher index), then Moonbeam (lower index)
      if (moonriverInsertIndex > 0) {
        lines.splice(moonriverInsertIndex, 0, moonriverRow);
        console.log('Inserted Moonriver row at index', moonriverInsertIndex);
      } else {
        console.error('Could not find insertion point for Moonriver');
      }
      
      if (moonbeamInsertIndex > 0) {
        lines.splice(moonbeamInsertIndex, 0, moonbeamRow);
        console.log('Inserted Moonbeam row at index', moonbeamInsertIndex);
      } else {
        console.error('Could not find insertion point for Moonbeam');
      }
      
      readme = lines.join('\n');
    }
    
    console.log('Returning README with', readme.split('\n').length, 'lines');
    
    return NextResponse.json({ readme });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('README API error:', errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
