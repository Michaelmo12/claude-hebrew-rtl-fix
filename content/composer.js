/**
 * composer.js — v1.1: live direction detection on Claude's message
 * composer as you type, so it doesn't stay stuck LTR while entering Hebrew.
 *
 * Hedges for both a contenteditable composer and a plain <textarea>, since
 * the real implementation can't be confirmed without inspecting the live
 * page (see README "known first-run tuning step").
 *
 * No network access — only reads the composer's own text and toggles its
 * inline dir/style attributes.
 */
(function () {
  function debounce(fn, wait) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function getComposerText(el) {
    return el.isContentEditable ? el.innerText : el.value;
  }

  function applyComposerDirection(el) {
    const text = getComposerText(el);

    if (!text || !text.trim()) {
      // Empty composer: reset to neutral so placeholder text / next
      // message isn't stuck in whatever direction was last typed.
      el.style.direction = '';
      el.style.textAlign = '';
      el.removeAttribute('dir');
      return;
    }

    const isHebrew = window.HRTL.isHebrewDominant(text);
    el.dir = isHebrew ? 'rtl' : 'ltr';
    el.style.direction = isHebrew ? 'rtl' : 'ltr';
    el.style.textAlign = isHebrew ? 'right' : 'left';
  }

  function attachComposerListener() {
    const el = document.querySelector(window.HRTL.SELECTORS.composer);
    if (!el || el.dataset.hrtlBound) return;

    el.dataset.hrtlBound = 'true';
    const handler = debounce(() => applyComposerDirection(el), 60);
    el.addEventListener('input', handler);
    el.addEventListener('keyup', handler); // defensive: some contenteditable
    // implementations don't fire `input` for every mutation path (e.g.
    // programmatic paste cleanup in React-controlled editors).
    applyComposerDirection(el); // handle pre-filled/draft content on load
  }

  window.HRTL = window.HRTL || {};
  window.HRTL.attachComposerListener = attachComposerListener;
})();
