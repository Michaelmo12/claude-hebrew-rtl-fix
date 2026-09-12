# Hebrew RTL Fix for Claude

A small Firefox extension that fixes how [claude.ai](https://claude.ai) renders Hebrew text.

| Without the extension | With it |
|---|---|
| Hebrew answers left-aligned | Right-aligned, like Hebrew should be |
| Periods/punctuation jump to the wrong end of sentences | Punctuation lands where it belongs |
| C++, GPT-4, English terms scrambled inside Hebrew text (renders as "++C") | Rendered intact via `<bdi>` isolation |
| List bullets/numbers stuck on the left of RTL lists | Bullets flip to the right |
| The input box stays LTR while you type Hebrew | Live direction detection as you type |
| Code blocks | Untouched — always LTR, as they should be |

## Privacy & trust

**Zero network requests. Zero dependencies. Zero data collection.** This is designed to be verifiable, not just claimed — see [`PRIVACY.md`](./PRIVACY.md) for exactly how, and feel free to grep the source yourself:

```sh
grep -rniE "fetch\(|XMLHttpRequest|WebSocket|sendBeacon" content/ styles/
```

`manifest.json` requests no permissions beyond running on `claude.ai` itself, and there's no background script — the whole extension is a content script that reads the page's own text and applies local styling. Nothing leaves your browser.

## How it works

- **Detection** (`content/detect.js`): scores each block of text by the fraction of Hebrew-range characters it contains, so a Hebrew sentence with a few embedded English/code words is still classified as Hebrew.
- **Alignment & punctuation** (`content/apply-styles.js`, `styles/content.css`): tags detected blocks with a class that sets `direction: rtl; unicode-bidi: isolate; text-align: right`, letting the browser's own (correct) bidi algorithm place trailing punctuation — no manual character reordering.
- **`<bdi>` isolation** (`content/bdi-wrap.js`): walks text inside Hebrew blocks and wraps Latin/tech-term runs (`C++`, `GPT-4`, `v1.1`) in `<bdi dir="ltr">` so they render intact instead of getting visually scrambled by the surrounding RTL text.
- **Lists**: `direction: rtl` on `<ul>/<ol>/<li>` is natively sufficient to move bullets/numbers to the right — no custom marker hack.
- **Code blocks**: explicitly, defensively excluded (`direction: ltr !important`) everywhere, so they never flip even when nested inside Hebrew text.
- **Live composer** (`content/composer.js`): listens for input on Claude's message box and toggles its direction live as you type, instead of leaving it stuck LTR.
- **Observer** (`content/observer.js`): a single debounced `MutationObserver` re-applies all of the above as new/streamed messages appear.

## Known first-run tuning step

claude.ai's exact DOM structure (class names, `data-testid` attributes, whether the composer is `contenteditable` or a `<textarea>`) can change between deploys and wasn't inspected live while building this. All claude.ai-specific selectors live in one place — the `SELECTORS` constant at the top of `content/apply-styles.js` — with generic structural fallbacks so the extension still works before tuning. If something doesn't target correctly after installing, that's the file to check first (and PRs welcome).

## Installing

### Quick way: temporary add-on (any Firefox, gone on restart)

1. Clone this repo.
2. In Firefox, go to `about:debugging#/runtime-this-firefox`.
3. Click **Load Temporary Add-on** and select `manifest.json`.
4. Open claude.ai and send/receive a Hebrew message.

This is removed every time Firefox restarts, so it's fine for a quick try but not for daily use.

### Persistent install: Firefox Developer Edition / Nightly / ESR (survives restarts, no `about:debugging`)

Release Firefox only runs extensions signed by Mozilla (AMO). **Developer Edition, Nightly, and unbranded ESR builds** let you disable that check and install an unsigned `.xpi` permanently through the normal `about:addons` UI instead:

1. Build the package:
   ```sh
   npm run build
   ```
   This produces `dist/claude-hebrew-rtl-fix-v<version>.xpi`.
2. In Firefox Developer Edition, go to `about:config`, accept the risk warning, search for `xpinstall.signatures.required`, and set it to `false`. (This pref doesn't exist / can't be flipped on release Firefox — that's expected and by design on Mozilla's part.)
3. Go to `about:addons` → the gear icon (⚙) → **Install Add-on From File...** → select the `.xpi`.
4. It now installs like any other extension and stays installed across restarts, updates, etc. — no need to reload it from `about:debugging` again.

Since step 2 turns off signature verification for *all* extensions, only do this on a profile/build you use for development, and only install `.xpi` files you've built yourself or otherwise trust.

A properly signed AMO release (installable on release Firefox with no config changes) is the eventual goal; see `browser_specific_settings.gecko.id` in `manifest.json`, which currently holds a placeholder pending actual submission.

## Testing locally without claude.ai

Open `test/test.html` directly, or serve it locally — it has hardcoded Hebrew/English/list/code samples so you can check every row of the table above without needing claude.ai reachable. To actually run the content scripts against it during development, temporarily add a matching pattern (e.g. `"file:///*"`) to `content_scripts.matches` in `manifest.json` — revert that before packaging for AMO.

## Building

```sh
npm run icons   # regenerate icons/icon-*.png (dependency-free, uses only Node's built-in zlib)
npm run build   # regenerate icons + zip into dist/claude-hebrew-rtl-fix-v<version>.zip
npm run lint    # runs `web-ext lint` (via npx) as an AMO-readiness check
```

## License

MIT — see [`LICENSE`](./LICENSE).
