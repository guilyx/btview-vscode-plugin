# Docs site, demo & media

Everything visual about BTView — the browser demo, the documentation screenshots, the promo video and the README GIF — is generated from the **real webview UI** by scripts in this repository. Nothing is drawn by hand, so assets can be refreshed whenever the UI changes.

## Browser demo harness (`demo/`)

A standalone Vite app that mounts the unmodified webview (`webview/src/main.tsx`) inside an iframe and plays the extension host:

| File                             | Role                                                                                                                                                                                                        |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `demo/src/bridge.ts`             | Defines `acquireVsCodeApi()` in the iframe and forwards webview → host messages to the shell                                                                                                                |
| `demo/src/host.ts`               | `DemoHost`: mirrors `BtGraphController` + `DocumentSyncService` over an in-memory file map using `src/btcpp` (parser, include merge, edit ops, validation, serializer, `Simulator`, verifier, trace runner) |
| `demo/src/fixtures.ts`           | Bundles `fixtures/**/*.xml` and their `*.trace.json` scenarios                                                                                                                                              |
| `demo/src/shell.ts`              | VS Code–like chrome: file picker, sim-outcome picker, read-only XML pane with changed-line highlight, Verify / Run trace tests output                                                                       |
| `demo/src/theme.css`             | The `--vscode-*` variables the webview uses (Dark Modern / Light Modern)                                                                                                                                    |
| `demo/src/webview-overrides.css` | Demo-only layout patch for the model list overflow in the side panel                                                                                                                                        |

```bash
npm run demo:dev      # http://localhost:5174/
npm run demo:build    # demo/dist
```

URL parameters: `file=fixtures/nav2/navigate_w_replanning_and_recovery.xml`, `theme=light`, `xml=0` (hide XML pane), `scenario=2` (preselect a trace scenario's mocks). `window.btviewDemo` exposes automation hooks used by the media scripts.

The demo is excluded from the VSIX (`.vscodeignore`) and type-checked by `npm run check-types` (`tsconfig.demo.json`).

## Screenshots and video (`scripts/media/`)

Requirements: Google Chrome or Chromium (set `CHROME_PATH` if it is not in a standard location), `ffmpeg` for the video, and ImageMagick (`convert`/`magick`, optional) to shrink PNGs. Playwright is used through `playwright-core` against the system browser — no browser download.

```bash
npm run media                  # screenshots + video
npm run media:screenshots      # docs/public/screenshots/*.png
npm run media:screenshots -- sim search   # only shots whose name matches
npm run media:video            # docs/public/media/{promo.mp4,demo.gif,poster.png}
```

- **Screenshots** (`screenshots.mjs`) — each shot opens a fresh page at 1440×900 (some wider) with `deviceScaleFactor: 2`, sets up the UI through real clicks and keystrokes, captures the webview iframe (or the whole demo page), then quantizes to a 256-colour PNG.
- **Video** (`video.mjs`) — a scripted 1920×1080 walkthrough recorded through the Chrome DevTools screencast (timestamped JPEG frames), assembled with ffmpeg into a constant 30 fps H.264 `promo.mp4` (yuv420p, faststart). The screencast avoids Playwright's separate ffmpeg download and keeps text sharp. A visible cursor, captions and the title/end cards are HTML overlays (`overlay.mjs`) on top of the live UI. The README `demo.gif` (960 px, 10 fps, palette-optimized) and `poster.png` are cut from the same recording using timeline marks.

To change the story, edit the `walkthrough()` steps in `video.mjs`; each section calls `mark()` so the GIF/poster cut points follow automatically.

## Documentation site (VitePress)

The site is built from `docs/` with `docs/.vitepress/config.mts`, published at <https://guilyx.github.io/btview-vscode-plugin/>.

```bash
npm run docs:dev       # prepares changelog + demo, then serves with hot reload
npm run docs:build     # docs/.vitepress/dist
npm run docs:preview   # serve the build
```

`scripts/docs/prepare.mjs` generates `docs/changelog.md` from `CHANGELOG.md` and builds the demo into `docs/public/demo/` for the **Try it live** page — both are git-ignored. Links in `docs/` that point outside the docs tree (e.g. `../../CHANGELOG.md`) are rewritten to the changelog page or to GitHub by a small markdown-it hook in the config, so they work both on GitHub and on the site. The command and settings reference pages are rendered at build time from `package.json` (`docs/reference/package.data.mts`).

### Deployment

`.github/workflows/docs.yml` builds the site on pull requests that touch `docs/`, `webview/`, `demo/`, `src/btcpp/` or `package.json`, and builds + deploys to GitHub Pages on pushes to `main` (and on manual dispatch). Pages must be configured with **Source: GitHub Actions** in the repository settings.

## Adding a screenshot

1. Add an entry to `SHOTS` in `scripts/media/screenshots.mjs` (fixture, viewport, `run(demo)` steps).
2. `npm run media:screenshots -- <name>` and check the PNG.
3. Reference it from Markdown as `/screenshots/<name>.png`. In `README.md`, use the absolute `https://raw.githubusercontent.com/guilyx/btview-vscode-plugin/main/docs/public/screenshots/<name>.png` URL — the Marketplace renders the README and needs absolute image URLs.
