/* Flashcards module: owns the Flashcards library/grid, not the Dashboard study card. */
(() => {
  function init() {
    const page = document.getElementById('flash');
    if (!page) return;
    page.dataset.module = 'flashcards';
    const search = page.querySelector('#flashSearch');
    const grid = page.querySelector('#flashGrid');
    if (!search || !grid) return;
    search.setAttribute('aria-label', 'Search flashcards');
    search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      grid.querySelectorAll('.wordItem').forEach(item => {
        item.hidden = q && !(item.textContent || '').toLowerCase().includes(q);
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
