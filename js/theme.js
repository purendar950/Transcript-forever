/*
 * Theme module — Dark mode for StudyPlanner.
 *
 * - Toggle button in the sidebar (desktop) and topbar (mobile).
 * - Preference persisted in localStorage 'sscTheme' ('light' | 'dark').
 * - With no stored preference, follows the system (prefers-color-scheme).
 * - Dark palette is applied via html[data-theme="dark"] overrides so the
 *   existing inline CSS stays untouched, and injected layers (architecture,
 *   mobile-*, model-source) keep working unchanged.
 */
(() => {
  const KEY = 'sscTheme';
  const THEME_COLOR = { light: '#071126', dark: '#0b1220' };

  function stored() {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : null;
  }

  function systemTheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function current() {
    return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  }

  function apply(theme) {
    document.documentElement.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', THEME_COLOR[theme]);
    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(theme === 'dark'));
      const icon = btn.querySelector('.spThemeIcon');
      const label = btn.querySelector('.spThemeLabel');
      if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
      if (label) label.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
      btn.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    });
    try { window.dispatchEvent(new CustomEvent('sp:themechange', { detail: { theme } })); } catch (e) { /* older browsers */ }
  }

  function toggle() {
    const next = current() === 'dark' ? 'light' : 'dark';
    localStorage.setItem(KEY, next); // explicit user choice wins over system
    apply(next);
  }

  // ------------------------------------------------------------ dark sheet
  const DARK_CSS = `
html[data-theme="dark"]{color-scheme:dark}
html[data-theme="dark"] body{background:#0b1220;color:#e6eaf2}
html[data-theme="dark"] .content{color:#e6eaf2}
/* surfaces */
html[data-theme="dark"] .card{background:#121a2b;border-color:#263149;box-shadow:0 3px 12px rgba(0,0,0,.45)}
html[data-theme="dark"] .wordItem{background:#121a2b;border-color:#263149}
html[data-theme="dark"] .wordItem:hover{border-color:#3d4f76}
html[data-theme="dark"] .stat,html[data-theme="dark"] .pgStat,html[data-theme="dark"] .modeCard{background:#121a2b;border-color:#263149}
html[data-theme="dark"] .provider{background:#121a2b;border-color:#263149}
html[data-theme="dark"] .quizFilterPanel,html[data-theme="dark"] .tzRecent{background:#121a2b;border-color:#263149}
html[data-theme="dark"] .tzTab{background:#121a2b;border-color:#263149}
html[data-theme="dark"] .tzTab.active{border-color:#6724e8}
html[data-theme="dark"] .mini{background:#121a2b;border-color:#263149}
html[data-theme="dark"] .highlight{background:#1c1533;border-color:#3d2d70}
html[data-theme="dark"] .core{background:#241c10;border-color:#5a4420}
html[data-theme="dark"] .correct{background:#0e1626;border-color:#263149}
html[data-theme="dark"] .emptyBox{background:#121a2b;border-color:#3d4f76}
html[data-theme="dark"] .memHooks{background:#1c1533;border-color:#3d2d70;color:#c9b8f5}
/* text */
html[data-theme="dark"] .muted,html[data-theme="dark"] .stat small,html[data-theme="dark"] .hint,
html[data-theme="dark"] .wordItem small,html[data-theme="dark"] .modeCard small,html[data-theme="dark"] .fliphint,
html[data-theme="dark"] .pgStat .pgStatLabel,html[data-theme="dark"] .tzSub,html[data-theme="dark"] .searchFoot{color:#9aa4b8}
html[data-theme="dark"] .section h3,html[data-theme="dark"] .block h3{color:#b29bf5}
html[data-theme="dark"] .cbNums,html[data-theme="dark"] .mkQHead{color:#c6cddd}
/* buttons */
html[data-theme="dark"] .btn{background:#16213a;border-color:#3d4f76;color:#e6eaf2}
html[data-theme="dark"] .btn:hover{border-color:#6724e8}
html[data-theme="dark"] .btn.primary,html[data-theme="dark"] .rate .known{background:linear-gradient(90deg,#6724e8,#7b2bf0)!important;border-color:#6724e8;color:#fff}
html[data-theme="dark"] .btn.dangerBtn{background:#2a1218!important;border-color:#7a2c3e!important;color:#f8718f!important}
html[data-theme="dark"] .dueBtn{background:#16213a;border-color:#3d4f76;color:#e6eaf2}
html[data-theme="dark"] .dueBtn.active{background:linear-gradient(90deg,#6720e8,#7b2bf0);color:#fff;border-color:#6720e8}
html[data-theme="dark"] .rate button{background:#16213a}
html[data-theme="dark"] .rate .diff{border-color:#8a6420;color:#f0b03e}
html[data-theme="dark"] .rate .forgot{border-color:#8a2c3e;color:#f8718f}
html[data-theme="dark"] .qzReviewBtn{background:#121a2b}
html[data-theme="dark"] .qzReviewBtn:hover{background:#7023ec;color:#fff}
/* form controls */
html[data-theme="dark"] .box input,html[data-theme="dark"] .box select,html[data-theme="dark"] .box textarea,
html[data-theme="dark"] .field input,html[data-theme="dark"] .field select,
html[data-theme="dark"] .vocabSearch,html[data-theme="dark"] .listTools input,html[data-theme="dark"] .listTools select,
html[data-theme="dark"] #searchInput,html[data-theme="dark"] .tfmsInput,html[data-theme="dark"] .tfmsAddBtn,
html[data-theme="dark"] .mkLang{background:#0e1626;border-color:#3d4f76;color:#e6eaf2}
html[data-theme="dark"] .vocabSearch:focus,html[data-theme="dark"] #searchInput:focus{border-color:#6724e8}
html[data-theme="dark"] .tfmsAddBtn{background:#6724e8;border-color:#6724e8;color:#fff}
html[data-theme="dark"] .tfms{background:#121a2b;border-color:#263149}
html[data-theme="dark"] .tfmsToggle label{background:#0e1626;border-color:#3d4f76;color:#c6cddd}
html[data-theme="dark"] .tfmsToggle label:has(input:checked){border-color:#7023ec;background:#241a44;color:#c9b8f5}
html[data-theme="dark"] .tfmsChip{background:#241a44;border-color:#4c3a86;color:#d9cdfc}
/* modals */
html[data-theme="dark"] .modal{background:rgba(2,6,16,.72)}
html[data-theme="dark"] .box{background:#121a2b;border:1px solid #263149}
html[data-theme="dark"] .box h2{color:#c9b8f5}
html[data-theme="dark"] .box label{color:#c6cddd}
html[data-theme="dark"] .authModalField label{color:#c6cddd}
html[data-theme="dark"] .authModalField input{background:#0e1626;border-color:#3d4f76;color:#e6eaf2}
html[data-theme="dark"] .authModalBox{background:#121a2b}
html[data-theme="dark"] .authModalCode{background:#0f2418;border-color:#1d5c38;color:#34d399}
/* quiz / mock */
html[data-theme="dark"] .quizOption{background:#121a2b;border-color:#3d4f76;color:#e6eaf2}
html[data-theme="dark"] .quizOption:hover:not(:disabled){border-color:#7025e8}
html[data-theme="dark"] .quizOption.correct{border-color:#21964c;background:#0f2a1c}
html[data-theme="dark"] .quizOption.wrong{border-color:#df4d68;background:#2a1218}
html[data-theme="dark"] .quizFeedback.good{background:#0f2a1c;border-color:#1d5c38}
html[data-theme="dark"] .quizFeedback.bad{background:#2a1218;border-color:#7a2c3e}
html[data-theme="dark"] .mkTop,html[data-theme="dark"] .mkQCard,html[data-theme="dark"] .mkPal,
html[data-theme="dark"] .mkModal,html[data-theme="dark"] .mkRevRow{background:#121a2b;border-color:#263149;color:#e6eaf2}
html[data-theme="dark"] .mkOpt{background:#121a2b;border-color:#3d4f76}
html[data-theme="dark"] .mkOpt.sel{background:#1c1533;border-color:#2e64d8}
html[data-theme="dark"] #mkExam{background:#131a30;border-color:#2a3554}
html[data-theme="dark"] .mkOptDot{background:#0e1626;border-color:#5a6480}
html[data-theme="dark"] .mkTimer{background:#f7b52c;color:#3d2800}
html[data-theme="dark"] .mkPalBtn.nv{background:#64748b}
html[data-theme="dark"] .qzSessionBar{background:linear-gradient(135deg,#151d33,#131a30);border-color:#263149;color:#c6cddd}
html[data-theme="dark"] .qzResume{background:linear-gradient(135deg,#1c1533,#141b2e);border-color:#3d2d70}
html[data-theme="dark"] .qzSummaryStat{background:#0e1626;border-color:#263149}
html[data-theme="dark"] .qzSmartCard{background:#121a2b;border-color:#263149}
html[data-theme="dark"] .qzSmartCard .qzSmartIcon{background:#241a44}
html[data-theme="dark"] .qzSummaryHardTag{background:#2a1218;border-color:#7a2c3e;color:#f8718f}
/* chips + badges */
html[data-theme="dark"] .dashCatChip,html[data-theme="dark"] .dashStatusChip{background:#121a2b;border-color:#3d4f76;color:#c6cddd}
html[data-theme="dark"] .dashCatChip.active,html[data-theme="dark"] .dashStatusChip.active[data-status="all"]{background:linear-gradient(90deg,#6724e8,#7b2bf0);color:#fff;border-color:#6724e8}
html[data-theme="dark"] .dashStatusChip.active[data-status="learned"]{background:#15803d;border-color:#15803d}
html[data-theme="dark"] .dashStatusChip.active[data-status="weak"]{background:#be4258;border-color:#be4258}
html[data-theme="dark"] .dashStatusChip.active[data-status="unseen"]{background:#2f5fa8;border-color:#2f5fa8}
html[data-theme="dark"] .ws-learned{background:#0f2a1c;color:#4ade80}
html[data-theme="dark"] .ws-weak{background:#2a1218;color:#f8718f}
html[data-theme="dark"] .ws-unseen{background:#12203a;color:#7fb0f5}
html[data-theme="dark"] .badge.learn{background:#0f2a1c;color:#4ade80}
html[data-theme="dark"] .badge.weak{background:#2a1218;color:#f8718f}
html[data-theme="dark"] .lvlbadge.lvl-new{background:#1a2233;color:#9aa4b8}
html[data-theme="dark"] .lvlbadge.lvl-hard{background:#2a1218;color:#f8718f}
html[data-theme="dark"] .lvlbadge.lvl-easy{background:#0f2a1c;color:#4ade80}
html[data-theme="dark"] .tag{background:#0f2a1c;color:#4ade80}
html[data-theme="dark"] .hard{background:#2a1218;color:#f8718f;border-color:#7a2c3e}
html[data-theme="dark"] .addChip.chipNew{background:#0f2a1c;color:#4ade80;border-color:#1d5c38}
html[data-theme="dark"] .addChip.chipWarn{background:#241c10;color:#f0b03e;border-color:#5a4420}
html[data-theme="dark"] .addChip.chipDup,html[data-theme="dark"] .addChip.chipMore{background:#1a2233;color:#9aa4b8;border-color:#3d4f76}
html[data-theme="dark"] .srCat{background:#241a44;color:#c9b8f5}
html[data-theme="dark"] .srRow:hover,html[data-theme="dark"] .srRow.sel{background:#1c1533}
html[data-theme="dark"] .msRow:hover{background:#151d33}
/* progress page */
html[data-theme="dark"] .pgBigRingWrap,html[data-theme="dark"] .pgWeekly,
html[data-theme="dark"] .pgStatusBreakdown,html[data-theme="dark"] .pgQuizHistory{background:#121a2b;border-color:#263149}
html[data-theme="dark"] .pgBigRing:after{background:#121a2b}
html[data-theme="dark"] .pgWeekly{color:#c6cddd}
html[data-theme="dark"] .pgBarCount{color:#e6eaf2}
html[data-theme="dark"] .pgStackLegend span{color:#c6cddd}
html[data-theme="dark"] .pgStackBar{background:#1a2233}
html[data-theme="dark"] .cbTrack{background:#1a2233}
html[data-theme="dark"] .hm0{background:#1a2233}
html[data-theme="dark"] .pie{background:#3d4f76}
/* add-words progress */
html[data-theme="dark"] .addProgress{background:#0e1626;border-color:#263149}
html[data-theme="dark"] .addProgRow{background:#121a2b;border-color:#263149}
html[data-theme="dark"] .addProgBar{background:#1a2233}
html[data-theme="dark"] .rowOk{border-color:#1d5c38;background:#0f2016}
html[data-theme="dark"] .rowErr{border-color:#7a2c3e;background:#201114}
html[data-theme="dark"] .prTxt{color:#c6cddd}
/* search + misc */
html[data-theme="dark"] .searchResults .muted{color:#9aa4b8}
html[data-theme="dark"] .providerActions .editProviderBtn{background:#16213a;color:#b29bf5;border-color:#6724e8}
html[data-theme="dark"] .itemDel{background:#121a2b}
html[data-theme="dark"] .meaning .art{background:#1c1533}
html[data-theme="dark"] .visual{color:#e6eaf2}
/* theme toggle button (both placements) */
.spThemeBtn{display:inline-flex;align-items:center;gap:7px;border:1px solid #30405d;background:#101b34;color:#e7eaf2;border-radius:8px;padding:10px 13px;font-weight:600;font-size:13px;cursor:pointer}
.spThemeBtn:hover{background:#6b20ef;border-color:#6b20ef;color:#fff}
.spThemeBtn .spThemeIcon{font-size:15px;line-height:1}
.topbar .spThemeBtn{width:42px;height:42px;justify-content:center;padding:0;border-radius:9px;background:rgba(255,255,255,.08);border-color:transparent;font-size:17px}
.topbar .spThemeBtn:hover{background:#6b20ef}
@media(max-width:1000px){.topbar .spThemeBtn .spThemeLabel{display:none}}
`;

  function injectStyles() {
    if (document.getElementById('sp-theme-styles')) return;
    const st = document.createElement('style');
    st.id = 'sp-theme-styles';
    st.textContent = DARK_CSS;
    document.head.appendChild(st);
  }

  function buildToggle(compact) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'spThemeBtn';
    btn.dataset.themeToggle = '1';
    btn.setAttribute('aria-pressed', String(current() === 'dark'));
    btn.innerHTML = '<span class="spThemeIcon" aria-hidden="true">🌙</span><span class="spThemeLabel">Dark mode</span>';
    if (compact) btn.setAttribute('aria-label', 'Toggle dark mode');
    btn.addEventListener('click', toggle);
    return btn;
  }

  function mountToggles() {
    // Desktop: last item in the sidebar nav.
    const nav = document.querySelector('.sidebar .nav');
    if (nav && !nav.querySelector('[data-theme-toggle]')) nav.appendChild(buildToggle(false));
    // Mobile: icon-only button in the topbar, before the search button.
    const topbar = document.querySelector('.topbar');
    if (topbar && !topbar.querySelector('[data-theme-toggle]')) {
      const search = topbar.querySelector('.tbSearch');
      const btn = buildToggle(true);
      if (search) topbar.insertBefore(btn, search); else topbar.appendChild(btn);
    }
  }

  function init() {
    injectStyles();
    mountToggles();
    apply(stored() || systemTheme());
    // Follow live system changes only while the user has no explicit choice.
    if (window.matchMedia) {
      try {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
          if (!stored()) apply(e.matches ? 'dark' : 'light');
        });
      } catch (err) { /* Safari < 14 */ }
    }
  }

  window.SPTheme = { toggle, apply, current, stored };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
