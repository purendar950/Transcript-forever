/* Global app coordinator. Page-specific behavior lives in separate modules. */
(() => {
  const modules = {
    dashboard: 'dashboard',
    flash: 'flashcards',
    vocab: 'vocabulary',
    practice: 'practice',
    quiz: 'quiz',
    progress: 'progress',
    settings: 'settings'
  };

  function markPages() {
    Object.entries(modules).forEach(([id, name]) => {
      const page = document.getElementById(id);
      if (page) page.dataset.module = name;
    });
  }

  function syncNav() {
    const active = document.querySelector('.page.active');
    if (!active) return;
    document.querySelectorAll('.sidebar .nav button').forEach(btn => {
      const text = (btn.textContent || '').trim().toLowerCase();
      const id = active.id;
      const map = {
        dashboard: 'dashboard', flash: 'flashcards', vocab: 'my vocabulary',
        practice: 'practice', quiz: 'ai quiz', progress: 'view progress', settings: 'ai settings'
      };
      const label = map[id];
      if (label) btn.classList.toggle('active', text.includes(label));
    });
  }

  function getLocalWordCount() {
    try {
      if (typeof words === 'undefined' || !Array.isArray(words)) return 0;
      const seeds = typeof seed !== 'undefined' && Array.isArray(seed) ? seed : [];
      const hidden = typeof hiddenSeed !== 'undefined' && hiddenSeed instanceof Set ? hiddenSeed : new Set();
      const seedKeys = new Set(seeds.map(x => String(x && x.word || '').trim().toLowerCase()));
      return words.filter(x => {
        const w = String(x && x.word || '').trim();
        return w && !seedKeys.has(w.toLowerCase()) && !hidden.has(w.toLowerCase());
      }).length;
    } catch (_) { return 0; }
  }

  function getSyncState() {
    try { return window.cloudSyncStatus || {}; } catch (_) { return {}; }
  }

  function updateCloudSyncPanel() {
    const countEl = document.getElementById('cloudSyncCount');
    const totalEl = document.getElementById('cloudTotalCount');
    const statusEl = document.getElementById('cloudSyncStatus');
    if (!countEl || !totalEl || !statusEl) return;

    const state = getSyncState();
    const localCount = Number.isFinite(state.localWords) ? state.localWords : getLocalWordCount();
    const cloudCount = Number.isFinite(state.cloudWords) ? state.cloudWords : 0;
    const mode = state.state || 'idle';

    countEl.textContent = `Cloud synced words: ${cloudCount}`;
    totalEl.textContent = `Local vocabulary: ${localCount}`;

    if (mode === 'synced') statusEl.textContent = `✓ Cloud sync complete · ${cloudCount} words`;
    else if (mode === 'syncing') statusEl.textContent = '⟳ Syncing with cloud…';
    else if (mode === 'downloaded') statusEl.textContent = `✓ Cloud downloaded · ${cloudCount} words`;
    else if (mode === 'upload-error') statusEl.textContent = `⚠ Upload failed: ${state.error || 'database rejected the update'}`;
    else if (mode === 'download-error') statusEl.textContent = `⚠ Download failed: ${state.error || 'cannot read cloud data'}`;
    else if (mode === 'auth-error') statusEl.textContent = `⚠ Authentication: ${state.error || 'session unavailable'}`;
    else if (mode === 'client-error') statusEl.textContent = `⚠ ${state.error || 'Supabase client not ready'}`;
    else if (mode === 'error') statusEl.textContent = `⚠ ${state.error || 'Sync failed'}`;
    else statusEl.textContent = 'Ready to sync';
  }

  function ensureCloudSyncPanel() {
    const auth = document.getElementById('authPanel');
    if (!auth || !auth.parentNode) return;

    let panel = document.getElementById('cloudSyncPanel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'cloudSyncPanel';
      panel.style.marginTop = '12px';
      panel.innerHTML = `
        <div class="card" style="padding:12px">
          <div style="font-weight:700;margin-bottom:6px">☁ Cloud Vocabulary</div>
          <div id="cloudSyncCount" class="muted" style="font-size:12px">Cloud synced words: 0</div>
          <div id="cloudTotalCount" class="muted" style="font-size:12px;margin-top:3px">Local vocabulary: 0</div>
          <div id="cloudSyncStatus" class="muted" style="font-size:12px;margin-top:3px">Ready to sync</div>
          <button id="cloudSyncManualBtn" class="btn primary" type="button" style="width:100%;margin-top:8px">☁ Manual Sync</button>
        </div>`;
      auth.parentNode.insertBefore(panel, auth);

      const btn = panel.querySelector('#cloudSyncManualBtn');
      btn.addEventListener('click', async () => {
        if (btn.disabled) return;
        const status = panel.querySelector('#cloudSyncStatus');
        btn.disabled = true;
        btn.textContent = '⟳ Syncing…';
        status.textContent = 'Connecting to cloud…';
        try {
          if (typeof window.cloudSyncNow !== 'function') throw new Error('Cloud sync module is not loaded');
          const ok = await window.cloudSyncNow();
          updateCloudSyncPanel();
          if (!ok && (!window.cloudSyncStatus || !window.cloudSyncStatus.error)) {
            status.textContent = '⚠ Sync did not complete. Check your connection and Supabase session.';
          }
        } catch (error) {
          status.textContent = `⚠ ${error && error.message ? error.message : 'Sync failed'}`;
        } finally {
          btn.disabled = false;
          btn.textContent = '☁ Manual Sync';
        }
      });
    }

    updateCloudSyncPanel();
  }

  function loadCloudReliability() {
    if (window.__cloudSyncReliabilityLoaded) return;
    window.__cloudSyncReliabilityLoaded = true;
    const script = document.createElement('script');
    script.src = '/js/cloud-sync-reliability.js?v=20260917-2';
    script.async = false;
    script.onload = () => console.info('[Cloud Sync] reliability layer loaded');
    script.onerror = () => {
      console.warn('[Cloud Sync] reliability layer failed to load');
      const status = document.getElementById('cloudSyncStatus');
      if (status) status.textContent = '⚠ Cloud sync module failed to load';
    };
    document.head.appendChild(script);
  }

  function init() {
    markPages();
    syncNav();
    ensureCloudSyncPanel();
    loadCloudReliability();

    // Lightweight refresh only; no document-wide MutationObserver.
    setInterval(() => {
      ensureCloudSyncPanel();
      updateCloudSyncPanel();
    }, 3000);

    window.addEventListener('sp:navigate', () => {
      syncNav();
      ensureCloudSyncPanel();
      updateCloudSyncPanel();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();