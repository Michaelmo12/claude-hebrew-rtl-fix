# Privacy

This extension makes **zero network requests**, has **zero dependencies**, and performs **zero data collection**. This isn't a marketing claim — it's verifiable directly from the source:

- **No network access.** `manifest.json` declares no `host_permissions` beyond the single content-script match for `https://claude.ai/*`, and no `permissions` at all. There is no `background` script. No file in `content/` calls `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, or opens any connection of any kind. You can confirm this yourself:

  ```sh
  grep -rniE "fetch\(|XMLHttpRequest|WebSocket|sendBeacon" content/ styles/
  ```

  This should return nothing.

- **No data collection.** The extension never reads anything except the text already visible in the page's own DOM (to detect Hebrew and apply styling), and never writes it anywhere — not to `localStorage`, not to `chrome.storage`/`browser.storage` (no `storage` permission is even requested), not to any server. Nothing is logged, tracked, or transmitted.

- **No dependencies at runtime.** The shipped extension is plain, unbundled JavaScript and CSS — no third-party libraries, no analytics SDKs, no remote code loading (which Manifest V3 disallows for content scripts anyway). The only `devDependency`-adjacent tooling used during development (`web-ext lint` via `npx`, for linting before packaging) never ships inside the extension itself and never runs in your browser.

- **No telemetry, no update pings beyond what Firefox itself does** for any installed extension (checking `browser_specific_settings` / AMO for updates is a browser-level mechanism, not something this extension initiates).

If you find anything in this repository that contradicts the above, please open an issue — that would be a bug in this description, not an intended feature.
