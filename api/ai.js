export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { baseUrl, apiKey, apiUser, action = 'models', model, messages, prompt, size = '1024x1024' } = req.body || {};
    if (!baseUrl || !apiKey) return res.status(400).json({ error: 'baseUrl and apiKey are required' });
    const url = new URL(baseUrl);
    if (url.protocol !== 'https:') return res.status(400).json({ error: 'HTTPS is required' });
    const host = url.hostname.toLowerCase();
    const blocked = /^(localhost|127\.|0\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|169\.254\.|::1$)/.test(host);
    if (blocked || host.endsWith('.local') || host.endsWith('.internal')) return res.status(400).json({ error: 'Private/local endpoints are not allowed.' });

    let target;
    let method = 'GET';
    let body;

    if (action === 'chat') {
      target = new URL('/v1/chat/completions', url).toString();
      method = 'POST';
      body = JSON.stringify({ model, messages: messages || [{ role: 'user', content: 'Reply with OK only.' }], max_tokens: 2400 });
    } else if (action === 'image') {
      if (host === 'gen.pollinations.ai') {
        const width = Number((size || '1024x1024').split('x')[0]) || 1024;
        const height = Number((size || '1024x1024').split('x')[1]) || 1024;
        const nativeUrl = new URL('/image/' + encodeURIComponent(prompt || 'educational vocabulary illustration'), url);
        nativeUrl.searchParams.set('model', model || 'flux');
        nativeUrl.searchParams.set('width', String(width));
        nativeUrl.searchParams.set('height', String(height));
        nativeUrl.searchParams.set('nologo', 'true');
        nativeUrl.searchParams.set('key', apiKey);

        let upstream = await fetch(nativeUrl.toString(), { method: 'GET' });
        if (upstream.ok) {
          const contentType = upstream.headers.get('content-type') || '';
          if (contentType.startsWith('image/')) {
            const b64 = Buffer.from(await upstream.arrayBuffer()).toString('base64');
            return res.status(200).json({ data: [{ b64_json: b64 }] });
          }
        }

        // Fallback to Pollinations' OpenAI-compatible image endpoint.
        target = new URL('/v1/images/generations', url).toString();
        method = 'POST';
        body = JSON.stringify({ model: model || 'flux', prompt, size, n: 1 });
        upstream = await fetch(target, {
          method,
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body
        });
        const text = await upstream.text();
        if (!upstream.ok) {
          return res.status(upstream.status).json({ error: 'Pollinations image generation failed', detail: text.slice(0, 1500) });
        }
        try {
          const json = JSON.parse(text);
          if (json?.data?.[0]?.b64_json || json?.data?.[0]?.url) return res.status(200).json(json);
        } catch {}
        return res.status(502).json({ error: 'Pollinations returned an unexpected image response.', detail: text.slice(0, 1000) });
      }

      target = new URL('/v1/images/generations', url).toString();
      method = 'POST';
      body = JSON.stringify({ model, prompt, size, n: 1 });
    } else {
      target = new URL('/v1/models', url).toString();
    }

    const headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
    if (apiUser) headers['X-API-User'] = apiUser;
    const upstream = await fetch(target, { method, headers, body });
    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    return res.send(text);
  } catch (error) {
    return res.status(502).json({ error: 'AI connection failed', detail: error.message });
  }
}
