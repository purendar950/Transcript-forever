/* Cloud sync reliability layer.
 * Makes user vocabulary cloud-first on login/restore and keeps the local
 * vocabulary cache in sync across devices. Built around the existing
 * Supabase client and schema used by app.js.
 */
(() => {
  const WAIT = 1200;
  const PERIOD = 5000;
  let lastFingerprint = '';
  let busy = false;
  let bootedForUser = '';

  const getState = () => {
    try {
      return {
        client: typeof sbClient !== 'undefined' ? sbClient : null,
        user: typeof sbUser !== 'undefined' ? sbUser : null,
        list: typeof words !== 'undefined' && Array.isArray(words) ? words : null,
        seedList: typeof seed !== 'undefined' && Array.isArray(seed) ? seed : []
      };
    } catch (_) {
      return {client:null,user:null,list:null,seedList:[]};
    }
  };

  const normaliseWord = value => String(value || '').trim();
  const wordKey = value => normaliseWord(value).toLowerCase();

  function localUserWords() {
    const s = getState();
    if (!s.list) return [];
    const seedKeys = new Set(s.seedList.map(x => wordKey(x.word)));
    return s.list.filter(d => {
      const k = wordKey(d && d.word);
      return k && !seedKeys.has(k) && !hiddenSeedSafe().has(k);
    });
  }

  function hiddenSeedSafe() {
    try {
      return typeof hiddenSeed !== 'undefined' && hiddenSeed instanceof Set
        ? hiddenSeed
        : new Set();
    } catch (_) { return new Set(); }
  }

  function applyVocabulary(userWords) {
    const s = getState();
    if (!s.list || !s.seedList) return;

    const seedWords = s.seedList.filter(x => !hiddenSeedSafe().has(wordKey(x.word)));
    const byKey = new Map();

    // Cloud data is authoritative for user-added vocabulary.
    (userWords || []).forEach(d => {
      if (!d || !normaliseWord(d.word)) return;
      byKey.set(wordKey(d.word), {...d, word: normaliseWord(d.word)});
    });

    // Preserve any local-only word that has not reached the cloud yet.
    localUserWords().forEach(d => {
      const k = wordKey(d.word);
      if (!byKey.has(k)) byKey.set(k, d);
    });

    const merged = [...byKey.values()].filter(d => !hiddenSeedSafe().has(wordKey(d.word)));
    words = [...seedWords, ...merged];
    baseCount = seedWords.length;

    try {
      localStorage.setItem('sscAIWords', JSON.stringify(merged));
    } catch (_) {}

    try {
      if (typeof refreshCurrentWordViews === 'function') refreshCurrentWordViews();
      if (typeof render === 'function') render();
      if (typeof renderList === 'function') renderList();
      if (typeof renderFlashGrid === 'function') renderFlashGrid();
      if (typeof updateProgress === 'function') updateProgress();
    } catch (_) {}
  }

  async function pullVocabulary() {
    const s = getState();
    if (!s.client || !s.user || !s.user.id) return {ok:false, count:0};

    const {data, error} = await s.client
      .from('sb_words')
      .select('word,json_data')
      .eq('user_id', s.user.id);

    if (error) throw error;

    const remote = (data || [])
      .map(row => {
        const d = row && row.json_data;
        if (!d || typeof d !== 'object') return null;
        return {...d, word: normaliseWord(d.word || row.word)};
      })
      .filter(d => d && d.word);

    applyVocabulary(remote);
    return {ok:true, count:remote.length};
  }

  function customWords() {
    return localUserWords();
  }

  async function uploadAddedWords(force = false) {
    const s = getState();
    if (!s.client || !s.user || !s.user.id || busy) return false;

    const rows = customWords().map(d => ({
      user_id: s.user.id,
      word: normaliseWord(d.word),
      json_data: {...d, generatedImage: undefined}
    })).filter(r => r.word);

    if (!rows.length) return false;

    const fingerprint = rows
      .map(r => wordKey(r.word) + '|' + JSON.stringify(r.json_data))
      .sort()
      .join('||');

    if (!force && fingerprint === lastFingerprint) return false;

    busy = true;
    try {
      const {error} = await s.client
        .from('sb_words')
        .upsert(rows, {onConflict:'user_id,word'});
      if (error) throw error;
      lastFingerprint = fingerprint;
      try { sbLastSync = Date.now(); } catch (_) {}
      try { if (typeof renderAuthPanel === 'function') renderAuthPanel(); } catch (_) {}
      return true;
    } catch (error) {
      console.warn('[Cloud Sync] vocabulary upload failed:', error);
      return false;
    } finally {
      busy = false;
    }
  }

  async function refreshFromCloud() {
    const s = getState();
    if (!s.client || !s.user || !s.user.id) return false;

    try {
      // Pull first. This prevents an empty/new device from overwriting or
      // hiding the vocabulary already stored in the account.
      await pullVocabulary();

      // Also use the existing sync routine for providers/progress/history.
      if (typeof syncFromCloud === 'function') {
        await syncFromCloud();
      }

      // syncFromCloud may rebuild words[]; make one final authoritative
      // vocabulary pull so the remote vocabulary is definitely present.
      await pullVocabulary();
      try { if (typeof renderAuthPanel === 'function') renderAuthPanel(); } catch (_) {}
      return true;
    } catch (error) {
      console.warn('[Cloud Sync] refresh failed:', error);
      return false;
    }
  }

  async function boot() {
    await new Promise(r => setTimeout(r, WAIT));

    for (let i = 0; i < 12; i++) {
      const s = getState();
      if (s.client && s.user && s.user.id) {
        const userChanged = bootedForUser !== s.user.id;
        if (userChanged) {
          bootedForUser = s.user.id;
          await refreshFromCloud();
          // Upload only after the remote pull/merge. This preserves words
          // created offline on this device while still restoring cloud data.
          await uploadAddedWords(true);
          await pullVocabulary();
        }
        break;
      }
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  window.cloudSyncNow = async function() {
    const ok = await refreshFromCloud();
    if (ok) {
      await uploadAddedWords(true);
      await pullVocabulary();
    }
    try { if (typeof render === 'function') render(); } catch (_) {}
    return ok;
  };

  // Catch words added after the normal save/debounce path and restore cloud
  // vocabulary if the app was resumed in another tab/device.
  setInterval(async () => {
    const s = getState();
    if (!s.client || !s.user || !s.user.id || busy) return;
    await uploadAddedWords(false);
  }, PERIOD);

  window.addEventListener('focus', () => { refreshFromCloud(); });
  window.addEventListener('pageshow', () => { refreshFromCloud(); });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshFromCloud();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, {once:true});
  } else {
    boot();
  }
})();
