# 📰 NewsFetch Navigator

一个基于 Google News RSS 的新闻聚合与 AI 研判应用。搜索完成后自动生成流式中文研报，每条关键论断以 `[n]` 标注来源，点击编号即可回到对应新闻。

![Tech](https://img.shields.io/badge/React-19-61dafb) ![Vite](https://img.shields.io/badge/Vite-6-646cff) ![DeepSeek](https://img.shields.io/badge/DeepSeek-V4.1_Flash-4f46e5) ![Edge](https://img.shields.io/badge/Vercel-Edge_Functions-000000)

## 特性

- 支持 1 天、3 天、7 天、30 天和 1 年五种新闻范围。
- Google News RSS 分段抓取、排序、去重和清洗。
- 搜索完成后自动调用 `deepseek-v4.1-flash` 生成五段式研报。
- 研报以 SSE 流式显示，可随时停止并保留已生成正文。
- 每条论断用 `[1]`、`[2, 5]` 等编号关联下方新闻来源。
- AI API key 仅保存在 Vercel 服务端环境变量中，绝不进入仓库或浏览器。
- 内置新闻代理与 AI 流式代理诊断面板。

## 架构

```text
┌────────────────────────────────────────────┐
│ Browser: React 19 + Vite 6                 │
│ SearchBox → App → Summary/NewsTable/Debug  │
└──────────────┬────────────────┬────────────┘
               │                │
       GET /api/news    POST /api/summarize (SSE)
               │                │
       Google News RSS  Vercel Edge Function
                                │ native fetch
                                ▼
                   opencode-go chat/completions
                   model: deepseek-v4.1-flash
```

浏览器只请求本站 `/api/summarize`。Edge Function 从环境变量读取密钥、校验并裁剪输入、构造隔离资料区的提示词，再把上游 OpenAI 兼容 SSE 规范化为本站的 `delta`、`done`、`error` 三种事件。推理字段不会进入最终研报。

## Vercel 部署

1. 在 opencode 申请可访问 opencode-go 的 API key。
2. 将仓库导入 Vercel。
3. 在 **Settings → Environment Variables** 添加 `OPENCODE_API_KEY`；密钥只配置在 Vercel，绝不提交到仓库。
4. 使用默认构建命令 `vite build`、输出目录 `dist` 部署。
5. 部署后打开诊断面板验证 `/api/news` 和 `/api/summarize`，再搜索一个话题确认自动研判与引用跳转。

### 环境变量

| 变量 | 必填 | 默认值 | 说明 |
|---|---:|---|---|
| `OPENCODE_API_KEY` | 是 | 无 | opencode-go API key；缺失时代理返回 `missing_api_key` |
| `OPENCODE_BASE_URL` | 否 | `https://opencode.ai/zen/go/v1/chat/completions` | OpenAI 兼容的聊天补全端点 |
| `OPENCODE_MODEL` | 否 | `deepseek-v4.1-flash` | 上游模型名 |
| `OPENCODE_MAX_TOKENS` | 否 | `51200` | 最大输出 token 数 |
| `OPENCODE_CONTEXT_WINDOW` | 否 | `1048576` | 发送给上游的上下文窗口参数 |
| `SUMMARY_MAX_NEWS` | 否 | `150` | 单次进入研报资料区的新闻上限 |
| `SUMMARY_TIMEOUT_MS` | 否 | `240000` | 上游请求与流式生成超时，单位毫秒 |

## 本地开发

前置要求：Node.js 18+。

```bash
npm install
npm run dev
```

Vite 开发服务器本身不会运行 `api/*.ts`。完整本地联调应使用 `vercel dev` 并在本地环境中设置 `OPENCODE_API_KEY`。任何 `.env.local` 都不得提交。

```bash
npx vercel dev
```

## 流式输出

`/api/summarize` 请求上游时使用 `stream: true`，将 OpenAI 兼容 SSE 转成稳定的站内事件：

```text
data: {"type":"delta","text":"..."}

data: {"type":"done"}
```

上游流开始后的错误会成为 `type: "error"` 事件；流开始前的认证、限流和超时错误则使用结构化 JSON 与对应 HTTP 状态返回。前端逐段追加正文，停止生成时通过 `AbortController` 取消请求并保留当前文本。

## 为什么从 Gemini 换成 DeepSeek V4.1 Flash

这是一次 AI 供应链迁移：历史版本使用 Gemini 与专用 SDK；当前版本改为 opencode-go 的 OpenAI 兼容接口和 `deepseek-v4.1-flash`。原生 `fetch` 消除了供应商 SDK 依赖，后端代理继续保护密钥，SSE 则让长研报在生成期间即可阅读和停止。迁移后的模型、token 上限、上下文窗口与端点均可通过 Vercel 环境变量调整。

## 项目结构

```text
NewsFetch/
├── api/
│   ├── news.ts                 # Google News RSS 抓取与时间分段
│   ├── resolve-news.ts         # 新闻真实链接解析
│   └── summarize.ts            # opencode-go 流式代理
├── services/
│   ├── newsService.ts
│   └── summaryService.ts       # 浏览器 SSE 客户端
├── components/
│   ├── SearchBox.tsx
│   ├── NewsTable.tsx
│   └── DebugView.tsx
├── scripts/test-summarize.mjs  # 代理契约测试
├── App.tsx
├── types.ts
└── package.json
```

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 19、TypeScript 5.8 |
| 构建 | Vite 6 |
| 样式与图标 | Tailwind CSS CDN、Font Awesome 6 |
| 后端 | Vercel Edge Functions、Web Streams API |
| AI | opencode-go / `deepseek-v4.1-flash` |
| AI 客户端 | 原生 `fetch`，无 SDK |
| 数据源 | Google News RSS |

## License

MIT
