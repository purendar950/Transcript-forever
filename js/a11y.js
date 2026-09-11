/*
 * A11y + interaction polish module.
 *
 * 1. Modal accessibility: for every app modal (.modal) —
 *    - role="dialog" + aria-modal="true"
 *    - focus moved into the dialog on open, restored to the trigger on close
 *    - Tab / Shift+Tab trapped inside while open
 *    - Escape closes (mapped to the app's existing close functions)
 *    - body scroll locked while a modal is open
 * 2. prefers-reduced-motion: disables non-essential animation/transitions.
 * 3. Devanagari typography: explicit font stack for Hindi + pronunciation.
 * 4. Toast stacking: rapid toasts no longer overwrite each other (wraps the
 *    global toast() — callers are unaffected).
 * 5. aria-live regions on status lines + toasts.
 */
(() => {
  // ------------------------------------------------------------ styles
  const CSS = `
body.sp-modal-open{overflow:hidden!important}
#spToasts{position:fixed;right:20px;top:20px;z-index:200;display:grid;gap:8px;pointer-events:none}
#spToasts .toast{position:static;display:block;animation:spToastIn .18s ease}
@keyframes spToastIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
#hindi,.pronDeva{font-family:'Noto Sans Devanagari','Nirmala UI','Mangal','Noto Sans',system-ui,sans-serif}
@media (prefers-reduced-motion: reduce){
  *,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important}
}
`;

  function injectStyles() {
    if (document.getElementById('sp-a11y-styles')) return;
    const st = document.createElement('style');
    st.id = 'sp-a11y-styles';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  // ------------------------------------------------------------ modals
  const MODALS = [
    { id: 'addModal', close: 'closeAdd' },
    { id: 'searchModal', close: 'closeSearch' },
    { id: 'imageModal', close: 'closeImagePicker' },
    { id: 'providerModal', close: 'closeProvider' },
    { id: 'authModal', close: 'closeAuthModal' }
  ];
  const FOCUSABLE = 'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';
  let lastTrigger = null;
  let openCount = 0;

  function focusFirst(modal) {
    const box = modal.querySelector('.box') || modal;
    const first = Array.from(box.querySelectorAll(FOCUSABLE))
      .find((el) => el.offsetParent !== null || el === document.activeElement);
    if (first) first.focus();
    else if (box !== modal) { box.setAttribute('tabindex', '-1'); box.focus({ preventScroll: true }); }
  }

  function trap(e, modal) {
    if (e.key !== 'Tab') return;
    const box = modal.querySelector('.box') || modal;
    const items = Array.from(box.querySelectorAll(FOCUSABLE)).filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || !box.contains(document.activeElement))) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  }

  function wireModal(entry) {
    const modal = document.getElementById(entry.id);
    if (!modal || modal.dataset.spA11y) return;
    modal.dataset.spA11y = '1';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    const box = modal.querySelector('.box');
    if (box) box.setAttribute('aria-label', (modal.querySelector('.box h2') || {}).textContent || 'Dialog');

    modal.addEventListener('transitionend', () => {}, true);
    const onKey = (e) => {
      if (!modal.classList.contains('show')) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        if (typeof window[entry.close] === 'function') window[entry.close]();
      } else if (e.key === 'Tab') {
        trap(e, modal);
      }
    };
    modal.addEventListener('keydown', onKey);
  }

  function watchModals() {
    MODALS.forEach(wireModal);
    const observer = new MutationObserver(() => {
      let anyOpen = 0;
      MODALS.forEach((entry) => {
        const modal = document.getElementById(entry.id);
        if (!modal) return;
        const open = modal.classList.contains('show');
        if (open) {
          anyOpen++;
          if (!modal.dataset.spOpen) {
            modal.dataset.spOpen = '1';
            if (document.activeElement && document.activeElement !== document.body) lastTrigger = document.activeElement;
            setTimeout(() => focusFirst(modal), 30);
          }
        } else if (modal.dataset.spOpen) {
          delete modal.dataset.spOpen;
          if (lastTrigger && document.contains(lastTrigger)) { try { lastTrigger.focus({ preventScroll: true }); } catch (e) {} }
          lastTrigger = null;
        }
      });
      // scroll lock while any modal is open
      if (anyOpen > 0 && openCount === 0) document.body.classList.add('sp-modal-open');
      else if (anyOpen === 0 && openCount > 0) document.body.classList.remove('sp-modal-open');
      openCount = anyOpen;
    });
    observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
  }

  // ------------------------------------------------------------ toasts
  function wrapToast() {
    if (typeof window.toast !== 'function' || window.toast.__spStacked) return;
    const original = window.toast;
    let wrap = document.getElementById('spToasts');
    function ensureWrap() {
      if (!wrap) {
        wrap = document.createElement('div');
        wrap.id = 'spToasts';
        wrap.setAttribute('aria-live', 'polite');
        wrap.setAttribute('aria-atomic', 'false');
        document.body.appendChild(wrap);
      }
      return wrap;
    }
    window.toast = function stackedToast(t) {
      const host = ensureWrap();
      while (host.children.length >= 3) host.removeChild(host.firstChild); // cap stack
      const el = document.createElement('div');
      el.className = 'toast';
      el.textContent = t;
      el.setAttribute('role', 'status');
      host.appendChild(el);
      setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .25s'; }, 1550);
      setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 1800);
    };
    window.toast.__spStacked = true;
    void original; // original single-slot element stays unused but harmless
  }

  // ------------------------------------------------------------ live regions
  function markLiveRegions() {
    ['addStatus', 'providerStatus', 'imagePickerStatus', 'imageStatus'].forEach((id) => {
      const el = document.getElementById(id);
      if (el && !el.getAttribute('aria-live')) el.setAttribute('aria-live', 'polite');
    });
  }

  function init() {
    injectStyles();
    watchModals();
    wrapToast();
    markLiveRegions();
  }

  window.SPA11y = { wrapToast, markLiveRegions };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
