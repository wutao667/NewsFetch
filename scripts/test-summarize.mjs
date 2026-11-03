import assert from 'node:assert/strict';
import handler from '../api/summarize.ts';

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };
const secret = 'REAL_SECRET_MUST_NOT_LEAK';

const request = (body, init = {}) => new Request('https://newsfetch.test/api/summarize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
  body: JSON.stringify(body),
  ...init,
});

const readJson = async response => JSON.parse(await response.text());
const readEvents = async response => (await response.text())
  .split(/\r?\n\r?\n/)
  .filter(Boolean)
  .map(block => JSON.parse(block.split(/\r?\n/).find(line => line.startsWith('data: ')).slice(6)));

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

test('正常流只转发正文 delta 并发送 done', async () => {
  process.env.OPENCODE_API_KEY = secret;
  let upstreamRequest;
  globalThis.fetch = async (_url, init) => {
    upstreamRequest = init;
    const sse = [
      'data: {"choices":[{"delta":{"reasoning_content":"不能出现","content":"第一段"}}]}',
      '',
      'data: {"choices":[{"delta":{"reasoning_content":"仍不能出现","content":"第二段"}}]}',
      '',
      'data: [DONE]',
      '',
    ].join('\n');
    return new Response(sse, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
  };

  const response = await handler(request({
    topic: '测试话题',
    news: [{ title: '标题', pubDate: '2026-11-02', source: '测试源', link: 'https://example.test', ignored: 'drop me' }],
  }));
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /^text\/event-stream/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('x-accel-buffering'), 'no');
  const events = await readEvents(response);
  assert.deepEqual(events.map(event => event.type), ['delta', 'delta', 'done']);
  assert.equal(events.filter(event => event.type === 'delta').map(event => event.text).join(''), '第一段第二段');
  assert.ok(!JSON.stringify(events).includes('不能出现'));

  const upstreamBody = JSON.parse(upstreamRequest.body);
  assert.equal(upstreamBody.model, 'deepseek-v4.1-flash');
  assert.equal(upstreamBody.max_tokens, 51200);
  assert.equal(upstreamBody.context_window, 1048576);
  assert.equal(upstreamBody.stream, true);
  assert.match(upstreamRequest.headers['x-opencode-session'], /^ca-newsfetch-[0-9a-f]{8}$/);
  assert.equal(upstreamRequest.headers.Authorization, `Bearer ${secret}`);
  assert.ok(!upstreamBody.messages[1].content.includes('drop me'));
});

test('GET 返回 405', async () => {
  const response = await handler(new Request('https://newsfetch.test/api/summarize', { method: 'GET' }));
  assert.equal(response.status, 405);
});

test('非数组 news 返回 400', async () => {
  const response = await handler(request({ news: {}, topic: 'x' }));
  assert.equal(response.status, 400);
  assert.equal((await readJson(response)).error.code, 'invalid_news');
});

test('超过 256KB 的声明 body 返回 413', async () => {
  const response = await handler(request({ news: [], topic: 'x' }, { headers: { 'Content-Length': String(256 * 1024 + 1) } }));
  assert.equal(response.status, 413);
  assert.equal((await readJson(response)).error.code, 'payload_too_large');
});

test('缺少 OPENCODE_API_KEY 返回 missing_api_key', async () => {
  delete process.env.OPENCODE_API_KEY;
  const response = await handler(request({ news: [], topic: 'x' }));
  assert.equal(response.status, 500);
  assert.equal((await readJson(response)).error.code, 'missing_api_key');
});

test('上游 401 映射为 502 invalid_api_key 且错误体不泄密', async () => {
  process.env.OPENCODE_API_KEY = secret;
  globalThis.fetch = async () => new Response('{"error":{"message":"Invalid credential"}}', { status: 401 });
  const response = await handler(request({ news: [], topic: 'x' }));
  assert.equal(response.status, 502);
  const text = await response.text();
  assert.equal(JSON.parse(text).error.code, 'invalid_api_key');
  assert.ok(!text.includes(secret));
});

test('上游 429 映射为 429 rate_limited 且错误体不泄密', async () => {
  process.env.OPENCODE_API_KEY = secret;
  globalThis.fetch = async () => new Response('rate limited', { status: 429 });
  const response = await handler(request({ news: [], topic: 'x' }));
  assert.equal(response.status, 429);
  const text = await response.text();
  assert.equal(JSON.parse(text).error.code, 'rate_limited');
  assert.ok(!text.includes(secret));
});

test('新闻数量按 SUMMARY_MAX_NEWS 截断', async () => {
  process.env.OPENCODE_API_KEY = secret;
  process.env.SUMMARY_MAX_NEWS = '2';
  let upstreamBody;
  globalThis.fetch = async (_url, init) => {
    upstreamBody = JSON.parse(init.body);
    return new Response('data: [DONE]\n\n', { status: 200 });
  };
  const response = await handler(request({
    topic: '截断测试',
    news: [
      { title: '新闻一' },
      { title: '新闻二' },
      { title: '新闻三' },
    ],
  }));
  await response.text();
  const userPrompt = upstreamBody.messages.find(message => message.role === 'user').content;
  assert.match(userPrompt, /\[1\].*新闻一/);
  assert.match(userPrompt, /\[2\].*新闻二/);
  assert.ok(!userPrompt.includes('新闻三'));
  assert.ok(!userPrompt.includes('[3]'));
});

try {
  for (const [name, fn] of tests) {
    await fn();
    console.log(`PASS ${name}`);
  }
  console.log(`\n${tests.length}/${tests.length} tests passed`);
} finally {
  globalThis.fetch = originalFetch;
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) delete process.env[key];
  }
  Object.assign(process.env, originalEnv);
}
