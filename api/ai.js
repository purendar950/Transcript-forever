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
