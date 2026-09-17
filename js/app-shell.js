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

  function getUserWordCount() {
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

  function updateCloudSyncCount() {
    const count = getUserWordCount();
    const countEl = document.getElementById('cloudSyncCount');
    const totalEl = document.getElementById('cloudTotalCount');
    if (countEl) countEl.textContent = `Synced words: ${count}`;
    if (totalEl) totalEl.textContent = `Total vocabulary: ${count}`;
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
          <div id="cloudSyncCount" class="muted" style="font-size:12px">Synced words: 0</div>
          <div id="cloudTotalCount" class="muted" style="font-size:12px;margin-top:3px">Total vocabulary: 0</div>
          <div id="cloudSyncStatus" class="muted" style="font-size:12px;margin-top:3px">Ready</div>
          <button id="cloudSyncManualBtn" class="btn primary" type="button" style="width:100%;margin-top:8px">☁ Manual Sync</button>
        </div>`;
      auth.parentNode.insertBefore(panel, auth);

      const btn = panel.querySelector('#cloudSyncManualBtn');
      const status = panel.querySelector('#cloudSyncStatus');
      btn.addEventListener('click', async () => {
        if (btn.disabled) return;
        btn.disabled = true;
        btn.textContent = '⟳ Syncing…';
        status.textContent = 'Syncing cloud vocabulary…';
        try {
          if (typeof window.cloudSyncNow !== 'function') throw new Error('Cloud sync is not ready');
          const ok = await window.cloudSyncNow();
          updateCloudSyncCount();
          const count = getUserWordCount();
          status.textContent = ok ? `✓ Sync complete · ${count} words` : '⚠ Sync failed or not signed in';
        } catch (error) {
          status.textContent = `⚠ ${error && error.message ? error.message : 'Sync failed'}`;
        } finally {
          btn.disabled = false;
          btn.textContent = '☁ Manual Sync';
        }
      });
    }

    updateCloudSyncCount();
  }

  function loadCloudReliability() {
    if (window.__cloudSyncReliabilityLoaded) return;
    window.__cloudSyncReliabilityLoaded = true;
    const script = document.createElement('script');
    script.src = '/js/cloud-sync-reliability.js?v=20260917';
    script.async = false;
    script.onload = () => console.info('[Cloud Sync] reliability layer loaded');
    script.onerror = () => console.warn('[Cloud Sync] reliability layer failed to load');
    document.head.appendChild(script);
  }

  function init() {
    markPages();
    syncNav();
    ensureCloudSyncPanel();
    loadCloudReliability();

    // renderAuthPanel() can replace its own contents. Keep the separate sync panel visible.
    setInterval(() => {
      ensureCloudSyncPanel();
      updateCloudSyncCount();
    }, 1000);

    const observer = new MutationObserver(() => {
      markPages();
      syncNav();
      ensureCloudSyncPanel();
    });
    observer.observe(document.body, {subtree:true, childList:true, attributes:true, attributeFilter:['class']});
    window.addEventListener('sp:navigate', () => {
      syncNav();
      ensureCloudSyncPanel();
      updateCloudSyncCount();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();