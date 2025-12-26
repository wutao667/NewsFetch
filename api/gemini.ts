
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
    
    // 包含发布时间的新闻列表，以便模型分析时间线
    const newsContent = news.map((n: any) => `[发布时间: ${n.pubDate}] 标题: ${n.title}`).join('\n');
    
    const prompt = `
      请分析关于“${topic}”的最新搜索结果。
      
      以下是包含时间戳的新闻列表：
      ${newsContent}

      请完成以下任务（350字以内，使用中文）：
      1. 核心总结：简述这一话题目前的主要动态。
      2. 时间线演变分析：参考新闻的发布时间，分析舆论或报道焦点随时间的变化情况（例如：从早期的XX关注点转移到了最新的XX动向）。
      3. 关键趋势：指出目前该话题最值得关注的一个趋势或潜在走向。
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "你是一个资深新闻数据分析师，擅长从带有时间戳的碎片化新闻中提取核心信息，并分析舆论随时间推移的演变脉络。请以专业、深刻且简洁的中文进行回答。",
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
