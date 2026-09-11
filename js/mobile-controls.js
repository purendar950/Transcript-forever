/* StudyPlanner — mobile control grouping
   Finds the Dashboard filter groups by their visible button labels so the
   layout stays stable even if the surrounding HTML structure changes. */
(() => {
  const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();

  function findButton(label, used = new Set()) {
    return Array.from(document.querySelectorAll('button')).find((button) => {
      if (used.has(button)) return false;
      return clean(button.textContent) === label;
    }) || null;
  }

  function findGroup(uniqueLabels) {
    const buttons = uniqueLabels.map((label) => findButton(label)).filter(Boolean);
    if (buttons.length !== uniqueLabels.length) return null;

    let root = buttons[0].parentElement;
    while (root && root !== document.body) {
      const textButtons = Array.from(root.querySelectorAll('button')).map((b) => clean(b.textContent));
      if (uniqueLabels.every((label) => textButtons.includes(label))) return root;
      root = root.parentElement;
    }
    return null;
  }

  function markGroups() {
    const category = findGroup(['Vocabulary', 'Idiom', 'Phrasal Verb', 'OWS', 'Confusing']);
    if (category) category.classList.add('sp-mobile-single-row', 'sp-category-row');

    const status = findGroup(['✓ Remember', '✗ Not Remember', '○ Not Seen']);
    if (status) status.classList.add('sp-mobile-single-row', 'sp-status-row');
  }

  function start() {
    markGroups();
    const observer = new MutationObserver(markGroups);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
