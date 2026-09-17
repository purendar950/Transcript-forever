/* Cloud-first vocabulary storage: word data lives in Supabase; generated images stay local. */
(() => {
  if (window.__cloudVocabDirectLoaded) return;
  window.__cloudVocabDirectLoaded = true;

  const imageKey = 'sscWordImages';

  function getWords() {
    try { return typeof words !== 'undefined' && Array.isArray(words) ? words : []; }
    catch (_) { return []; }
  }

  function getSeed() {
    try { return typeof seed !== 'undefined' && Array.isArray(seed) ? seed : []; }
    catch (_) { return []; }
  }

  function getHidden() {
    try { return typeof hiddenSeed !== 'undefined' && hiddenSeed instanceof Set ? hiddenSeed : new Set(); }
    catch (_) { return new Set(); }
  }

  function saveImagesLocally() {
    try {
      const map = JSON.parse(localStorage.getItem(imageKey) || '{}');
      getWords().forEach(d => {
        const word = String(d && d.word || '').trim();
        if (word && d.generatedImage) map[word.toLowerCase()] = d.generatedImage;
      });
      getSeed().forEach(d => {
        const word = String(d && d.word || '').trim();
        if (word && d.generatedImage) map[word.toLowerCase()] = d.generatedImage;
      });
      localStorage.setItem(imageKey, JSON.stringify(map));
    } catch (error) {
      console.warn('[Cloud Vocab] local image save failed:', error);
    }
  }

  function restoreLocalImages() {
    try {
      const map = JSON.parse(localStorage.getItem(imageKey) || '{}');
      getWords().forEach(d => {
        const word = String(d && d.word || '').trim();
        const image = map[word.toLowerCase()];
        if (image) d.generatedImage = image;
      });
      getSeed().forEach(d => {
        const word = String(d && d.word || '').trim();
        const image = map[word.toLowerCase()];
        if (image) d.generatedImage = image;
      });
    } catch (error) {
      console.warn('[Cloud Vocab] local image restore failed:', error);
    }
  }

  function removeLocalVocabulary() {
    try { localStorage.removeItem('sscAIWords'); } catch (_) {}
  }

  async function pushNow() {
    if (typeof window.syncToCloud === 'function') {
      await window.syncToCloud();
      return true;
    }
    if (typeof window.cloudSyncNow === 'function') {
      return !!(await window.cloudSyncNow());
    }
    throw new Error('Cloud sync module is not loaded');
  }

  // Replace the original save() only after app.js has defined it.
  const originalSave = typeof window.save === 'function' ? window.save : null;
  if (originalSave) {
    window.save = async function cloudFirstSave() {
      // Preserve progress/settings/deletion bookkeeping and capture images locally.
      saveImagesLocally();

      // The original save also updates non-vocabulary local state. Run it first,
      // then immediately remove its vocabulary payload again.
      originalSave();
      removeLocalVocabulary();

      // Upload the current vocabulary immediately; words are not intentionally
      // persisted in localStorage. generatedImage is excluded by the RPC bridge.
      try {
        await pushNow();
        removeLocalVocabulary();
        restoreLocalImages();
        console.info('[Cloud Vocab] word saved directly to Supabase');
        return true;
      } catch (error) {
        // Keep no vocabulary copy in localStorage even on failure; the UI remains
        // in memory so the user can retry Manual Sync without losing the word.
        removeLocalVocabulary();
        console.error('[Cloud Vocab] direct cloud save failed:', error);
        return false;
      }
    };
  }

  // The cloud pull replaces the in-memory word list. Reattach device-local images.
  const originalCloudSyncNow = window.cloudSyncNow;
  if (typeof originalCloudSyncNow === 'function') {
    window.cloudSyncNow = async function cloudFirstManualSync() {
      const ok = await originalCloudSyncNow();
      restoreLocalImages();
      removeLocalVocabulary();
      return ok;
    };
  }

  restoreLocalImages();
})();
