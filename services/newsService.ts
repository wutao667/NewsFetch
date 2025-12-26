
import { NewsItem } from '../types';

/**
 * 通过 Vercel API Route 后端获取新闻
 * 后端已处理了 URL 重定向，此处直接接收解析好的 JSON
 */
export const fetchGoogleNews = async (query: string): Promise<NewsItem[]> => {
  try {
    const fullQuery = `${query} when:3d`;
    const apiUrl = `/api/news?q=${encodeURIComponent(fullQuery)}`;
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP 错误: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!Array.isArray(data)) {
      return [];
    }

    // 在前端进行简单的格式化处理
    return data.map((item: any) => {
      let fullTitle = item.title || '无标题';
      let sourceName = item.source || '';

      // 清洗标题中的来源后缀
      if (sourceName && fullTitle.endsWith(` - ${sourceName}`)) {
        fullTitle = fullTitle.substring(0, fullTitle.lastIndexOf(` - ${sourceName}`));
      }

      // 格式化日期
      let formattedDate = item.pubDate;
      try {
        const d = new Date(item.pubDate);
        if (!isNaN(d.getTime())) {
          formattedDate = d.toLocaleString('zh-CN', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          });
        }
      } catch (e) {}

      return {
        title: fullTitle,
        link: item.link,
        pubDate: formattedDate,
        source: sourceName || '新闻源'
      };
    });
  } catch (error: any) {
    console.error('Fetch News Error:', error);
    throw new Error(error.message || '获取新闻失败，请稍后重试。');
  }
};
