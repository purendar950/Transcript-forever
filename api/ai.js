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
    const blocked = /^(localhost|127\\.|0\\.|10\\.|192\\.168\\.|172\\.(1[6-9]|2\\d|3[0-1])\\.|169\\.254\\.|::1$)/.test(host);
    if (blocked || host.endsWith('.local') || host.endsWith('.internal')) return res.status(400).json({ error: 'Private/local endpoints are not allowed.' });

    let target;
    let method = 'GET';
    let body;
    if (action === 'chat') {
      target = new URL('/v1/chat/completions', url).toString();
      method = 'POST';
      body = JSON.stringify({ model, messages: messages || [{ role: 'user', content: 'Reply with OK only.' }], max_tokens: 2400 });
    } else if (action === 'image') {
      // Pollinations' native image route returns the actual image bytes.
      // Use it for reliability, then convert the result to b64_json for the frontend.
      if (host === 'gen.pollinations.ai') {
        const nativeUrl = new URL('/image/' + encodeURIComponent(prompt || 'educational vocabulary illustration'), url);
        nativeUrl.searchParams.set('model', model);
        if (size) nativeUrl.searchParams.set('width', String(Number((size.split('x')[0] || 1024))));
        if (size) nativeUrl.searchParams.set('height', String(Number((size.split('x')[1] || 1024))));
        target = nativeUrl.toString();
        method = 'GET';
        const upstream = await fetch(target, { method, headers: { Authorization: `Bearer ${apiKey}` } });
        const contentType = upstream.headers.get('content-type') || '';
        if (!upstream.ok) {
          const errorText = await upstream.text();
          return res.status(upstream.status).json({ error: errorText || 'Pollinations image generation failed' });
        }
        if (!contentType.startsWith('image/')) {
          const errorText = await upstream.text();
          return res.status(502).json({ error: errorText || 'Pollinations did not return an image.' });
        }
        const bytes = new Uint8Array(await upstream.arrayBuffer());
        let binary = '';
        const chunk = 0x8000;
        for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
        const b64 = Buffer.from(binary, 'binary').toString('base64');
        return res.status(200).json({ data: [{ b64_json: b64 }] });
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
