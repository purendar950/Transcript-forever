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
    const statusEl = document.getElementById('cloudSyncStatus');
    const stateEl = document.getElementById('cloudSyncState');
    if (!countEl || !statusEl) return;

    const state = getSyncState();
    const localCount = Number.isFinite(state.localWords) ? state.localWords : getLocalWordCount();
    const cloudCount = Number.isFinite(state.cloudWords) ? state.cloudWords : 0;
    const mode = state.state || 'idle';

    countEl.textContent = `☁ ${cloudCount} cloud · ${localCount} local`;
    if (mode === 'synced') statusEl.textContent = `✓ Synced · ${cloudCount} words`;
    else if (mode === 'syncing') statusEl.textContent = '⟳ Syncing…';
    else if (mode === 'downloaded') statusEl.textContent = `✓ Downloaded · ${cloudCount} words`;
    else if (mode === 'upload-error') statusEl.textContent = `⚠ ${state.error || 'Upload failed'}`;
    else if (mode === 'download-error') statusEl.textContent = `⚠ ${state.error || 'Download failed'}`;
    else if (mode === 'auth-error') statusEl.textContent = `⚠ ${state.error || 'Authentication required'}`;
    else statusEl.textContent = 'Ready';

    if (stateEl) stateEl.textContent = mode === 'synced' ? 'Synced' : mode === 'syncing' ? 'Syncing' : 'Cloud';
  }

  function installCompactStyles() {
    if (document.getElementById('spCompactSidebarStyles')) return;
    const style = document.createElement('style');
    style.id = 'spCompactSidebarStyles';
    style.textContent = `
      #cloudSyncPanel.sp-compact-cloud{margin:8px 0 0!important;padding:9px!important;border:1px solid rgba(255,255,255,.12);border-radius:14px;background:linear-gradient(145deg,rgba(18,31,59,.98),rgba(42,20,82,.94));box-shadow:0 7px 20px rgba(0,0,0,.16);max-height:285px;overflow-y:auto;scrollbar-width:thin}
      #cloudSyncPanel .sp-cloud-head{display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:5px}
      #cloudSyncPanel .sp-cloud-title{font-size:12px;font-weight:800}
      #cloudSyncPanel .sp-cloud-state{font-size:9px;padding:2px 6px;border-radius:999px;background:rgba(255,255,255,.09);white-space:nowrap}
      #cloudSyncPanel .sp-cloud-count{font-size:10px;opacity:.78;margin-bottom:3px}
      #cloudSyncPanel .sp-cloud-status{font-size:9px;opacity:.72;min-height:12px;margin-bottom:5px;overflow-wrap:anywhere}
      #cloudSyncPanel #cloudSyncManualBtn{width:100%;min-height:32px!important;height:32px;padding:5px 8px!important;margin:0!important;font-size:11px;border-radius:9px}
      #cloudSyncPanel .sp-divider{height:1px;background:rgba(255,255,255,.10);margin:7px 0}
      #cloudSyncPanel .sp-slot{min-width:0}
      #cloudSyncPanel .sp-slot .goal{margin:0!important;padding:0!important;border:0!important;box-shadow:none!important;background:transparent!important}
      #cloudSyncPanel .sp-slot .goal h4{font-size:11px;margin:0 0 4px}
      #cloudSyncPanel .sp-slot .goalrow{gap:6px}
      #cloudSyncPanel .sp-slot .goal .ring{width:34px;height:34px}
      #cloudSyncPanel .sp-slot .goal .ring b{font-size:9px}
      #cloudSyncPanel .sp-slot .goal .outline{min-height:27px!important;padding:4px 7px!important;margin-top:5px;font-size:10px}
      #cloudSyncPanel .sp-slot #authPanel{margin:0!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important}
      #cloudSyncPanel .sp-slot #authPanel>*{margin:0!important}
      #cloudSyncPanel .sp-slot #authPanel .card{padding:0!important;background:transparent!important;border:0!important;box-shadow:none!important}
      #cloudSyncPanel .sp-slot #authPanel button{min-height:29px!important;padding:5px 7px!important;font-size:10px!important}
      @media(max-width:768px){#cloudSyncPanel.sp-compact-cloud{max-height:255px;margin-top:7px!important;padding:8px!important}}
    `;
    document.head.appendChild(style);
  }

  function ensureCloudSyncPanel() {
    const sidebar = document.querySelector('.sidebar');
    const nav = sidebar && sidebar.querySelector('.nav');
    const goal = sidebar && sidebar.querySelector('.goal');
    const auth = document.getElementById('authPanel');
    if (!sidebar || !nav || !auth) return;

    installCompactStyles();

    let panel = document.getElementById('cloudSyncPanel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'cloudSyncPanel';
      panel.className = 'sp-compact-cloud';
      panel.innerHTML = `
        <div class="sp-cloud-head"><span class="sp-cloud-title">☁ Cloud Sync</span><span class="sp-cloud-state" id="cloudSyncState">Cloud</span></div>
        <div id="cloudSyncCount" class="sp-cloud-count">☁ 0 cloud · 0 local</div>
        <div id="cloudSyncStatus" class="sp-cloud-status">Ready</div>
        <button id="cloudSyncManualBtn" class="btn primary" type="button">☁ Manual Sync</button>
        <div class="sp-divider"></div>
        <div class="sp-slot" id="spAccountSlot"></div>
        <div class="sp-divider"></div>
        <div class="sp-slot" id="spGoalSlot"></div>`;
      // Place the combined card AFTER the complete navigation menu.
      nav.insertAdjacentElement('afterend', panel);

      const btn = panel.querySelector('#cloudSyncManualBtn');
      btn.addEventListener('click', async () => {
        if (btn.disabled) return;
        const status = panel.querySelector('#cloudSyncStatus');
        btn.disabled = true;
        btn.textContent = '⟳ Syncing…';
        status.textContent = 'Connecting…';
        try {
          if (typeof window.cloudSyncNow !== 'function') throw new Error('Cloud sync module is not loaded');
          const ok = await window.cloudSyncNow();
          updateCloudSyncPanel();
          if (!ok && (!window.cloudSyncStatus || !window.cloudSyncStatus.error)) status.textContent = '⚠ Sync did not complete';
        } catch (error) {
          status.textContent = `⚠ ${error && error.message ? error.message : 'Sync failed'}`;
        } finally {
          btn.disabled = false;
          btn.textContent = '☁ Manual Sync';
        }
      });
    }

    const accountSlot = panel.querySelector('#spAccountSlot');
    const goalSlot = panel.querySelector('#spGoalSlot');
    if (accountSlot && auth.parentNode !== accountSlot) accountSlot.appendChild(auth);
    if (goalSlot && goal && goal.parentNode !== goalSlot) goalSlot.appendChild(goal);

    updateCloudSyncPanel();
  }

  function loadCloudReliability() {
    if (window.__cloudSyncReliabilityLoaded) return;
    window.__cloudSyncReliabilityLoaded = true;
    const script = document.createElement('script');
    script.src = '/js/cloud-sync-reliability.js?v=20260917-3';
    script.async = false;
    script.onload = () => {
      console.info('[Cloud Sync] reliability layer loaded');
      loadCloudVocabDirect();
    };
    script.onerror = () => {
      console.warn('[Cloud Sync] reliability layer failed to load');
      const status = document.getElementById('cloudSyncStatus');
      if (status) status.textContent = '⚠ Cloud sync module failed to load';
    };
    document.head.appendChild(script);
  }

  function loadCloudVocabDirect() {
    if (window.__cloudVocabDirectLoaded) return;
    const script = document.createElement('script');
    script.src = '/js/cloud-vocab-direct.js?v=20260917-2';
    script.async = false;
    script.onload = () => console.info('[Cloud Vocab] cloud-first storage layer loaded');
    script.onerror = () => console.warn('[Cloud Vocab] cloud-first storage layer failed to load');
    document.head.appendChild(script);
  }

  function init() {
    markPages();
    syncNav();
    ensureCloudSyncPanel();
    loadCloudReliability();

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