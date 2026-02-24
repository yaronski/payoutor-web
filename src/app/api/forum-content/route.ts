import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body;
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }
    
    // Validate it's a Moonbeam forum URL
    if (!url.includes('forum.moonbeam.network')) {
      return NextResponse.json({ error: 'Only Moonbeam forum URLs are supported' }, { status: 400 });
    }
    
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Payoutor/1.0)',
      },
    });
    
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch forum page' }, { status: 500 });
    }
    
    const html = await res.text();
    
    // Extract title
    const titleMatch = html.match(/<title>([^<]+)<\/title>/);
    const title = titleMatch ? titleMatch[1].replace(' - Moonbeam Forum', '').trim() : '';
    
    // Extract main content from the first post
    // Look for the cooked div which contains the main post content
    const contentMatch = html.match(/<div class="cooked"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<div class="post-menu">/);
    
    let content = '';
    if (contentMatch) {
      content = contentMatch[1]
        // Remove HTML tags but preserve structure
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/h[1-6]>/gi, '\n\n')
        .replace(/<li[^>]*>/gi, '- ')
        .replace(/<\/li>/gi, '\n')
        .replace(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi, '[$2]($1)')
        .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)')
        .replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '![]($1)')
        .replace(/<[^>]+>/g, '')
        // Clean up HTML entities
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        // Clean up whitespace
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    }
    
    // If we couldn't extract content, try a simpler approach
    if (!content) {
      const simpleMatch = html.match(/<div class="cooked"[^>]*>([\s\S]*?)<\/div>/);
      if (simpleMatch) {
        content = simpleMatch[1]
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<\/p>/gi, '\n\n')
          .replace(/<[^>]+>/g, '')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&nbsp;/g, ' ')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
      }
    }
    
    return NextResponse.json({ 
      title,
      content: content || 'Could not extract content from forum post'
    });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
