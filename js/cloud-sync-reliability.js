/* Cloud sync reliability layer — cloud-first vocabulary restore. */
(() => {
  const WAIT = 800;
  const PERIOD = 5000;
  let lastFingerprint = '';
  let busy = false;
  let bootedForUser = '';

  const clientNow = () => {
    try { return typeof sbClient !== 'undefined' ? sbClient : null; }
    catch (_) { return null; }
  };

  const listNow = () => {
    try { return typeof words !== 'undefined' && Array.isArray(words) ? words : null; }
    catch (_) { return null; }
  };

  const seedNow = () => {
    try { return typeof seed !== 'undefined' && Array.isArray(seed) ? seed : []; }
    catch (_) { return []; }
  };

  const normaliseWord = value => String(value || '').trim();
  const wordKey = value => normaliseWord(value).toLowerCase();

  function hiddenSeedSafe() {
    try {
      return typeof hiddenSeed !== 'undefined' && hiddenSeed instanceof Set ? hiddenSeed : new Set();
    } catch (_) { return new Set(); }
  }

  function localUserWords() {
    const list = listNow();
    if (!list) return [];
    const seedKeys = new Set(seedNow().map(x => wordKey(x.word)));
    const hidden = hiddenSeedSafe();
    return list.filter(d => {
      const k = wordKey(d && d.word);
      return k && !seedKeys.has(k) && !hidden.has(k);
    });
  }

  async function currentUser() {
    const client = clientNow();
    if (!client) return null;
    try {
      const {data, error} = await client.auth.getUser();
      if (error) throw error;
      return data && data.user ? data.user : null;
    } catch (error) {
      console.warn('[Cloud Sync] auth.getUser failed:', error);
      return null;
    }
  }

  function applyVocabulary(userWords) {
    const list = listNow();
    const seeds = seedNow();
    if (!list || typeof words === 'undefined') return false;

    const hidden = hiddenSeedSafe();
    const seedWords = seeds.filter(x => !hidden.has(wordKey(x.word)));
    const byKey = new Map();

    // Cloud rows are authoritative when the same word exists remotely.
    (userWords || []).forEach(d => {
      if (!d || !normaliseWord(d.word)) return;
      const copy = {...d, word: normaliseWord(d.word)};
      byKey.set(wordKey(copy.word), copy);
    });

    // Preserve local additions that have not reached the cloud yet.
    localUserWords().forEach(d => {
      const k = wordKey(d.word);
      if (!byKey.has(k)) byKey.set(k, d);
    });

    const merged = [...byKey.values()].filter(d => !hidden.has(wordKey(d.word)));
    words = [...seedWords, ...merged];
    try { baseCount = seedWords.length; } catch (_) {}

    try { localStorage.setItem('sscAIWords', JSON.stringify(merged)); } catch (_) {}

    try { if (typeof render === 'function') render(); } catch (_) {}
    try { if (typeof renderList === 'function') renderList(); } catch (_) {}
    try { if (typeof renderFlashGrid === 'function') renderFlashGrid(); } catch (_) {}
    try { if (typeof updateProgress === 'function') updateProgress(); } catch (_) {}
    try { if (typeof renderAuthPanel === 'function') renderAuthPanel(); } catch (_) {}
    return true;
  }

  async function pullVocabulary(user) {
    const client = clientNow();
    user = user || await currentUser();
    if (!client || !user || !user.id) return {ok:false, count:0};

    const {data, error} = await client
      .from('sb_words')
      .select('word,json_data')
      .eq('user_id', user.id);
    if (error) throw error;

    const remote = (data || []).map(row => {
      const d = row && row.json_data;
      if (!d || typeof d !== 'object') return null;
      return {...d, word: normaliseWord(d.word || row.word)};
    }).filter(d => d && d.word);

    applyVocabulary(remote);
    console.info('[Cloud Sync] pulled vocabulary:', remote.length);
    return {ok:true, count:remote.length};
  }

  async function uploadAddedWords(user, force = false) {
    const client = clientNow();
    user = user || await currentUser();
    if (!client || !user || !user.id || busy) return false;

    const rows = localUserWords().map(d => ({
      user_id: user.id,
      word: normaliseWord(d.word),
      json_data: {...d, generatedImage: undefined}
    })).filter(r => r.word);
    if (!rows.length) return false;

    const fingerprint = rows.map(r => wordKey(r.word) + '|' + JSON.stringify(r.json_data)).sort().join('||');
    if (!force && fingerprint === lastFingerprint) return false;

    busy = true;
    try {
      const {error} = await client.from('sb_words').upsert(rows, {onConflict:'user_id,word'});
      if (error) throw error;
      lastFingerprint = fingerprint;
      try { sbLastSync = Date.now(); } catch (_) {}
      console.info('[Cloud Sync] uploaded vocabulary:', rows.length);
      return true;
    } catch (error) {
      console.error('[Cloud Sync] vocabulary upload failed:', error);
      return false;
    } finally { busy = false; }
  }

  async function refreshFromCloud() {
    const client = clientNow();
    const user = await currentUser();
    if (!client || !user) return false;

    try {
      // Never upload before pulling. A new device must not overwrite cloud data.
      await pullVocabulary(user);

      // Keep the app's other cloud state in sync if that function exists.
      try {
        if (typeof syncFromCloud === 'function') await syncFromCloud();
      } catch (error) {
        console.warn('[Cloud Sync] existing syncFromCloud failed:', error);
      }

      // The existing sync routine can rebuild words[], so pull vocabulary again.
      await pullVocabulary(user);
      return true;
    } catch (error) {
      console.error('[Cloud Sync] refresh failed:', error);
      return false;
    }
  }

  async function boot() {
    await new Promise(r => setTimeout(r, WAIT));
    for (let i = 0; i < 15; i++) {
      const user = await currentUser();
      if (user && user.id) {
        if (bootedForUser !== user.id) {
          bootedForUser = user.id;
          await refreshFromCloud();
          await uploadAddedWords(user, true);
          await pullVocabulary(user);
        }
        return;
      }
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  window.cloudSyncNow = async function() {
    const ok = await refreshFromCloud();
    if (ok) {
      const user = await currentUser();
      await uploadAddedWords(user, true);
      await pullVocabulary(user);
    }
    return ok;
  };

  setInterval(async () => {
    if (busy) return;
    const user = await currentUser();
    if (user) await uploadAddedWords(user, false);
  }, PERIOD);

  window.addEventListener('focus', () => { refreshFromCloud(); });
  window.addEventListener('pageshow', () => { refreshFromCloud(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshFromCloud(); });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
