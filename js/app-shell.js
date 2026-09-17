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
    loadCloudReliability();
    const observer = new MutationObserver(() => {
      markPages();
      syncNav();
    });
    observer.observe(document.body, {subtree:true, childList:true, attributes:true, attributeFilter:['class']});
    window.addEventListener('sp:navigate', syncNav);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
