/* Cloud sync reliability layer.
 * Keeps the existing Supabase sync implementation, but guarantees that
 * user-added vocabulary is uploaded and re-checked after auth/page restore.
 */
(() => {
  const WAIT = 1200;
  const PERIOD = 5000;
  let lastFingerprint = '';
  let busy = false;

  const getState = () => {
    try {
      return {
        client: typeof sbClient !== 'undefined' ? sbClient : null,
        user: typeof sbUser !== 'undefined' ? sbUser : null,
        list: typeof words !== 'undefined' && Array.isArray(words) ? words : null,
        base: typeof seed !== 'undefined' && Array.isArray(seed) ? seed.length : 0
      };
    } catch (_) { return {client:null,user:null,list:null,base:0}; }
  };

  const customWords = () => {
    const s = getState();
    if (!s.list) return [];
    return s.list.slice(Math.min(s.base, s.list.length)).filter(x => x && String(x.word || '').trim());
  };

  async function uploadAddedWords(force = false) {
    const s = getState();
    if (!s.client || !s.user || !s.user.id || !s.list || busy) return false;
    const rows = customWords().map(d => ({
      user_id: s.user.id,
      word: String(d.word).trim(),
      json_data: {...d, generatedImage: undefined}
    }));
    if (!rows.length) return false;
    const fingerprint = rows.map(r => r.word.toLowerCase() + '|' + JSON.stringify(r.json_data)).join('||');
    if (!force && fingerprint === lastFingerprint) return false;
    busy = true;
    try {
      const {error} = await s.client.from('sb_words').upsert(rows, {onConflict:'user_id,word'});
      if (error) throw error;
      lastFingerprint = fingerprint;
      try { sbLastSync = Date.now(); } catch (_) {}
      try { if (typeof renderAuthPanel === 'function') renderAuthPanel(); } catch (_) {}
      return true;
    } catch (error) {
      console.warn('[Cloud Sync] vocabulary upload failed:', error);
      return false;
    } finally { busy = false; }
  }

  async function refreshFromCloud() {
    const s = getState();
    if (!s.client || !s.user || !s.user.id) return;
    try {
      if (typeof syncFromCloud === 'function') await syncFromCloud();
      try { if (typeof renderAuthPanel === 'function') renderAuthPanel(); } catch (_) {}
    } catch (error) {
      console.warn('[Cloud Sync] refresh failed:', error);
    }
  }

  async function boot() {
    await new Promise(r => setTimeout(r, WAIT));
    // Existing auth/session restoration may finish asynchronously.
    for (let i = 0; i < 12; i++) {
      const s = getState();
      if (s.client && s.user) {
        await refreshFromCloud();
        await uploadAddedWords(true);
        break;
      }
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  window.cloudSyncNow = async function() {
    await refreshFromCloud();
    await uploadAddedWords(true);
    try { if (typeof render === 'function') render(); } catch (_) {}
  };

  // Catch words added after the normal save/debounce path.
  setInterval(async () => {
    const s = getState();
    if (!s.client || !s.user) return;
    await uploadAddedWords(false);
  }, PERIOD);

  window.addEventListener('focus', () => { refreshFromCloud(); });
  window.addEventListener('pageshow', () => { refreshFromCloud(); });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshFromCloud();
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
