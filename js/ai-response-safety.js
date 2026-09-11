/* Normalize AI-generated JSON when a provider appends harmless prose/code fences. */
(() => {
  const originalParse = JSON.parse.bind(JSON);
  const likelyAiPayload = (value) => {
    const s = String(value ?? '').trim();
    return s.length > 300 && (/^[`\s]*[\[{]/.test(s) || /^```(?:json)?/i.test(s));
  };

  function extractBalanced(text) {
    const s = String(text ?? '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    for (let start = 0; start < s.length; start++) {
      if (s[start] !== '{' && s[start] !== '[') continue;
      const stack = [];
      let quote = false;
      let escaped = false;
      for (let i = start; i < s.length; i++) {
        const ch = s[i];
        if (quote) {
          if (escaped) escaped = false;
          else if (ch === '\\') escaped = true;
          else if (ch === '"') quote = false;
          continue;
        }
        if (ch === '"') { quote = true; continue; }
        if (ch === '{' || ch === '[') stack.push(ch);
        else if (ch === '}' || ch === ']') {
          const open = stack.pop();
          if ((ch === '}' && open !== '{') || (ch === ']' && open !== '[')) break;
          if (!stack.length) return s.slice(start, i + 1);
        }
      }
    }
    return null;
  }

  JSON.parse = function safeAiParse(value, reviver) {
    try {
      return originalParse(value, reviver);
    } catch (error) {
      if (!likelyAiPayload(value) || !/non-whitespace|unexpected/i.test(String(error?.message || ''))) throw error;
      const candidate = extractBalanced(value);
      if (!candidate) throw error;
      try { return originalParse(candidate, reviver); } catch (_) { throw error; }
    }
  };
})();
