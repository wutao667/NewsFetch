
export const config = {
  runtime: 'edge',
};

/**
 * 提取函数：从字符串中提取正则匹配的内容并清洗 CDATA 包装
 */
function extract(str: string, regex: RegExp, index = 1) {
  const match = str.match(regex);
  if (!match) return '';
  let content = match[index];
  // 移除可能的 XML CDATA 包装
  content = content.replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '');
  return content.trim();
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

  // 构建 Google News RSS 搜索链接
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=zh-CN&gl=CN&ceid=CN:zh-Hans`;

  try {
    const response = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: `无法获取 RSS 订阅源: ${response.status}` }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const xml = await response.text();
    
    // 解析 XML 中的 <item> 块
    const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
    
    // 提取数据并直接返回，不再进行 URL 追踪
    const items = itemMatches.slice(0, 30).map(itemXml => {
      const title = extract(itemXml, /<title>(.*?)<\/title>/);
      const link = extract(itemXml, /<link>(.*?)<\/link>/);
      const pubDate = extract(itemXml, /<pubDate>(.*?)<\/pubDate>/);
      const source = extract(itemXml, /<source[^>]*>(.*?)<\/source>/);
      return { title, link, pubDate, source };
    });

    return new Response(JSON.stringify(items), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=1800, stale-while-revalidate', 
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || '内部服务器错误' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
