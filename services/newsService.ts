
import { NewsItem, TimeRange } from '../types';

/**
 * 通过 Vercel API Route 后端获取新闻
 * @param query 搜索关键词
 * @param timeRange 时效性 (1d, 3d, 7d, 30d)
 */
export const fetchGoogleNews = async (query: string, timeRange: TimeRange = '3d'): Promise<NewsItem[]> => {
  try {
    // 根据用户选择构建 Google News 搜索语法，例如 "AI when:7d"
    const fullQuery = `${query} when:${timeRange}`;
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

    // 1. 先进行初步映射并保留时间戳用于排序
    const itemsWithTimestamp = data.map((item: any) => {
      const date = new Date(item.pubDate);
      return {
        ...item,
        timestamp: isNaN(date.getTime()) ? 0 : date.getTime()
      };
    });

    // 2. 按照时间倒序排列（最新的在前）
    itemsWithTimestamp.sort((a, b) => b.timestamp - a.timestamp);

    // 3. 最终格式化为 NewsItem 类型
    return itemsWithTimestamp.map((item: any) => {
      let fullTitle = item.title || '无标题';
      let sourceName = item.source || '';

      // 清洗标题中的来源后缀
      if (sourceName && fullTitle.endsWith(` - ${sourceName}`)) {
        fullTitle = fullTitle.substring(0, fullTitle.lastIndexOf(` - ${sourceName}`));
      }

      // 格式化展示日期
      let formattedDate = item.pubDate;
      const d = new Date(item.timestamp);
      if (item.timestamp > 0) {
        formattedDate = d.toLocaleString('zh-CN', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
      }

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
