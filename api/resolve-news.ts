export const config = {
  runtime: 'edge',
  regions: ['iad1'],
};

function json(data: { url: string }, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

function extractArticleId(url: URL) {
  const parts = url.pathname.split('/').filter(Boolean);
  const articlesIndex = parts.indexOf('articles');
  if (articlesIndex === -1) return '';

  const articleId = parts[articlesIndex + 1] || '';
  if (!/^CBMi[\w-]+$/.test(articleId)) return '';

  return articleId;
}

function extractAttr(html: string, attr: string) {
  const match = html.match(new RegExp(`${attr}=["']([^"']+)["']`));
  return match?.[1] || '';
}

function findUrl(value: unknown): string {
  if (typeof value === 'string') {
    return /^https?:\/\//.test(value) ? value : '';
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findUrl(item);
      if (found) return found;
    }
  }

  return '';
}

function extractResolvedUrl(text: string) {
  const payload = text.startsWith(")]}'") ? text.replace(/^\)\]\}'\s*\n?/, '') : text;
  const parsed = JSON.parse(payload);

  for (const row of parsed) {
    if (!Array.isArray(row)) continue;

    for (const value of row) {
      if (typeof value !== 'string' || !value.includes('http')) continue;

      try {
        const candidate = findUrl(JSON.parse(value));
        if (candidate) return candidate;
      } catch {
        // Ignore non-JSON strings in the batchexecute envelope.
      }
    }
  }

  return '';
}

async function postBatchExecute(body: URLSearchParams, signal: AbortSignal) {
  const response = await fetch('https://news.google.com/_/DotsSplashUi/data/batchexecute', {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    },
    body,
  });

  if (!response.ok) return '';

  return extractResolvedUrl(await response.text());
}

export default async function handler(req: Request) {
  let originalUrl = '';

  try {
    const body = await req.json();
    originalUrl = typeof body?.url === 'string' ? body.url : '';

    if (!originalUrl) {
      return json({ url: originalUrl }, 400);
    }

    const parsedUrl = new URL(originalUrl);
    if (parsedUrl.hostname !== 'news.google.com') {
      return json({ url: originalUrl });
    }

    const articleId = extractArticleId(parsedUrl);
    if (!articleId) {
      return json({ url: originalUrl });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      const articleResponse = await fetch(`https://news.google.com/rss/articles/${articleId}`, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        },
      });

      if (!articleResponse.ok) {
        return json({ url: originalUrl });
      }

      const html = await articleResponse.text();
      const sg = extractAttr(html, 'data-n-a-sg');
      const ts = extractAttr(html, 'data-n-a-ts');

      if (!sg || !ts) {
        return json({ url: originalUrl });
      }

      const primaryBody = new URLSearchParams({
        'f.req': JSON.stringify([
          [
            'Fgzz1d',
            JSON.stringify([[articleId, sg, ts]]),
            null,
            'generic',
          ],
        ]),
      });

      const fallbackBody = new URLSearchParams({
        'f.req': JSON.stringify([
          [
            [
              'Fbv4je',
              `["garturlreq",[["X","X",["X","X"],null,null,1,1,"US:en",null,1,null,null,null,null,null,0,1],"X","X",1,[1,1,1],1,1,null,0,0,null,0],"${articleId}",${ts},"${sg}"]`,
            ],
          ],
        ]),
      });

      const resolvedUrl = await postBatchExecute(primaryBody, controller.signal)
        || await postBatchExecute(fallbackBody, controller.signal);

      return json({ url: resolvedUrl || originalUrl });
    } finally {
      clearTimeout(timeoutId);
    }
  } catch {
    return json({ url: originalUrl });
  }
}
