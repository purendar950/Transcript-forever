(() => {
  const KEY = 'sscPracticeType';
  const TYPES = [
    { id: 'synonym', label: 'Synonyms', instruction: 'Create a SYNONYM question: ask for the word closest in meaning to the target word. Do not make an antonym, cloze, fill-in-the-blank, or usage question.' },
    { id: 'antonym', label: 'Antonyms', instruction: 'Create an ANTONYM question: ask for the word opposite in meaning to the target word. Do not make a synonym, cloze, fill-in-the-blank, or usage question.' },
    { id: 'meaning', label: 'Meaning / Vocabulary', instruction: 'Create a MEANING / VOCABULARY question: ask the learner to identify the correct meaning/definition of the target word. Do not make a synonym, antonym, cloze, fill-in-the-blank, or usage question.' }
  ];

  function getType() {
    const saved = localStorage.getItem(KEY);
    return TYPES.some(t => t.id === saved) ? saved : 'synonym';
  }
  function setType(id) {
    if (!TYPES.some(t => t.id === id)) return;
    localStorage.setItem(KEY, id);
    document.querySelectorAll('.tfPracticeTypeBtn').forEach(btn => {
      const active = btn.dataset.practiceType === id;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function findPracticeBlock() {
    const candidates = Array.from(document.querySelectorAll('h3,h4,strong,b,div'));
    const heading = candidates.find(el => /^AI\s*PRACTICE$/i.test((el.textContent || '').trim()));
    return heading ? (heading.closest('.block,.card,section') || heading.parentElement) : null;
  }

  function installUI() {
    if (document.getElementById('tfPracticeType')) return true;
    const block = findPracticeBlock();
    if (!block) return false;

    const panel = document.createElement('div');
    panel.id = 'tfPracticeType';
    panel.className = 'tfPracticeType';
    panel.innerHTML = '<div class="tfPracticeTypeLabel">PRACTICE TYPE</div>' +
      '<div class="tfPracticeTypeRow">' +
      TYPES.map(t => '<button type="button" class="tfPracticeTypeBtn" data-practice-type="' + t.id + '" aria-pressed="false">' + t.label + '</button>').join('') +
      '</div>';

    const heading = Array.from(block.querySelectorAll('h3,h4,strong,b,div')).find(el => /^AI\s*PRACTICE$/i.test((el.textContent || '').trim()));
    const anchor = heading || block.firstElementChild;
    if (anchor && anchor.parentNode === block) anchor.insertAdjacentElement('afterend', panel);
    else block.insertBefore(panel, block.firstChild);

    panel.addEventListener('click', e => {
      const btn = e.target.closest('.tfPracticeTypeBtn');
      if (btn) setType(btn.dataset.practiceType);
    });
    setType(getType());
    return true;
  }

  function wrapApi() {
    const api = window.api;
    if (typeof api !== 'function' || api.__tfPracticeTypeWrapped) return false;
    async function wrapped(action, provider, extra = {}) {
      if (action === 'chat' && extra && Array.isArray(extra.messages)) {
        const messages = extra.messages.slice();
        const last = messages.length ? messages[messages.length - 1] : null;
        const content = last && typeof last.content === 'string' ? last.content : '';
        const isPractice = /different angle|synonym\/antonym\/cloze\/usage/i.test(content);
        if (isPractice && last) {
          const type = TYPES.find(t => t.id === getType()) || TYPES[0];
          last.content = content + '\n\nIMPORTANT PRACTICE TYPE: ' + type.label.toUpperCase() + '. ' + type.instruction;
          extra = Object.assign({}, extra, { messages });
        }
      }
      return api(action, provider, extra);
    }
    wrapped.__tfPracticeTypeWrapped = true;
    window.api = wrapped;
    return true;
  }

  const CSS = `
#tfPracticeType{margin:10px 0 14px;padding:11px 12px;border:1px solid #e0e3ea;border-radius:9px;background:#fafbfe}
.tfPracticeTypeLabel{font-size:11px;font-weight:800;letter-spacing:.06em;color:#687080;margin-bottom:8px}
.tfPracticeTypeRow{display:flex;gap:8px;flex-wrap:wrap}
.tfPracticeTypeBtn{flex:1 1 0;min-width:0;padding:9px 10px;border:1px solid #ccd1dc;border-radius:8px;background:#fff;color:#374151;font:inherit;font-size:12px;font-weight:800;cursor:pointer;line-height:1.25}
.tfPracticeTypeBtn:hover{border-color:#7025e8}
.tfPracticeTypeBtn.active{background:linear-gradient(90deg,#6724e8,#7b2bf0);border-color:#6724e8;color:#fff}
@media(max-width:500px){.tfPracticeTypeRow{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none}.tfPracticeTypeRow::-webkit-scrollbar{display:none}.tfPracticeTypeBtn{flex:0 0 auto;white-space:nowrap;padding:9px 12px}}
`;

  function injectStyles() {
    if (document.getElementById('tfPracticeTypeStyles')) return;
    const style = document.createElement('style');
    style.id = 'tfPracticeTypeStyles';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  function init() {
    injectStyles();
    wrapApi();
    if (!installUI()) {
      let tries = 0;
      const timer = setInterval(() => {
        wrapApi();
        if (installUI() || ++tries > 40) clearInterval(timer);
      }, 100);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
