import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body;
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }
    
    if (!url.includes('forum.moonbeam.network')) {
      return NextResponse.json({ error: 'Only Moonbeam forum URLs are supported' }, { status: 400 });
    }
    
    // Extract topic ID from URL
    // URL format: https://forum.moonbeam.network/t/topic-slug/123
    const topicIdMatch = url.match(/\/t\/[^\/]+\/(\d+)/);
    if (!topicIdMatch) {
      return NextResponse.json({ error: 'Could not extract topic ID from URL' }, { status: 400 });
    }
    const topicId = topicIdMatch[1];
    const postNumberMatch = url.match(/\/(\d+)$/);
    const postNumber = postNumberMatch ? parseInt(postNumberMatch[1]) : 1;
    
    // Use Discourse API to get topic and posts
    const topicApiUrl = `https://forum.moonbeam.network/t/${topicId}.json`;
    
    const res = await fetch(topicApiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Payoutor/1.0)',
        'Accept': 'application/json',
      },
    });
    
    if (!res.ok) {
      // Fallback to HTML scraping if API fails
      return await fallbackToHtmlScraping(url);
    }
    
    const data = await res.json();
    
    // Extract title
    const title = data.title || '';
    
    // Extract content from the specified post (or first post)
    const postIndex = Math.max(0, (postNumber || 1) - 1);
    const posts = data.post_stream?.posts || [];
    const post = posts[postIndex] || posts[0];
    
    if (!post || !post.cooked) {
      return await fallbackToHtmlScraping(url);
    }
    
    // Convert HTML to markdown
    let content = post.cooked;
    content = convertHtmlToMarkdown(content);
    
    return NextResponse.json({ 
      title,
      content: content || 'Could not extract content from forum post. Please paste manually.'
    });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

async function fallbackToHtmlScraping(url: string) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Payoutor/1.0)',
        'Accept': 'text/html',
      },
    });
    
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch forum page' }, { status: 500 });
    }
    
    const html = await res.text();
    
    // Extract title
    let title = '';
    const ogTitleMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/);
    if (ogTitleMatch) {
      title = ogTitleMatch[1].trim();
    } else {
      const titleMatch = html.match(/<title>([^<]+)<\/title>/);
      title = titleMatch ? titleMatch[1].replace(' - Moonbeam Forum', '').trim() : '';
    }
    
    // Try to find cooked content
    let content = '';
    const cookedMatches = html.match(/<div class="cooked"[^>]*>([\s\S]*?)<\/div>/g);
    if (cookedMatches && cookedMatches.length > 0) {
      content = cookedMatches[0].replace(/<div class="cooked"[^>]*>/, '').replace(/<\/div>$/, '');
    }
    
    if (content) {
      content = convertHtmlToMarkdown(content);
    }
    
    return NextResponse.json({ 
      title,
      content: content || 'Could not extract content from forum post. Please paste manually.'
    });
  } catch (error: unknown) {
    return NextResponse.json({ 
      title: '',
      content: 'Could not extract content from forum post. Please paste manually.'
    });
  }
}

function convertHtmlToMarkdown(html: string): string {
  return html
    // Preserve links
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi, '[$2]($1)')
    // Preserve images  
    .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '\n![$2]($1)\n')
    .replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '\n![]($1)\n')
    // Headers
    .replace(/<h1[^>]*>([^<]*)<\/h1>/gi, '\n# $1\n')
    .replace(/<h2[^>]*>([^<]*)<\/h2>/gi, '\n## $1\n')
    .replace(/<h3[^>]*>([^<]*)<\/h3>/gi, '\n### $1\n')
    // Lists
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n')
    // Paragraphs and breaks
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<div[^>]*>/gi, '')
    .replace(/<\/div>/gi, '\n')
    // Bold/italic
    .replace(/<strong[^>]*>([^<]*)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>([^<]*)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>([^<]*)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>([^<]*)<\/i>/gi, '*$1*')
    // Code blocks
    .replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '\n```\n$1\n```\n')
    .replace(/<code[^>]*>([^<]*)<\/code>/gi, '`$1`')
    // Remove remaining HTML tags
    .replace(/<[^>]+>/g, '')
    // Clean HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
    // Clean up whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
