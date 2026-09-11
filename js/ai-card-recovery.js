/* Recover valid single cards when a batch AI response omits or mislabels a word. */
(() => {
  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function parsePayload(text) {
    const raw = clean(text);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (_) {}

    // JSON.parse is normally hardened by ai-response-safety.js. Keep a local
    // fallback too, so this module remains safe if script order changes.
    const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    for (let start = 0; start < stripped.length; start++) {
      if (stripped[start] !== '{' && stripped[start] !== '[') continue;
      let depth = 0, quote = false, escaped = false;
      for (let i = start; i < stripped.length; i++) {
        const ch = stripped[i];
        if (quote) {
          if (escaped) escaped = false;
          else if (ch === '\\') escaped = true;
          else if (ch === '"') quote = false;
          continue;
        }
        if (ch === '"') { quote = true; continue; }
        if (ch === '{' || ch === '[') depth++;
        else if (ch === '}' || ch === ']') {
          depth--;
          if (depth === 0) {
            try { return JSON.parse(stripped.slice(start, i + 1)); } catch (_) { break; }
          }
        }
      }
    }
    return null;
  }

  function asCards(parsed) {
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.cards)) return parsed.cards;
    if (parsed && Array.isArray(parsed.data)) return parsed.data;
    if (parsed && typeof parsed === 'object') return [parsed];
    return [];
  }

  function normalizeCard(raw, requested, category) {
    if (!raw || typeof raw !== 'object') return null;
    const requestedWord = clean(requested);
    const returnedWord = clean(raw.word || raw.term || raw.phrase || raw.expression || raw.title);
    // For a one-word recovery call, the requested word is authoritative. This
    // handles providers that return the phrase in another field or omit word.
    const word = requestedWord;
    if (returnedWord && returnedWord.toLowerCase() !== requestedWord.toLowerCase()) return null;
    if (!clean(raw.meaning) || !clean(raw.example) || !clean(raw.q)) return null;
    if (!Array.isArray(raw.opts) || raw.opts.length !== 4) return null;
    if (!Number.isInteger(raw.ans) || raw.ans < 0 || raw.ans > 3) return null;

    const catMeta = window.CAT_META || {};
    const heuristic = typeof window.heuristicCategory === 'function' ? window.heuristicCategory(word) : 'Vocabulary';
    return Object.assign({}, raw, {
      word,
      category: category !== 'auto' ? category : (catMeta[raw.category] ? raw.category : heuristic),
      createdAt: Date.now()
    });
  }

  async function recoverWord(word, provider, model, category) {
    if (typeof window.api !== 'function') return null;
    const categoryRule = category !== 'auto'
      ? `category is exactly: ${category}.`
      : 'category is exactly one of: Vocabulary, Idiom, Phrasal Verb, One-Word Substitution, Confusing Words — pick the best fit.';
    const prompt = `Create ONE SSC English vocabulary flashcard for exactly this word/phrase: "${word}". Return ONLY one JSON object, not an array and no markdown. The object must contain exactly these fields: word, pron, pronDeva, pos, category, meaning, hindi, hinglish, visual, syn, ant, example, mnemonic, story, core, q, opts, ans, confuse. The word field MUST be exactly "${word}". Do not split or rename the phrase. syn and ant are arrays of 3 strings. opts is an array of exactly 4 strings. ans is a zero-based integer from 0 to 3. confuse is an array of 2 objects with word and meaning. ${categoryRule} Accurate SSC exam-focused content; do not invent PYQ claims or sources.`;

    const response = await window.api('chat', provider, {
      model,
      max_tokens: 5000,
      messages: [
        { role: 'system', content: 'You are an expert SSC English vocabulary teacher. Return strict JSON only.' },
        { role: 'user', content: prompt }
      ]
    });
    const content = response?.choices?.[0]?.message?.content;
    const parsed = parsePayload(typeof content === 'string' ? content : JSON.stringify(content || ''));
    const cards = asCards(parsed);
    return normalizeCard(cards[0], word, category);
  }

  function install() {
    const original = window.generateBatch;
    if (typeof original !== 'function' || original.__cardRecoveryWrapped) return false;

    async function wrapped(list, provider, model, category) {
      const result = await original(list, provider, model, category);
      const missing = Object.keys(result?.errs || {}).filter((word) => result.errs[word] === 'AI returned no card for this word');
      if (!missing.length) return result;

      // Retry only missing cards, individually. This avoids re-generating the
      // successful cards and is especially important for phrases such as
      // "gall and wormwood" that some models omit in a multi-card response.
      for (const word of missing) {
        try {
          const card = await recoverWord(word, provider, model, category);
          if (!card) continue;
          result.cards.push(card);
          delete result.errs[word];
        } catch (_) {
          // Preserve the original, useful failure message if recovery fails.
        }
      }
      return result;
    }

    wrapped.__cardRecoveryWrapped = true;
    window.generateBatch = wrapped;
    return true;
  }

  if (!install()) {
    let tries = 0;
    const timer = setInterval(() => {
      if (install() || ++tries > 40) clearInterval(timer);
    }, 100);
  }
})();
