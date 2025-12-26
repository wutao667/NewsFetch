
import { GoogleGenAI } from "@google/genai";
import { NewsItem } from "../types";

// 安全获取 API Key
const getApiKey = () => {
  try {
    // 优先从 process.env 获取，如果 process 不存在则 fallback
    return (typeof process !== 'undefined' && process.env?.API_KEY) || (window as any)._ENV_?.API_KEY || "";
  } catch {
    return "";
  }
};

export const generateNewsSummary = async (news: NewsItem[], topic: string): Promise<string> => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    console.error("API_KEY is missing. Please set it in Vercel Environment Variables.");
    return "AI 总结不可用：缺少 API Key 配置。";
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const titles = news.map(n => `- ${n.title}`).join('\n');
  const prompt = `
    以下是关于“${topic}”的最新搜索结果。请对这些新闻进行简明扼要的总结（300字以内），指出最主要的趋势或热点话题。
    
    新闻列表：
    ${titles}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "你是一个资深新闻编辑，擅长从多个标题中提取核心信息并以中文进行简洁总结。",
      }
    });
    
    return response.text || "无法生成总结。";
  } catch (error: any) {
    console.error("Gemini Error:", error);
    return `AI 总结失败: ${error.message || '未知错误'}`;
  }
};
