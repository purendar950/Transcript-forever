export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { baseUrl, apiKey, apiUser, action = 'models', model, messages } = req.body || {};
    if (!baseUrl || !apiKey) return res.status(400).json({ error: 'baseUrl and apiKey are required' });

    const url = new URL(baseUrl);
    if (url.protocol !== 'https:') return res.status(400).json({ error: 'HTTPS is required' });
    const allowedHosts = new Set(['router.bynara.id', 'api.openai.com']);
    if (!allowedHosts.has(url.hostname)) {
      return res.status(400).json({ error: 'This app currently supports NaraRouter and OpenAI endpoints.' });
    }

    let target;
    let body;
    if (action === 'chat') {
      target = new URL('/v1/chat/completions', url).toString();
      body = JSON.stringify({
        model,
        messages: messages || [{ role: 'user', content: 'Reply with OK only.' }],
        max_tokens: 8
      });
    } else {
      target = new URL('/v1/models', url).toString();
    }

    const headers = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };
    if (apiUser) headers['X-API-User'] = apiUser;

    const upstream = await fetch(target, { method: action === 'chat' ? 'POST' : 'GET', headers, body });
    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    return res.send(text);
  } catch (error) {
    return res.status(502).json({ error: 'AI connection failed', detail: error.message });
  }
}
