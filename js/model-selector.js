/*
 * ModelSelector — Auto Fetch / Manual model source for Transcript Forever
 *
 * Implements the confirmed Model Source design, adapted from the React
 * ModelSelector spec to this app's vanilla JS + Vercel stack:
 *
 *   ┌────────────────────────────────────────────┐
 *   │  Model Source:  ○ Auto Fetch   ○ Manual    │
 *   ├────────────────────────────────────────────┤
 *   │  Auto:   dropdown shows ALL fetched models │
 *   │  Manual: input + Add button                │
 *   │          chips list with ✕ remove          │
 *   │          dropdown shows ONLY these         │
 *   ├────────────────────────────────────────────┤
 *   │  Persisted in localStorage:                │
 *   │  - source mode                             │
 *   │  - manual model list                       │
 *   │  - cached auto-fetched models (fallback)   │
 *   └────────────────────────────────────────────┘
 *
 * Core rules:
 *   1. Auto mode   -> dropdown shows ALL models fetched from the provider API
 *                     (results are cached; the cache is used as a fallback
 *                     when the API is unreachable).
 *   2. Manual mode -> ONLY the models the user typed appear in the dropdown.
 *   3. Switching modes resets the current selection (prevents invalid model
 *      errors from a model that belongs to the other mode).
 *   4. Duplicate manual entries are blocked (case-insensitive).
 *   5. Everything persists across page reloads.
 *
 * The display respects whichever mode is active — this is enforced in one
 * choke point: the global fillModels() that both model dropdowns flow
 * through is wrapped, so every open/refresh/provider-change re-renders the
 * dropdown according to the active mode.
 */

(() => {
  // localStorage keys (per model type: 'text' | 'image'), mirroring the spec's
  // SOURCE_KEY / MANUAL_KEY / CACHE_KEY with a type suffix because the app has
  // two independent selectors (Text AI and Image AI).
  const SOURCE_KEY = 'tf_model_source';   // + ':' + type  -> 'auto' | 'manual'
  const MANUAL_KEY = 'tf_manual_models';  // + ':' + type  -> string[]
  const CACHE_KEY = 'tf_cached_models';   // + ':' + type  -> string[]

  // Mount points: select element id -> model type.
  const TARGETS = [
    { type: 'text', selectId: 'addModel', providerId: 'addProvider', statusId: 'addStatus' },
    { type: 'image', selectId: 'imageModel', providerId: 'imageProvider', statusId: 'imagePickerStatus' }
  ];

  function readJSON(key, fallback) {
    try {
      const v = JSON.parse(localStorage.getItem(key));
      return v == null ? fallback : v;
    } catch (e) { return fallback; }
  }
  function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage full/blocked — non-fatal */ }
  }

  const getSource = (type) => localStorage.getItem(SOURCE_KEY + ':' + type) || 'auto';
  const setSource = (type, mode) => localStorage.setItem(SOURCE_KEY + ':' + type, mode);
  const getManual = (type) => readJSON(MANUAL_KEY + ':' + type, []).filter((m) => typeof m === 'string' && m.trim());
  const setManual = (type, list) => writeJSON(MANUAL_KEY + ':' + type, list);
  const getCache = (type) => readJSON(CACHE_KEY + ':' + type, []).filter((m) => typeof m === 'string' && m.trim());
  const setCache = (type, list) => writeJSON(CACHE_KEY + ':' + type, list);

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ---------------------------------------------------------------- styles
  const CSS = `
.tfms{border:1px solid #ccd1dc;border-radius:9px;padding:10px 12px;margin-top:8px;background:#fff}
.tfmsToggle{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.tfmsToggleTitle{font-size:12px;font-weight:800;color:#171b27;text-transform:uppercase;letter-spacing:.04em}
.tfmsToggle label{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:600;color:#374151;cursor:pointer;margin:0}
.tfmsToggle input{accent-color:#6724e8;margin:0}
.tfmsManual{margin-top:9px;display:grid;gap:8px}
.tfmsManual[hidden]{display:none}
.tfmsInputRow{display:flex;gap:8px}
.tfmsInput{flex:1;min-width:0;height:38px;padding:0 10px;border:1px solid #ccd1dc;border-radius:7px;font:inherit;font-size:13px}
.tfmsInput:focus{outline:2px solid #6724e8;outline-offset:-1px;border-color:#6724e8}
.tfmsAddBtn{height:38px;padding:0 14px;border-radius:7px;border:1px solid #6724e8;background:#6724e8;color:#fff;font-weight:700;font-size:13px;cursor:pointer;white-space:nowrap}
.tfmsAddBtn:hover{background:#5a1fd1}
.tfmsChips{display:flex;flex-wrap:wrap;gap:6px}
.tfmsChips:empty{display:none}
.tfmsChip{display:inline-flex;align-items:center;gap:6px;background:#f1ecfe;border:1px solid #d9ccfb;color:#3d2470;border-radius:999px;padding:3px 6px 3px 10px;font-size:12px;font-weight:600;max-width:100%}
.tfmsChipName{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tfmsChipX{width:18px;height:18px;line-height:1;border:0;border-radius:50%;background:transparent;color:#6b21a8;font-size:12px;font-weight:800;cursor:pointer;display:grid;place-items:center;padding:0}
.tfmsChipX:hover{background:#e2d6fd}
.tfmsNote{font-size:11px;color:#687080;margin:0}
.tfmsNoteWarn{color:#b45309;font-weight:700}
`;
  function injectStyles() {
    if (document.getElementById('tfms-styles')) return;
    const st = document.createElement('style');
    st.id = 'tfms-styles';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  // ---------------------------------------------------------------- panel UI
  // Each target select gets a panel inserted after its .modelRow:
  // mode toggle + (manual-only) input/add/chips editor.
  function buildPanel(t) {
    const sel = document.getElementById(t.selectId);
    if (!sel) return;
    const row = sel.closest('.modelRow') || sel.parentElement;
    if (!row || row.parentElement.querySelector('.tfms[data-tfms-for="' + t.selectId + '"]')) return;

    const panel = document.createElement('div');
    panel.className = 'tfms';
    panel.dataset.tfmsFor = t.selectId;
    panel.innerHTML =
      '<div class="tfmsToggle">' +
      '<span class="tfmsToggleTitle">Model source</span>' +
      '<label><input type="radio" name="tfmsSrc-' + t.type + '" value="auto"> Auto (fetch all models)</label>' +
      '<label><input type="radio" name="tfmsSrc-' + t.type + '" value="manual"> Manual (my models only)</label>' +
      '</div>' +
      '<div class="tfmsManual" hidden>' +
      '<div class="tfmsInputRow">' +
      '<input type="text" class="tfmsInput" placeholder="Model ID, e.g. ' + (t.type === 'image' ? 'flux' : 'gpt-4.1-mini') + '" aria-label="Add model manually">' +
      '<button type="button" class="tfmsAddBtn">+ Add</button>' +
      '</div>' +
      '<div class="tfmsChips"></div>' +
      '<div class="tfmsNote">Manual list is saved in your browser and survives page reloads. The dropdown shows only these models.</div>' +
      '</div>';

    row.parentElement.insertBefore(panel, row.nextSibling);

    const manualBox = panel.querySelector('.tfmsManual');
    const input = panel.querySelector('.tfmsInput');
    const addBtn = panel.querySelector('.tfmsAddBtn');
    const chips = panel.querySelector('.tfmsChips');
    const radios = Array.from(panel.querySelectorAll('input[type="radio"]'));

    function syncPanel() {
      const mode = getSource(t.type);
      radios.forEach((r) => { r.checked = r.value === mode; });
      manualBox.hidden = mode !== 'manual';
      // "Refresh Models" is meaningless in manual mode — hide it to avoid confusion.
      const refreshBtn = row.querySelector('button[onclick*="refresh"]');
      if (refreshBtn) refreshBtn.style.display = mode === 'manual' ? 'none' : '';
      renderChips();
    }

    function renderChips() {
      const list = getManual(t.type);
      chips.innerHTML = list.map((m) =>
        '<span class="tfmsChip" title="' + esc(m) + '"><span class="tfmsChipName">' + esc(m) + '</span>' +
        '<button type="button" class="tfmsChipX" data-model="' + esc(m) + '" aria-label="Remove ' + esc(m) + '">✕</button></span>'
      ).join('');
    }

    function addModel() {
      const name = input.value.trim();
      if (!name) return;
      const list = getManual(t.type);
      if (list.some((m) => m.toLowerCase() === name.toLowerCase())) { // block duplicates
        input.value = '';
        return;
      }
      list.push(name);
      setManual(t.type, list);
      input.value = '';
      renderChips();
      renderSelect(t); // dropdown shows ONLY these models
    }

    function removeModel(name) {
      const list = getManual(t.type).filter((m) => m !== name);
      setManual(t.type, list);
      renderChips();
      renderSelect(t); // clears selection if it was the removed model
    }

    addBtn.addEventListener('click', addModel);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addModel(); } });
    chips.addEventListener('click', (e) => {
      const x = e.target.closest('.tfmsChipX');
      if (x) removeModel(x.dataset.model);
    });
    radios.forEach((r) => r.addEventListener('change', () => {
      if (!r.checked) return;
      switchMode(t, r.value);
      syncPanel();
    }));

    t._syncPanel = syncPanel;
    syncPanel();
  }

  // ---------------------------------------------------------------- select
  // THE CORE RULE: what the dropdown displays depends entirely on the mode.
  function placeholderText(mode) {
    return mode === 'auto' ? 'Select a model…' : 'Select from your models…';
  }

  function renderSelect(t) {
    const sel = document.getElementById(t.selectId);
    if (!sel) return;
    const mode = getSource(t.type);

    if (mode === 'manual') {
      const list = getManual(t.type);
      const prev = sel.value;
      sel.innerHTML =
        '<option value="">' + esc(placeholderText('manual')) + '</option>' +
        list.map((m) => '<option value="' + esc(m) + '">' + esc(m) + '</option>').join('');
      // Keep the selection only if it is still valid in this mode.
      sel.value = list.includes(prev) ? prev : '';
    } else {
      const prev = sel.value;
      const opts = Array.from(sel.options).filter((o) => o.value !== '').map((o) => ({ v: o.value, label: o.textContent }));
      if (opts.length) {
        sel.innerHTML =
          '<option value="">' + esc(placeholderText('auto')) + '</option>' +
          opts.map((o) => '<option value="' + esc(o.v) + '">' + esc(o.label) + '</option>').join('');
        if (Array.from(sel.options).some((o) => o.value === prev)) sel.value = prev;
      }
    }
  }

  // Mode switch: persist + reset selection (a model chosen in the other mode
  // may be invalid here — resetting prevents invalid model errors).
  function switchMode(t, mode) {
    if (getSource(t.type) === mode) return;
    setSource(t.type, mode);
    const sel = document.getElementById(t.selectId);
    if (sel) sel.value = '';
    if (mode === 'auto') {
      // Re-fetch through the app's normal pipeline (which we wrap below);
      // fall back to the cached list if the API is unreachable.
      if (typeof window.fillModels === 'function') {
        const pid = document.getElementById(t.providerId) ? document.getElementById(t.providerId).value : '';
        window.fillModels(t.type, pid, t.selectId, t.statusId);
      }
    } else {
      renderSelect(t);
    }
  }

  // ---------------------------------------------------------------- fillModels wrapper
  // Single choke point: every dropdown population flows through fillModels,
  // so wrapping it makes the display respect the active mode everywhere
  // (modal open, provider change, Refresh Models click).
  function wrapFillModels() {
    const orig = window.fillModels;
    if (typeof orig !== 'function' || orig.__tfmsWrapped) return;

    async function wrapped(type, providerId, selectId, statusId) {
      const t = TARGETS.find((x) => x.type === type);
      const mode = t ? getSource(t.type) : 'auto';

      if (mode === 'manual') {
        // MANUAL: no fetch at all — the dropdown shows ONLY the manual list.
        renderSelect(t);
        const st = statusId ? document.getElementById(statusId) : null;
        const n = getManual(type).length;
        if (st) st.textContent = n ? 'Manual mode — ' + n + ' model' + (n === 1 ? '' : 's') + ' from your list.' : 'Manual mode — add models with the input below.';
        return;
      }

      // AUTO: fetch ALL models via the original pipeline, then cache + decorate.
      const st = statusId ? document.getElementById(statusId) : null;
      await orig(type, providerId, selectId, statusId);

      const sel = document.getElementById(selectId);
      if (!sel) return;

      const failed = st && /^Could not load model list/.test(st.textContent || '');
      if (!failed) {
        // Success: persist the fetched list as the fallback cache.
        const fetched = Array.from(sel.options).map((o) => o.value).filter((v) => v && v !== '__tfms_placeholder__');
        // Exclude the injected saved-default model? No — keep everything the
        // provider returned plus the saved default; it is a valid choice.
        if (fetched.length) setCache(type, fetched);
      } else {
        // API unreachable: fall back to the cached list.
        const cached = getCache(type);
        if (cached.length && sel) {
          const savedDefault = sel.value; // original filled saved model as fallback
          sel.innerHTML =
            '<option value="">' + esc(placeholderText('auto')) + '</option>' +
            cached.map((m) => '<option value="' + esc(m) + '">' + esc(m) + '</option>').join('');
          if (cached.includes(savedDefault)) sel.value = savedDefault;
          if (st) st.textContent = 'Could not reach the API — showing ' + cached.length + ' cached model' + (cached.length === 1 ? '' : 's') + '. You can use Custom model.';
        }
      }

      renderSelect(t); // add the mode-aware placeholder on top
    }

    wrapped.__tfmsWrapped = true;
    window.fillModels = wrapped;
  }

  // ---------------------------------------------------------------- public API
  window.ModelSelector = {
    getMode: getSource,
    setMode(type, mode) {
      const t = TARGETS.find((x) => x.type === type);
      if (!t || !['auto', 'manual'].includes(mode)) return;
      switchMode(t, mode);
      if (t._syncPanel) t._syncPanel();
    },
    getManualModels: getManual,
    addManualModel(type, name) {
      const n = String(name || '').trim();
      if (!n) return false;
      const list = getManual(type);
      if (list.some((m) => m.toLowerCase() === n.toLowerCase())) return false;
      list.push(n);
      setManual(type, list);
      const t = TARGETS.find((x) => x.type === type);
      if (t && t._syncPanel) t._syncPanel();
      renderSelect(t);
      return true;
    },
    removeManualModel(type, name) {
      setManual(type, getManual(type).filter((m) => m !== name));
      const t = TARGETS.find((x) => x.type === type);
      if (t && t._syncPanel) t._syncPanel();
      renderSelect(t);
    }
  };

  // ---------------------------------------------------------------- boot
  function init() {
    injectStyles();
    wrapFillModels();
    TARGETS.forEach((t) => {
      buildPanel(t);
      renderSelect(t);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
