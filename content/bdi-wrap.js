/**
 * bdi-wrap.js — wraps contiguous Latin/digit/tech-symbol runs (e.g. "C++",
 * "GPT-4", "v1.1") inside detected-Hebrew blocks in <bdi dir="ltr"> so the
 * browser's bidi algorithm treats them as isolated LTR islands instead of
 * reordering their characters as part of the surrounding RTL text.
 *
 * Purely local DOM manipulation — no network access.
 */
(function () {
  // Matches runs like "C++", "GPT-4", "v1.1", "Node.js" — allows a few
  // embedded symbols common in tech terms and single internal spaces so
  // "Claude 3" stays one isolated run rather than splitting awkwardly.
  const LATIN_RUN = /[A-Za-z0-9][A-Za-z0-9+\-.#/]*(?:[ \t][A-Za-z0-9+\-.#/]+)*/g;

  const SKIP_TAGS = new Set(['CODE', 'PRE', 'SCRIPT', 'STYLE', 'BDI', 'TEXTAREA', 'INPUT']);

  // Marks text nodes this script created, so the MutationObserver's re-run
  // of this same function is a fast no-op instead of double-wrapping.
  const PROCESSED = new WeakSet();

  function hasSkippedAncestor(el) {
    let node = el;
    while (node) {
      if (node.nodeType === Node.ELEMENT_NODE && SKIP_TAGS.has(node.tagName)) {
        return true;
      }
      node = node.parentElement;
    }
    return false;
  }

  function wrapLatinRuns(root) {
    if (!root) return;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.parentElement) return NodeFilter.FILTER_REJECT;
        if (PROCESSED.has(node)) return NodeFilter.FILTER_REJECT;
        if (hasSkippedAncestor(node.parentElement)) return NodeFilter.FILTER_REJECT;
        LATIN_RUN.lastIndex = 0;
        if (!LATIN_RUN.test(node.textContent)) return NodeFilter.FILTER_REJECT;
        LATIN_RUN.lastIndex = 0;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const targets = [];
    let n;
    while ((n = walker.nextNode())) targets.push(n);

    for (const textNode of targets) {
      // The node may have been detached by an earlier replace in this same
      // pass (shouldn't happen since each text node is visited once, but
      // guard defensively since we're mutating the tree while iterating).
      if (!textNode.parentNode) continue;

      const text = textNode.textContent;
      LATIN_RUN.lastIndex = 0;
      let match;
      let lastIndex = 0;
      let matched = false;
      const frag = document.createDocumentFragment();

      while ((match = LATIN_RUN.exec(text))) {
        matched = true;
        if (match.index > lastIndex) {
          const before = document.createTextNode(text.slice(lastIndex, match.index));
          PROCESSED.add(before);
          frag.appendChild(before);
        }
        const bdi = document.createElement('bdi');
        bdi.dir = 'ltr';
        const inner = document.createTextNode(match[0]);
        bdi.appendChild(inner);
        frag.appendChild(bdi);
        lastIndex = match.index + match[0].length;
      }

      if (!matched) continue;

      if (lastIndex < text.length) {
        const after = document.createTextNode(text.slice(lastIndex));
        PROCESSED.add(after);
        frag.appendChild(after);
      }

      textNode.replaceWith(frag);
    }
  }

  window.HRTL = window.HRTL || {};
  window.HRTL.wrapLatinRuns = wrapLatinRuns;
})();
