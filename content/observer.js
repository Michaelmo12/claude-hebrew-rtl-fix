/**
 * observer.js — wires everything together: an initial pass over already
 * -rendered content, plus a single debounced MutationObserver that catches
 * new/streamed messages. Loaded last so it can reference the functions the
 * other content scripts attach to window.HRTL.
 *
 * No network access: the observer only watches the page's own DOM.
 */
(function () {
  function debounce(fn, wait) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function processRoot(root) {
    window.HRTL.applyStylesToBlocks(root);
    window.HRTL.wrapLatinRuns(root);
    window.HRTL.attachComposerListener();
  }

  function init() {
    const root = document.querySelector('main') || document.body;
    processRoot(root);

    const debouncedProcess = debounce(() => processRoot(root), 150);

    const observer = new MutationObserver((mutations) => {
      // Idempotency in applyStylesToBlocks/wrapLatinRuns is the real safety
      // net against reprocessing our own output; this check is just a
      // cheap early-out to skip scheduling a pass for irrelevant mutations
      // (e.g. an attribute-only change on an already-tagged element).
      const relevant = mutations.some(
        (m) => m.type === 'childList' && (m.addedNodes.length > 0 || m.removedNodes.length > 0)
      ) || mutations.some((m) => m.type === 'characterData');

      if (relevant) debouncedProcess();
    });

    observer.observe(root, { childList: true, subtree: true, characterData: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
