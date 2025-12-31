
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

    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: '服务器未配置 API_KEY 环境变量' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // 包含发布时间的新闻列表，以便模型分析时间线
    const newsContent = news.map((n: any) => `[${n.pubDate}] ${n.title}`).join('\n');
    
    const prompt = `
      请针对“${topic}”这一话题，基于以下提供的最新新闻数据进行一次深度且详尽的综述分析。
      
      新闻列表（带时间戳）：
      ${newsContent}

      请以专业分析报告的形式完成以下内容（字数不限，力求详尽、透彻）：

      1. **核心态势总结**：全面阐述该话题的当前背景、核心矛盾及目前最受关注的焦点事件。请不要简单罗列，而是概括出大局观。
      
      2. **详尽时间线演变**：利用新闻的时间戳信息，梳理事件或舆论的起承转合。请指出事件是如何发酵的，关键的转折点发生在什么时候，以及报道重心是如何从最初的切入点演变为现在的焦点的。
      
      3. **多维度深度剖析**：从多个维度（如政策影响、市场反应、社会情感、技术演进等）分析该话题带来的深层次影响。
      
      4. **不同声音与立场分析**：分析新闻源中体现出的不同观点。是否有争议？不同媒体或利益相关方的立场有何差异？
      
      5. **未来趋势预判与关键观察点**：基于现有动态，推测接下来可能的发展方向。读者应该在接下来的几天或几周内密切关注哪些核心变量？

      请使用清晰的 Markdown 标题（用 ** 加粗）来组织内容，确保段落分明，逻辑严密。
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "你是一位世界级的战略情报分析师和资深调查记者。你擅长从海量、碎片化且带有强时效性的信息中发现深层关联，并能以极具洞察力、逻辑性强且文笔优雅的中文撰写深度分析报告。你的目标是让读者通过一份报告就能透彻理解事件的全貌、演变脉络及未来走向。",
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
