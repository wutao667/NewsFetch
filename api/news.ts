
export const config = {
  runtime: 'edge',
};

// 简单的辅助函数：从字符串中提取正则匹配的内容
function extract(str: string, regex: RegExp, index = 1) {
  const match = str.match(regex);
  return match ? match[index] : '';
}

// 追踪最终 URL
async function resolveUrl(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000); // 3秒超时

    const response = await fetch(url, {
      method: 'GET', // 有些站点不支持 HEAD，GET 更稳妥
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    clearTimeout(timeout);
    return response.url;
  } catch (e) {
    // 追踪失败则返回原始链接
    return url;
  }
}

export default async function handler(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');
  
  if (!q) {
    return new Response(JSON.stringify({ error: '缺少查询参数' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=zh-CN&gl=CN&ceid=CN:zh-Hans`;

  try {
    const response = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: `Google News 返回错误: ${response.status}` }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const xml = await response.text();
    
    // 使用正则提取 <item>
    const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
    
    // 限制处理前 20 条以保证速度
    const rawItems = itemMatches.slice(0, 20).map(itemXml => {
      const title = extract(itemXml, /<title>(.*?)<\/title>/);
      const link = extract(itemXml, /<link>(.*?)<\/link>/);
      const pubDate = extract(itemXml, /<pubDate>(.*?)<\/pubDate>/);
      const source = extract(itemXml, /<source[^>]*>(.*?)<\/source>/);
      return { title, link, pubDate, source };
    });

    // 并行解析所有跳转链接
    const resolvedItems = await Promise.all(
      rawItems.map(async (item) => ({
        ...item,
        link: item.link ? await resolveUrl(item.link) : '#'
      }))
    );

    return new Response(JSON.stringify(resolvedItems), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=3600, stale-while-revalidate', // 缓存一小时
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || '内部服务器错误' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
