
export const config = {
  runtime: 'edge',
};

/**
 * 增强版提取函数
 * 专门处理 RSS XML 中常见的 CDATA 包装标签，并清洗前后空格
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
 * 追踪最终 URL
 * Google News RSS 提供的是 news.google.com/rss/articles/... 形式的链接。
 * 我们在服务端对其发起请求并跟随所有重定向，直到获取最终的新闻站点地址。
 */
async function resolveUrl(url: string): Promise<string> {
  if (!url || !url.startsWith('http')) return url;
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000); // 设置 4 秒超时

    // 发起 GET 请求并跟随重定向
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        // 模拟主流浏览器 User-Agent，防止被目标站点判定为机器人而拒绝跳转
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    clearTimeout(timeout);
    
    // fetch 自动处理重定向后，response.url 即为最终落地页地址
    const finalUrl = response.url;
    
    // 如果追踪结果仍然在 google.com 域名下（例如触发了 Google 的验证或异常），则回退到原始链接
    if (finalUrl && finalUrl.includes('news.google.com/articles')) {
       return url;
    }

    return finalUrl || url;
  } catch (e) {
    // 追踪失败（超时、证书错误等）时，返回原始链接作为保底方案
    console.warn(`Could not resolve URL: ${url}`, e);
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

  // 构建 Google News RSS 搜索链接，指定中文及中国地区
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
    
    // 提取原始数据
    const rawItems = itemMatches.slice(0, 20).map(itemXml => {
      const title = extract(itemXml, /<title>(.*?)<\/title>/);
      const link = extract(itemXml, /<link>(.*?)<\/link>/);
      const pubDate = extract(itemXml, /<pubDate>(.*?)<\/pubDate>/);
      const source = extract(itemXml, /<source[^>]*>(.*?)<\/source>/);
      return { title, link, pubDate, source };
    });

    // 核心逻辑：并行追踪所有链接的最终地址
    const resolvedItems = await Promise.all(
      rawItems.map(async (item) => {
        if (!item.link) return { ...item, link: '#' };
        // 执行重定向追踪
        const realLink = await resolveUrl(item.link);
        return { ...item, link: realLink };
      })
    );

    return new Response(JSON.stringify(resolvedItems), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        // 增加边缘缓存以提升后续相同搜索的加载速度
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
