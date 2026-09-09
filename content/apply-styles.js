/**
 * apply-styles.js — decides which blocks are Hebrew-dominant and tags them
 * with a class that the (static, local) stylesheet in styles/content.css
 * reacts to. Also holds the one place claude.ai-specific selectors live,
 * so they're easy to update after inspecting the live page.
 *
 * No network access.
 */
(function () {
  // The only claude.ai-specific strings in the whole extension. Update
  // these here after inspecting the real DOM (see README "known first-run
  // tuning step"). Both fall back to generic, class-name-independent
  // selectors so the extension still works before this is tuned.
  const SELECTORS = {
    messageContainer:
      '[data-testid="message"], [data-testid*="message"], main [class*="message"]',
    composer: '[contenteditable="true"], textarea',
  };

  // Block-level tags whose *own* text (not descendants') decides direction.
  // Only these get the .hrtl-hebrew-block class / cleared of it.
  const BLOCK_TAGS = new Set(['P', 'LI', 'UL', 'OL', 'DIV', 'SPAN', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'TD', 'TH']);

  const HEBREW_CLASS = 'hrtl-hebrew-block';

  function directTextOf(el) {
    // Only this element's own text nodes, not nested block descendants —
    // avoids double counting and lets nested Hebrew/English blocks be
    // classified independently (e.g. a Hebrew <li> containing an English
    // <code> child still classifies correctly at the <li> level, since the
    // ratio in detect.js already discounts non-letters and bdi-wrap.js
    // isolates the Latin runs after the fact).
    let text = '';
    for (const child of el.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        text += child.textContent;
      } else if (child.nodeType === Node.ELEMENT_NODE && !['SCRIPT', 'STYLE'].includes(child.tagName)) {
        text += child.textContent;
      }
    }
    return text;
  }

  function isCodeElement(el) {
    return !!el.closest('pre, code');
  }

  function applyStylesToBlocks(root) {
    if (!root) return;

    // UL/OL are handled as whole units (see plan: flip the list as one
    // block rather than per-<li>), so include them explicitly alongside
    // paragraph-like elements.
    const candidates = root.querySelectorAll(
      'p, li, ul, ol, h1, h2, h3, h4, h5, h6, blockquote, td, th, div, span'
    );

    for (const el of candidates) {
      if (isCodeElement(el)) continue;
      if (!BLOCK_TAGS.has(el.tagName)) continue;

      const text = el.tagName === 'UL' || el.tagName === 'OL' ? el.textContent : directTextOf(el);
      if (!text || !text.trim()) continue;

      const hebrew = window.HRTL.isHebrewDominant(text);
      if (hebrew) {
        el.classList.add(HEBREW_CLASS);
      } else if (el.classList.contains(HEBREW_CLASS)) {
        // Content changed direction (e.g. streamed edit) — idempotent
        // re-check, cheap early state correction.
        el.classList.remove(HEBREW_CLASS);
      }
    }
  }

  window.HRTL = window.HRTL || {};
  window.HRTL.SELECTORS = SELECTORS;
  window.HRTL.applyStylesToBlocks = applyStylesToBlocks;
})();
