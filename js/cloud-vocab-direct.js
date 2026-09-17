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

  // From this point onward, vocabulary data must never be persisted in localStorage.
  // Other localStorage keys (progress, settings, images, etc.) continue to work.
  try {
    localStorage.removeItem('sscAIWords');
    const originalSetItem = Storage.prototype.setItem;
    if (!Storage.prototype.__sscCloudVocabPatched) {
      Storage.prototype.setItem = function(key, value) {
        if (key === 'sscAIWords') return;
        return originalSetItem.call(this, key, value);
      };
      Storage.prototype.__sscCloudVocabPatched = true;
    }
  } catch (error) {
    console.warn('[Cloud Vocab] local vocabulary storage guard failed:', error);
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
      saveImagesLocally();

      // Preserve progress/settings/deletion bookkeeping. The storage guard above
      // prevents the original save() from persisting the vocabulary payload.
      originalSave();
      removeLocalVocabulary();

      try {
        await pushNow();
        removeLocalVocabulary();
        restoreLocalImages();
        console.info('[Cloud Vocab] word saved directly to Supabase');
        return true;
      } catch (error) {
        removeLocalVocabulary();
        console.error('[Cloud Vocab] direct cloud save failed:', error);
        return false;
      }
    };
  }

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
