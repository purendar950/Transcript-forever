/* Cloud sync reliability layer — cloud-first vocabulary restore. */
(() => {
  const WAIT = 800;
  const PERIOD = 5000;
  const TIMEOUT = 12000;
  let lastFingerprint = '';
  let busy = false;
  let bootedForUser = '';

  window.cloudSyncStatus = window.cloudSyncStatus || {
    state: 'idle', localWords: 0, cloudWords: 0, lastSync: 0, error: ''
  };

  const setStatus = (state, extra = {}) => {
    window.cloudSyncStatus = {...window.cloudSyncStatus, state, ...extra};
  };

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

  function updateLocalStatus() {
    try { window.cloudSyncStatus.localWords = localUserWords().length; } catch (_) {}
  }

  async function withTimeout(promise, label) {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(label + ' timed out')), TIMEOUT);
    });
    try { return await Promise.race([promise, timeout]); }
    finally { clearTimeout(timer); }
  }

  async function currentUser() {
    const client = clientNow();
    if (!client) return null;
    try {
      // getSession reads the persisted session immediately and avoids treating a
      // temporary auth/network delay as a signed-out user.
      const sessionResult = await withTimeout(client.auth.getSession(), 'Authentication');
      const sessionUser = sessionResult && sessionResult.data && sessionResult.data.session
        ? sessionResult.data.session.user : null;
      if (sessionUser && sessionUser.id) return sessionUser;

      const result = await withTimeout(client.auth.getUser(), 'Authentication');
      if (result.error) throw result.error;
      return result.data && result.data.user ? result.data.user : null;
    } catch (error) {
      setStatus('auth-error', {error: error && error.message ? error.message : 'Authentication failed'});
      console.warn('[Cloud Sync] auth failed:', error);
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
    try { window.cloudSyncStatus.localWords = merged.length; } catch (_) {}

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
    if (!client) throw new Error('Supabase client is not ready');
    if (!user || !user.id) throw new Error('No active signed-in session');

    const result = await withTimeout(
      client.from('sb_words').select('word,json_data').eq('user_id', user.id),
      'Cloud download'
    );
    if (result.error) throw result.error;

    const remote = (result.data || []).map(row => {
      const d = row && row.json_data;
      if (!d || typeof d !== 'object') return null;
      return {...d, word: normaliseWord(d.word || row.word)};
    }).filter(d => d && d.word);

    applyVocabulary(remote);
    setStatus('downloaded', {cloudWords: remote.length, error: ''});
    console.info('[Cloud Sync] pulled vocabulary:', remote.length);
    return {ok:true, count:remote.length};
  }

  async function uploadAddedWords(user, force = false) {
    const client = clientNow();
    user = user || await currentUser();
    if (!client) throw new Error('Supabase client is not ready');
    if (!user || !user.id) throw new Error('No active signed-in session');
    if (busy) return {ok:false, skipped:true};

    const rows = localUserWords().map(d => ({
      user_id: user.id,
      word: normaliseWord(d.word),
      json_data: {...d, generatedImage: undefined}
    })).filter(r => r.word);
    if (!rows.length) return {ok:true, count:0};

    const fingerprint = rows.map(r => wordKey(r.word) + '|' + JSON.stringify(r.json_data)).sort().join('||');
    if (!force && fingerprint === lastFingerprint) return {ok:true, count:rows.length, skipped:true};

    busy = true;
    try {
      const result = await withTimeout(
        client.from('sb_words').upsert(rows, {onConflict:'user_id,word'}),
        'Cloud upload'
      );
      if (result.error) throw result.error;
      lastFingerprint = fingerprint;
      try { sbLastSync = Date.now(); } catch (_) {}
      console.info('[Cloud Sync] uploaded vocabulary:', rows.length);
      return {ok:true, count:rows.length};
    } catch (error) {
      const message = error && error.message ? error.message : 'Cloud upload failed';
      console.error('[Cloud Sync] vocabulary upload failed:', error);
      setStatus('upload-error', {error: message});
      return {ok:false, count:0, error:message};
    } finally { busy = false; }
  }

  async function refreshFromCloud() {
    updateLocalStatus();
    const client = clientNow();
    if (!client) {
      setStatus('client-error', {error:'Supabase client is not ready'});
      return false;
    }
    const user = await currentUser();
    if (!user) return false;

    setStatus('syncing', {error:''});
    try {
      // Always download first so a new device never overwrites cloud data.
      await pullVocabulary(user);
      return true;
    } catch (error) {
      const message = error && error.message ? error.message : 'Cloud download failed';
      setStatus('download-error', {error:message});
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
          const uploaded = await uploadAddedWords(user, true).catch(error => ({ok:false,error:error.message}));
          if (uploaded && uploaded.ok) await pullVocabulary(user).catch(() => {});
        }
        return;
      }
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  window.cloudSyncNow = async function() {
    if (busy) return false;
    setStatus('syncing', {error:''});
    const user = await currentUser();
    if (!user) return false;

    try {
      // Pull first, upload the merged local vocabulary, then pull again to verify.
      await pullVocabulary(user);
      const uploaded = await uploadAddedWords(user, true);
      if (!uploaded.ok) return false;
      await pullVocabulary(user);
      setStatus('synced', {lastSync:Date.now(), error:''});
      updateLocalStatus();
      return true;
    } catch (error) {
      const message = error && error.message ? error.message : 'Sync failed';
      setStatus('error', {error:message});
      console.error('[Cloud Sync] manual sync failed:', error);
      return false;
    }
  };

  setInterval(async () => {
    if (busy) return;
    const user = await currentUser();
    if (user) {
      const result = await uploadAddedWords(user, false).catch(error => ({ok:false,error:error.message}));
      if (result && result.ok) updateLocalStatus();
    }
  }, PERIOD);

  window.addEventListener('focus', () => { refreshFromCloud(); });
  window.addEventListener('pageshow', () => { refreshFromCloud(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshFromCloud(); });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();