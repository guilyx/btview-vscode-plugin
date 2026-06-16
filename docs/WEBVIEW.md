# Webview integration guide

How the BT Graph React UI is hosted inside VS Code/Cursor, and **what went wrong** in 0.3.x–0.4.1 (infinite loading).

## Architecture

```text
extension host (Node)
  BtGraphController.refreshUri()
    → WebviewOutboundGate.post(loadDocument)   # queues until webview sends `ready`
    → webview.postMessage(...)

webview (iframe)
  hostMessages.ts     # window 'message' listener (before React)
  bootstrap.ts        # window.__BTVIEW_BOOT__ from inline HTML script
  App.tsx             # React UI
```

See also [ARCHITECTURE.md](ARCHITECTURE.md) for the full stack.

## HTML generation (`src/preview/webviewHtml.ts`)

We **do not** reuse Vite’s `webview/dist/index.html` as the runtime shell. Vite emits:

```html
<head>
  <script type="module" crossorigin src="./assets/index.js"></script>
</head>
<body>
  <div id="root"></div>
</body>
```

Early versions regex-replaced that script tag but **dropped `type="module"`** while leaving the script in `<head>`. A classic (non-module) `<head>` script runs **synchronously before `<body>` is parsed**, so `#root` does not exist yet → React throws → the panel stays on the static loading text forever while the host keeps logging `push loadDocument` (messages queued, never consumed).

### Rules (mandatory)

| Do                                                                              | Don't                                                         |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Emit a **single hand-written HTML template** in `getWebviewHtml()`              | Regex-patch `webview/dist/index.html` for script placement    |
| Load the bundle with `<script defer …>` **after** `#root` at end of `<body>`    | Put the app bundle in `<head>` without `defer`                |
| Embed first document as `window.__BTVIEW_BOOT__` (JSON, escaped)                | Rely only on `postMessage` for initial paint                  |
| Register `hostMessages` listener via side-effect import **before** `createRoot` | Attach the only `message` listener inside a React `useEffect` |
| Call `WebviewOutboundGate.markNotReady()` whenever `webview.html` is set        | Post `loadDocument` assuming the webview is already listening |
| Include `webview/dist/assets/*` in the VSIX (see `.vscodeignore`)               | Ignore `webview/dist/` in packaging                           |
| Bump `extensionVersion` query on script/CSS URIs after webview changes          | Cache stale bundles across extension upgrades                 |

## Handshake

1. Webview boots → `signalReady()` → host `markReady()` + flush queue + `refreshUri(..., forceLoadDocument)`.
2. Host posts `loadDocument` / `documentChanged`.
3. Webview applies payload → posts `{ type: 'loaded' }` → host stops retry timer.

Log lines in **Output → BTView** should show `ready=true` on push after the webview has booted.

## Debugging

1. **Developer: Open Webview Developer Tools** on the BT Graph tab.
2. Console: script errors, missing `#root`, CSP blocks.
3. Output → BTView: `webview ready`, `webview loaded document`, `push loadDocument (ready=true)`.
4. If `ready=false` repeatedly, the bundle did not mount — check script URL and CSP.

## Branded loader

Static splash HTML + inline CSS in `webviewHtml.ts` mirrors the React `LoadingScreen` so users see the animated tree logo before the bundle executes.

## Related fixes by release

- **0.3.1** — CSP, `.vscodeignore` shipping `webview/dist`
- **0.4.1** — `hostMessages` buffer, `loaded` ack, retry loop
- **0.4.2** — `defer` script, `__BTVIEW_BOOT__`, stop patching Vite HTML
