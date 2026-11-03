import { NewsItem } from '../types';

export interface StreamOptions {
  onDelta?: (text: string) => void;
  signal?: AbortSignal;
}

export class SummaryError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'SummaryError';
    this.code = code;
  }
}

const parseHttpError = async (response: Response) => {
  const payload = await response.json().catch(() => null) as { error?: { code?: string; message?: string } } | null;
  return new SummaryError(
    payload?.error?.code || 'request_failed',
    payload?.error?.message || `AI 代理请求失败（HTTP ${response.status}）。`,
  );
};

export const streamSummary = async (
  news: NewsItem[],
  topic: string,
  opts: StreamOptions = {},
): Promise<string> => {
  try {
    const response = await fetch('/api/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ news, topic }),
      signal: opts.signal,
    });

    if (!response.ok) throw await parseHttpError(response);
    if (!response.body) throw new SummaryError('empty_stream', '浏览器无法读取 AI 流式响应。');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';
    let doneReceived = false;

    const processEvent = (eventText: string) => {
      const data = eventText.split(/\r?\n/)
        .filter(line => line.startsWith('data:'))
        .map(line => line.slice(5).trimStart())
        .join('\n');
      if (!data) return;

      let event: { type?: string; text?: string; code?: string; message?: string };
      try {
        event = JSON.parse(data);
      } catch {
        throw new SummaryError('invalid_stream', 'AI 代理返回了无法解析的流式数据。');
      }

      if (event.type === 'delta' && typeof event.text === 'string') {
        fullText += event.text;
        opts.onDelta?.(event.text);
      } else if (event.type === 'done') {
        doneReceived = true;
      } else if (event.type === 'error') {
        throw new SummaryError(event.code || 'upstream_error', event.message || 'AI 生成过程中发生错误。');
      }
    };

    while (!doneReceived) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop() || '';
      for (const eventText of events) {
        processEvent(eventText);
        if (doneReceived) break;
      }
      if (done) {
        if (buffer.trim()) processEvent(buffer);
        break;
      }
    }

    if (!doneReceived) throw new SummaryError('incomplete_stream', 'AI 响应流意外结束，请重试。');
    return fullText;
  } catch (error) {
    if (error instanceof SummaryError) throw error;
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new SummaryError('network_error', error instanceof Error ? error.message : 'AI 请求发生未知网络错误。');
  }
};
