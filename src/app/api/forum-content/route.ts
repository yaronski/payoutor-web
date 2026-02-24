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
    // URL format: https://forum.moonbeam.network/t/topic-slug/123 or /123/4 (with post number)
    const topicIdMatch = url.match(/\/t\/[^\/]+\/(\d+)/);
    if (!topicIdMatch) {
      return NextResponse.json({ error: 'Could not extract topic ID from URL' }, { status: 400 });
    }
    const topicId = topicIdMatch[1];
    
    // Use Discourse API to get topic and ALL posts
    const topicApiUrl = `https://forum.moonbeam.network/t/${topicId}.json`;
    
    const res = await fetch(topicApiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Payoutor/1.0)',
        'Accept': 'application/json',
      },
    });
    
    if (!res.ok) {
      return await fallbackToHtmlScraping(url);
    }
    
    const data = await res.json();
    
    // Extract title
    const title = data.title || '';
    
    // Get ALL posts from the topic
    const posts = data.post_stream?.posts || [];
    
    if (posts.length === 0) {
      return await fallbackToHtmlScraping(url);
    }
    
    // Combine all posts into one markdown document
    let allContent = '';
    
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      if (post.cooked) {
        // Add post header (except for first post)
        if (i > 0) {
          allContent += `\n\n---\n\n### Reply by ${post.username || 'Unknown'}\n\n`;
        }
        allContent += convertHtmlToMarkdown(post.cooked);
      }
    }
    
    return NextResponse.json({ 
      title,
      content: allContent || 'Could not extract content from forum post. Please paste manually.'
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
    
    // Try to find ALL cooked content (all posts)
    let content = '';
    const cookedMatches = html.match(/<div class="cooked"[^>]*>([\s\S]*?)<\/div>/g);
    if (cookedMatches && cookedMatches.length > 0) {
      for (let i = 0; i < cookedMatches.length; i++) {
        const postContent = cookedMatches[i].replace(/<div class="cooked"[^>]*>/, '').replace(/<\/div>$/, '');
        if (i > 0) {
          content += '\n\n---\n\n### Reply\n\n';
        }
        content += convertHtmlToMarkdown(postContent);
      }
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
    // Preserve images (before links since they're similar)
    .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '\n![$2]($1)\n')
    .replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '\n![]($1)\n')
    // Preserve links
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi, '[$2]($1)')
    // Headers
    .replace(/<h1[^>]*>([^<]*)<\/h1>/gi, '\n# $1\n')
    .replace(/<h2[^>]*>([^<]*)<\/h2>/gi, '\n## $1\n')
    .replace(/<h3[^>]*>([^<]*)<\/h3>/gi, '\n### $1\n')
    // Lists
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n')
    .replace(/<\/ul>/gi, '\n')
    .replace(/<\/ol>/gi, '\n')
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
    // Blockquotes
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, '\n> $1\n')
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
