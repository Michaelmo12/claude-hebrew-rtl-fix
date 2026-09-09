/**
 * detect.js — shared Hebrew-detection primitive.
 *
 * No network access, no external calls: this file only inspects strings
 * that are already present in the page's own DOM.
 */

// Attached to `window` (not `export`) because content scripts here are
// loaded as plain, unbundled files sharing one top-level scope per tab —
// see manifest.json's content_scripts.js order.
(function () {
  const HEBREW_RANGE_G = /[֐-׿]/g;

  // Characters that don't count as "letters" for ratio purposes: whitespace,
  // digits, and common punctuation. This keeps the ratio meaningful for
  // short strings that are mostly punctuation/numbers.
  const NON_LETTER = /[\s\d.,!?;:'"()[\]{}\-–—/\\@#$%^&*_+=<>~`|]/g;

  /**
   * Returns the fraction (0..1) of "letter" characters in `text` that fall
   * in the Hebrew Unicode block.
   */
  function hebrewRatio(text) {
    if (!text) return 0;
    const letters = text.replace(NON_LETTER, '');
    if (letters.length === 0) return 0;
    const hebrewMatches = text.match(HEBREW_RANGE_G);
    const hebrewCount = hebrewMatches ? hebrewMatches.length : 0;
    return hebrewCount / letters.length;
  }

  /**
   * Default threshold is intentionally below 0.5: real Hebrew paragraphs
   * often mix in English/code terms ("C++", "GPT-4") and still read as
   * Hebrew text that should be right-aligned as a whole.
   */
  function isHebrewDominant(text, threshold) {
    const t = typeof threshold === 'number' ? threshold : 0.3;
    return hebrewRatio(text) >= t;
  }

  window.HRTL = window.HRTL || {};
  window.HRTL.hebrewRatio = hebrewRatio;
  window.HRTL.isHebrewDominant = isHebrewDominant;
})();
