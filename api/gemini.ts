
import { GoogleGenAI } from "@google/genai";

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: '仅支持 POST 请求' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { news, topic } = await req.json();

    if (!news || !topic) {
      return new Response(JSON.stringify({ error: '缺少 news 或 topic 参数' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 严禁在前端暴露 API_KEY，仅在此服务端环境使用
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: '服务器未配置 API_KEY 环境变量' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const titles = news.map((n: any) => `- ${n.title}`).join('\n');
    const prompt = `
      以下是关于“${topic}”的最新搜索结果。请对这些新闻进行简明扼要的总结（300字以内），指出最主要的趋势或热点话题。
      
      新闻列表：
      ${titles}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "你是一个资深新闻编辑，擅长从多个标题中提取核心信息并以中文进行简洁总结。",
      }
    });

    return new Response(JSON.stringify({ text: response.text }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('Gemini Edge API Error:', error);
    return new Response(JSON.stringify({ error: error.message || '内部服务器错误' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
