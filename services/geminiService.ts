
import { NewsItem } from "../types";

/**
 * 通过 Vercel API Route 后端代理生成新闻总结
 * 这样可以保护 API_KEY 不被泄露，并处理可能的 CORS 问题
 */
export const generateNewsSummary = async (news: NewsItem[], topic: string): Promise<string> => {
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ news, topic }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `AI 代理请求失败 (HTTP ${response.status})`);
    }

    const data = await response.json();
    return data.text || "无法生成总结内容。";
  } catch (error: any) {
    console.error("Gemini Service Error:", error);
    // 向用户返回更友好的错误提示
    if (error.message.includes('API_KEY')) {
      return "AI 总结不可用：服务器端未配置有效的 API Key。";
    }
    return `AI 总结请求失败: ${error.message || '未知网络错误'}`;
  }
};
