
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
    
    // 为新闻列表添加编号，从 1 开始
    const newsContent = news.map((n: any, index: number) => 
      `编号 [${index + 1}] | 发布日期: ${n.pubDate} | 来源: ${n.source} | 标题: ${n.title}`
    ).join('\n');
    
    const prompt = `
      请针对“${topic}”这一话题，基于以下提供的最新新闻数据进行一次深度且详尽的综述分析。
      
      新闻列表：
      ${newsContent}

      请以专业分析报告的形式完成以下内容（字数不限，力求详尽、透彻）：

      【引用规范】：
      - **极其重要**：在分析报告中提到的任何观点或事实，必须在句末标注其对应的新闻编号，例如：...显示该行业正在快速增长 [1]。如果有多个来源，标注如：...引起了广泛争议 [2, 5, 12]。
      - 请像学术论文或专业研报那样，确保结论都有据可查。

      报告结构要求：
      1. **核心态势总结**：全面阐述该话题的当前背景、核心矛盾及焦点事件。
      2. **详尽时间线演变**：梳理事件或舆论的起承转合，指出关键转折点。
      3. **多维度深度剖析**：分析政策、市场、社会及技术等深层影响。
      4. **不同声音与立场分析**：分析新闻源中体现出的不同观点与媒体立场差异。
      5. **未来趋势预判与关键观察点**：推测发展方向及核心变量。

      请使用清晰的 Markdown 标题（不用加粗符号 **），确保段落分明，逻辑严密。
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "你是一位精通情报分析的首席分析师。你的风格是严谨、专业且高度注重数据溯源。在撰写报告时，你必须像学术论文一样严谨地引用提供的参考资料编号 [n]，确保每一个关键论断都有具体的编号支撑。你的中文表达应当专业、客观、优雅。",
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
