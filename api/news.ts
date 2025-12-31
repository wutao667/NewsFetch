
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

/**
 * 格式化日期为 YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * 抓取单个 RSS 源并解析
 */
async function fetchRssItems(url: string): Promise<any[]> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) return [];

    const xml = await response.text();
    const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
    
    return itemMatches.map(itemXml => ({
      title: extract(itemXml, /<title>(.*?)<\/title>/),
      link: extract(itemXml, /<link>(.*?)<\/link>/),
      pubDate: extract(itemXml, /<pubDate>(.*?)<\/pubDate>/),
      source: extract(itemXml, /<source[^>]*>(.*?)<\/source>/),
    }));
  } catch (e) {
    console.error('RSS Fetch Error:', e);
    return [];
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

  try {
    let items: any[] = [];

    // 检测是否为 1 年模式 (前端传来的 query 包含 "when:1y")
    if (q.includes('when:1y')) {
      const baseQuery = q.replace('when:1y', '').trim();
      
      const now = new Date();
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(now.getMonth() - 6);
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(now.getFullYear() - 1);

      // 第一段：最近 6 个月 (after:半年前)
      const q1 = `${baseQuery} after:${formatDate(sixMonthsAgo)}`;
      const url1 = `https://news.google.com/rss/search?q=${encodeURIComponent(q1)}&hl=zh-CN&gl=CN&ceid=CN:zh-Hans`;
      
      // 第二段：更早的 6 个月 (before:半年前 after:一年前)
      const q2 = `${baseQuery} before:${formatDate(sixMonthsAgo)} after:${formatDate(oneYearAgo)}`;
      const url2 = `https://news.google.com/rss/search?q=${encodeURIComponent(q2)}&hl=zh-CN&gl=CN&ceid=CN:zh-Hans`;

      // 并发请求
      const [results1, results2] = await Promise.all([
        fetchRssItems(url1),
        fetchRssItems(url2)
      ]);

      // 合并并去重 (根据 link)
      const combined = [...results1, ...results2];
      const seen = new Set();
      items = combined.filter(item => {
        if (!item.link || seen.has(item.link)) return false;
        seen.add(item.link);
        return true;
      });
    } else {
      // 普通模式：单次请求
      const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=zh-CN&gl=CN&ceid=CN:zh-Hans`;
      items = await fetchRssItems(rssUrl);
    }

    // 最终返回结果，上限设为 300 以满足“拼接成 200 条以上”的需求
    const finalItems = items.slice(0, 300);

    return new Response(JSON.stringify(finalItems), {
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
