/* Dashboard module: owns the Dashboard study-card surface only. */
(() => {
  function init() {
    const page = document.getElementById('dashboard');
    if (!page) return;
    page.dataset.module = 'dashboard';
    const card = page.querySelector('#flipcard');
    if (!card) return;
    card.setAttribute('aria-label', 'Dashboard vocabulary study card. Click to flip.');
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
