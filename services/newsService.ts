
import { NewsItem } from '../types';

/**
 * 通过 Vercel API Route 后端中转获取新闻
 * 解决了前端直接请求 Google News RSS 导致的 CORS 限制问题
 */
export const fetchGoogleNews = async (query: string): Promise<NewsItem[]> => {
  try {
    // 依然在 query 中加入 "when:3d" 限制最近3天
    const fullQuery = `${query} when:3d`;
    // 请求我们新建的后端接口
    const apiUrl = `/api/news?q=${encodeURIComponent(fullQuery)}`;
    
    console.log(`正在通过后端中转请求新闻: ${apiUrl}`);

    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP 错误: ${response.status}`);
    }
    
    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    
    const items = xmlDoc.querySelectorAll('item');
    if (items.length === 0) {
      return [];
    }

    const news: NewsItem[] = [];

    items.forEach((item) => {
      let fullTitle = item.querySelector('title')?.textContent || '无标题';
      const link = item.querySelector('link')?.textContent || '#';
      const pubDateRaw = item.querySelector('pubDate')?.textContent || '';
      let sourceName = item.querySelector('source')?.textContent || '';

      // 清洗标题
      if (sourceName && fullTitle.endsWith(sourceName)) {
        const lastHyphenIndex = fullTitle.lastIndexOf(' - ');
        if (lastHyphenIndex > -1) {
          fullTitle = fullTitle.substring(0, lastHyphenIndex);
        }
      } else if (!sourceName) {
        const parts = fullTitle.split(' - ');
        if (parts.length > 1) {
          sourceName = parts.pop() || 'Google News';
          fullTitle = parts.join(' - ');
        } else {
          sourceName = 'Google News';
        }
      }

      // 格式化日期
      let formattedDate = pubDateRaw;
      try {
        const d = new Date(pubDateRaw);
        if (!isNaN(d.getTime())) {
          formattedDate = d.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          });
        }
      } catch (e) {
        formattedDate = pubDateRaw;
      }

      news.push({
        title: fullTitle,
        link,
        pubDate: formattedDate,
        source: sourceName
      });
    });

    return news;
  } catch (error: any) {
    console.error('Fetch Error:', error);
    throw new Error(error.message || '通过后端获取新闻失败，请检查网络或稍后重试。');
  }
};
