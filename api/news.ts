
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
 * 格式化日期为 YYYY-MM-DD，Google News RSS 搜索语法支持该格式
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
    
    // 解析时间范围参数
    const timeRangeMatch = q.match(/when:(\w+)/);
    const timeRange = timeRangeMatch ? timeRangeMatch[1] : null;
    const baseQuery = q.replace(/when:\w+/, '').trim();

    if (timeRange && ['3d', '7d', '30d', '1y'].includes(timeRange)) {
      // 定义拆分策略：[时间范围天数, 拆分段数]
      const strategyMap: Record<string, [number, number]> = {
        '3d': [3, 2],
        '7d': [7, 2],
        '30d': [30, 3],
        '1y': [365, 6]
      };

      const [totalDays, segments] = strategyMap[timeRange];
      const daysPerSegment = Math.ceil(totalDays / segments);
      
      const fetchPromises = [];
      const now = new Date();

      for (let i = 0; i < segments; i++) {
        const end = new Date(now);
        end.setDate(now.getDate() - (i * daysPerSegment));
        
        const start = new Date(now);
        start.setDate(now.getDate() - ((i + 1) * daysPerSegment));

        // 构造带日期范围的查询语句，例如: topic after:2023-01-01 before:2023-02-01
        // 注意：第一段不需要 before，只需要 after 即可获取到最新
        let segmentedQuery = baseQuery;
        if (i === 0) {
          segmentedQuery += ` after:${formatDate(start)}`;
        } else {
          segmentedQuery += ` after:${formatDate(start)} before:${formatDate(end)}`;
        }

        const url = `https://news.google.com/rss/search?q=${encodeURIComponent(segmentedQuery)}&hl=zh-CN&gl=CN&ceid=CN:zh-Hans`;
        fetchPromises.push(fetchRssItems(url));
      }

      const resultsArray = await Promise.all(fetchPromises);
      const combined = resultsArray.flat();

      // 根据链接去重
      const seen = new Set();
      items = combined.filter(item => {
        if (!item.link || seen.has(item.link)) return false;
        seen.add(item.link);
        return true;
      });
    } else {
      // 1d 或其他未定义范围：直接单次请求
      const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=zh-CN&gl=CN&ceid=CN:zh-Hans`;
      items = await fetchRssItems(rssUrl);
    }

    // 最终截取数量上限调整为 600 条
    const finalItems = items.slice(0, 600);

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
