export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { baseUrl, apiKey, apiUser, action = 'models', model, messages, prompt, size = '1024x1024' } = req.body || {};
    const cleanBaseUrl = String(baseUrl || '').trim();
    const cleanApiKey = String(apiKey || '').trim();
    if (!cleanBaseUrl || !cleanApiKey) return res.status(400).json({ error: 'baseUrl and apiKey are required' });

    const url = new URL(cleanBaseUrl);
    if (url.protocol !== 'https:') return res.status(400).json({ error: 'HTTPS is required' });
    const host = url.hostname.toLowerCase();
    const blocked = /^(localhost|127\.|0\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|169\.254\.|::1$)/.test(host);
    if (blocked || host.endsWith('.local') || host.endsWith('.internal')) return res.status(400).json({ error: 'Private/local endpoints are not allowed.' });

    // The Model field may contain one model or several comma/newline-separated models.
    // When several are supplied, try them in order so one unavailable model does not
    // make the whole provider fail.
    const models = String(model || '')
      .split(/[\n,]+/)
      .map(x => x.trim())
      .filter(Boolean);

    if ((action === 'chat' || action === 'image') && !models.length) {
      return res.status(400).json({ error: `${action === 'image' ? 'Image' : 'Text'} model is required.` });
    }

    if (action === 'image' && host === 'gen.pollinations.ai') {
      const cleanPrompt = String(prompt || 'educational vocabulary illustration');
      const parts = String(size || '1024x1024').split('x').map(Number);
      let lastError = 'Image generation failed.';

      for (const currentModel of models) {
        try {
          const nativeUrl = new URL('/image/' + encodeURIComponent(cleanPrompt), url.origin);
          nativeUrl.searchParams.set('model', currentModel);
          if (Number.isFinite(parts[0]) && parts[0] > 0) nativeUrl.searchParams.set('width', String(parts[0]));
          if (Number.isFinite(parts[1]) && parts[1] > 0) nativeUrl.searchParams.set('height', String(parts[1]));

          let upstream = await fetch(nativeUrl.toString(), {
            method: 'GET',
            headers: { Authorization: `Bearer ${cleanApiKey}`, Accept: 'image/*' }
          });

          if (!upstream.ok && (upstream.status === 401 || upstream.status === 403)) {
            const retryUrl = new URL(nativeUrl.toString());
            retryUrl.searchParams.set('key', cleanApiKey);
            upstream = await fetch(retryUrl.toString(), { method: 'GET', headers: { Accept: 'image/*' } });
          }

          const contentType = upstream.headers.get('content-type') || '';
          if (upstream.ok && contentType.toLowerCase().startsWith('image/')) {
            const bytes = new Uint8Array(await upstream.arrayBuffer());
            const b64 = Buffer.from(bytes).toString('base64');
            return res.status(200).json({ data: [{ b64_json: b64, mime_type: contentType.split(';')[0] || 'image/png', model: currentModel }] });
          }

          const errorText = await upstream.text();
          lastError = `${currentModel}: ${errorText || `HTTP ${upstream.status}`}`;
        } catch (e) {
          lastError = `${currentModel}: ${e?.message || String(e)}`;
        }
      }

      return res.status(502).json({
        error: 'Pollinations image generation failed for all configured image models.',
        detail: lastError,
        attemptedModels: models
      });
    }

    const headers = { Authorization: `Bearer ${cleanApiKey}`, 'Content-Type': 'application/json' };
    if (apiUser) headers['X-API-User'] = apiUser;

    if (action === 'chat') {
      let lastStatus = 502;
      let lastError = 'Text AI request failed.';
      for (const currentModel of models) {
        const target = new URL('/v1/chat/completions', url).toString();
        const body = JSON.stringify({
          model: currentModel,
          messages: messages || [{ role: 'user', content: 'Reply with OK only.' }],
          max_tokens: 2400
        });
        try {
          const upstream = await fetch(target, { method: 'POST', headers, body });
          const text = await upstream.text();
          if (upstream.ok) {
            res.status(upstream.status);
            res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
            return res.send(text);
          }
          lastStatus = upstream.status;
          lastError = `${currentModel}: ${text || `HTTP ${upstream.status}`}`;
        } catch (e) {
          lastStatus = 502;
          lastError = `${currentModel}: ${e?.message || String(e)}`;
        }
      }
      return res.status(lastStatus).json({
        error: 'Text AI request failed for all configured models.',
        detail: lastError,
        attemptedModels: models
      });
    }

    if (action === 'image') {
      let lastStatus = 502;
      let lastError = 'Image generation failed.';
      for (const currentModel of models) {
        const target = new URL('/v1/images/generations', url).toString();
        const body = JSON.stringify({ model: currentModel, prompt, size, n: 1 });
        try {
          const upstream = await fetch(target, { method: 'POST', headers, body });
          const text = await upstream.text();
          if (upstream.ok) {
            res.status(upstream.status);
            res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
            return res.send(text);
          }
          lastStatus = upstream.status;
          lastError = `${currentModel}: ${text || `HTTP ${upstream.status}`}`;
        } catch (e) {
          lastStatus = 502;
          lastError = `${currentModel}: ${e?.message || String(e)}`;
        }
      }
      return res.status(lastStatus).json({
        error: 'Image generation failed for all configured models.',
        detail: lastError,
        attemptedModels: models
      });
    }

    const target = new URL('/v1/models', url).toString();
    const upstream = await fetch(target, { method: 'GET', headers });
    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    return res.send(text);
  } catch (error) {
    return res.status(502).json({ error: 'AI connection failed', detail: error?.message || String(error) });
  }
}
