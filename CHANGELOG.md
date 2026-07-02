# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Bounded formal verification** (`src/btcpp/verify/boundedCheck.ts`) — exhaustively enumerates every SUCCESS/FAILURE combination of a tree's leaves, runs the exec-core `Simulator` for each, and proves reachability/termination properties ("root can succeed", "root can fail", "always terminates") with witnesses/counterexamples. Offline, no external solver. Exposed via `BTView: Verify Tree (Bounded Check)` (roadmap Phase 5)
- **Tick-semantics exec core** (`src/btcpp/exec/`) — a pure, offline BehaviorTree.CPP simulator: `NodeStatus`, a stateful `Simulator` with faithful memory/reactive control flow (Sequence, SequenceWithMemory, ReactiveSequence, Fallback/ReactiveFallback, Parallel, IfThenElse), decorators (Inverter, Force\*, Repeat, Retry, RunOnce), SubTree expansion, a minimal Script/blackboard, and pluggable leaf outcome providers. Foundation for signal-firing overlays and the trace-testing pipeline (roadmap Phase 2)

### Fixed

- **Webview crash** — add missing `useEffect` import in `graphContext.tsx`; the graph webview threw `useEffect is not defined` and failed to render (root `tsconfig.json` only type-checks `src/**`, so the missing import was never caught)

## [0.9.0] - 2026-06-22

### Changed

- **Dependencies** — consolidate Dependabot bumps: esbuild 0.28.1, fast-xml-parser 5.9.3, vitest 4.1.9, typescript-eslint 8.61.1, @types/vscode 1.125.0, eslint 10, TypeScript 6; bump `engines.vscode` to ^1.125.0

### Fixed

- **ESLint 10** — remove useless `kind` initializer in `xmlUtils.ts` (`no-useless-assignment`)
- **TypeScript 6** — add `types: ["node"]` to `tsconfig.json`; add `@eslint/js` for ESLint 10 flat config

### Added

- **Model CRUD** — add/delete custom `TreeNodesModel` entries from the model panel (E-21)
- **Palette port tooltips** — port direction and type hints on palette nodes from models (E-22)
- **Export model snippet** — copy single-model XML to clipboard from model panel (E-23)
- **Shortcut cheat sheet** — `?` key and Command Palette `btview.graph.showShortcutHelp` (E-46)
- **Graph Command Palette commands** — fit view, toggle legend/ports, focus search, delete node (E-47)
- **Simple mode** — `btview.simpleMode` hides advanced context menu items and Save types button (E-40)

## [0.8.0] - 2026-06-16

### Added

- **Editor roadmap** — [docs/planning/EDITOR_ROADMAP.md](docs/planning/EDITOR_ROADMAP.md) long-horizon checklist (0.5–1.0); monitor deferred to 1.1+
- **Command surfaces spec** — [docs/planning/COMMAND_SURFACES.md](docs/planning/COMMAND_SURFACES.md) shortcuts and context menu inventory
- **Color legend** — node kind swatches in graph (`KindLegend`, `Ctrl+Shift+G`)
- **Keyboard shortcuts** — Delete, Escape, F2 rename, Ctrl+F search, Ctrl+0 fit view, Ctrl+Z/Y undo/redo, copy/cut/paste/duplicate subtree
- **Context menus** — canvas, node, and staged-node right-click menus
- **Node search** — filter/highlight nodes by name, type, or kind
- **Undo / redo** — host-side edit stack with webview shortcuts
- **Typed ports** — inspector sections (Inputs/Outputs/InOut/Custom) with direction badges; port chips on nodes (`Ctrl+Alt+P`)
- **Port validation** — warnings for unknown attributes on model-defined nodes
- **Model editor panel** — lists `TreeNodesModel` entries with port counts
- **Export workspace config** — “Save types” merges `btview.nodeTypeMap` and writes `.btview/models.xml`
- **Copy / paste subtree** — clipboard with full subtree JSON round-trip
- **Layout persistence** — sidecar `.btview/layouts/*.json`; snap-to-grid on drag
- **Subtree drill-down** — double-click SubTree or context menu; back navigation
- **Drop-target highlight** — visual feedback when dragging staged nodes over parents
- Settings: `btview.showNodePorts`, `btview.customModelsInclude`
- Commands: `btview.graph.undo`, `btview.graph.redo`, `btview.exportWorkspaceConfig`

### Fixed

- **Invisible graph nodes** — restore flex height chain for `.graph-pane` / `.graph-container` so React Flow receives a non-zero canvas height after the 0.5 layout wrapper change; regression tests for layout CSS and node enrichment
- **CI type-check crash** — fix port direction typing in shared protocol so webview/typecheck stays consistent across unit+integration builds
- **Dev tagging policy** — documented in [docs/development/BRANCHING.md](docs/development/BRANCHING.md)

### Previously unreleased (docs reorg)

- **Hierarchical documentation** — [docs/README.md](docs/README.md) index
- **AI agent integration roadmap** — [docs/planning/AI_AGENT_INTEGRATION.md](docs/planning/AI_AGENT_INTEGRATION.md)

## [0.4.3] - 2026-06-11

### Added

- **Editable node kind & type** — inspector dropdown (action/control/…) and registered ID field; `changeNodeType` protocol
- **Groot parity plan** — [docs/planning/GROOT_PARITY.md](docs/planning/GROOT_PARITY.md)
- **Webview integration guide** — [docs/development/WEBVIEW.md](docs/development/WEBVIEW.md) postmortem on infinite loading
- Cursor rule `.cursor/rules/webview-html.mdc`

## [0.4.2] - 2026-06-11

### Added

- **Branded loading screen** — animated tree logo and progress bar while the graph boots

### Fixed

- **Infinite loading (root cause)** — Vite’s module script in `<head>` was rewritten without `defer`, so the bundle ran before `#root` existed and React never mounted; HTML now uses `defer` at end of `<body>`
- **First paint reliability** — embed parsed document in webview HTML (`__BTVIEW_BOOT__`) so the graph can render before postMessage handshake

## [0.4.1] - 2026-06-11

### Fixed

- **Infinite “Loading behavior tree…”** — early `window.message` buffer before React mounts; host retries `loadDocument` until webview `loaded` ack; `loadFromText` on custom editor open; error surface when parse payload is empty

## [0.4.0] - 2026-06-14

### Added

- **Staged (dangling) nodes** — palette drag or click places nodes on the canvas without auto-connecting to a parent
- **Edge connect** — connect parent → child via React Flow handles to commit `addNode` or `reparentNode`
- **Set as tree root** — inspector action for staged control nodes on an empty tree

### Fixed

- **BT Graph load reliability** — `WebviewOutboundGate` queues host messages until webview `ready`; ready-driven flush after HTML reload
- **Infinite “Loading behavior tree…”** regressions from 0.3.1 ready handshake
- Register webview message listener before setting HTML; webview retries `ready` after 500ms if no document received

### Changed

- Graph canvas always shown (including empty trees); palette no longer targets a guessed `parentPath`
- Roadmap: **0.5.0** simulation monitor milestone documented

## [0.3.1] - 2026-06-12

### Fixed

- **Black screen in BT Graph (0.3.0 regression)** — webview CSP now allows extension script/style origins; boot loading text shows before React mounts; reload webviews after extension upgrade; first document push waits for webview `ready` handshake
- Release CI asserts VSIX webview assets and publishes the verified artifact via `--packagePath`

## [0.3.0] - 2026-06-11

### Added

- **`btview.nodeTypeMap`** — map custom node IDs to kinds for parsing and the add-node palette
- **`btview.newTree`** wizard — pick format (v3/v4), tree ID, empty canvas or root control
- **Node palette sidebar** — searchable builtins + models + configured nodes; click or drag onto canvas
- **Empty canvas authoring** — blank graph materializes root via palette; syncs to XML
- In-graph **XML Source** / **Graph beside** buttons when editor title bar icons are unavailable

### Fixed

- TreeNodesModel kind inference for explicit `<Action>`, `<Control>`, and `<Decorator>` wrapper tags
- `addNode` on empty `BehaviorTree` now creates the root node instead of silently failing

### Changed

- Graph layout uses docked node palette sidebar instead of compact top toolbar
- Regenerate `media/icon.png` from `media/icon.svg` (behavior tree logo; was solid blue placeholder)
- Title bar toggle uses `editorLangId == xml` (Markdown-style) for graph/XML icons on the XML editor tab
- Title bar menu `when` clauses; `webview/title` buttons for side preview panel

## [0.2.1] - 2026-06-12

### Fixed

- **Black screen in BT Graph** when installed from Marketplace/VSIX — `webview/dist` assets were excluded by `.vscodeignore`
- CI asserts `webview/dist/assets/index.js` and `index.css` are present in every VSIX build

## [0.2.0] - 2026-06-12

### Added

- Open VSX (Cursor) publishing in release CI via `ovsx publish`; `publish-registries` workflow_dispatch for existing tags
- `scripts/publish-registries.sh` for local dual-registry publish
- `devel` integration branch; `docs/BRANCHING.md` for two-branch workflow
- `@vitest/coverage-v8`; unit coverage in CI and `verify.sh` (thresholds on `src/btcpp/`)

### Changed

- Feature PRs target `devel`; `main` reserved for releases and release candidates
- CI runs on pushes to `devel` and `main`
- CI release job also triggers on `v*.*.*` tag push (not only published GitHub Release)
- Pre-commit hooks use `scripts/with-node.sh` + `--check` mode; add `scripts/verify.sh` and CI gate rules for agents
- `AGENTS.md`, `CONTRIBUTING.md`, cursor rules, and `docs/RELEASE.md` document branching model
- Dual distribution: VS Code Marketplace + Open VSX (Cursor) on every tagged release

### Fixed

- Pre-commit prettier/eslint failed on system Node 12 outside `with-node.sh`
- Release CI job now `needs: [pre-commit, build]` (no publish on red checks)
- Exclude `coverage/` from VSIX package (`.vscodeignore`)

## [0.1.0] - 2026-06-12

### Added

- Publisher `rangonomics`; extension ID `rangonomics.btview`
- `AGENTS.md`, `webview/AGENTS.md`, `.cursor/rules/` for AI agent onboarding
- `docs/RELEASE.md`, `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`, GitHub issue/PR templates
- `CONTRIBUTING.md`, `SECURITY.md`
- CI: VSIX packaging on ubuntu builds; release job publishes to Marketplace + GitHub Release
- `scripts/verify-release.sh` version gate
- Shared `src/shared/protocol.ts` for typed host ↔ webview messages
- `WebviewPanelManager`, `DocumentRefreshScheduler`; slim `BtGraphController` facade
- `OutputChannel('BTView')`, `DiagnosticsService` for validation issues
- `commands/targetUri.ts`, `commands/convertToV4.ts` (removed deprecated `BtPreviewManager`)
- Webview: `NodePicker`, `WarningsPanel`, debounced Inspector, drop-target reparent UX
- Unit tests: validation, editOperations, layout; Vitest coverage config
- **Custom Text Editor** (`BT Graph`) with Reopen With / Open XML Source (Markdown-like UX)
- Side-by-side graph preview (`Ctrl+K V`) while keeping the XML editor
- `btview.defaultOpenMode` setting (`text` | `graph` | `side`)
- `btview.openSource` command and title bar buttons
- BehaviorTree.CPP v3.8 and v4 XML parsing and serialization
- Visual graph editor webview with React Flow
- Bidirectional XML sync
- ROS `ros_pkg` include resolution
- v3 to v4 migration command
- Unit and integration tests
- Documentation (user guide, development, distribution, configuration)

### Changed

- Distribution: VS Code Marketplace primary; GitHub Releases for VSIX downloads
- Integration test asserts `rangonomics.btview` activates (no silent pass)
- `validateDocument` wired on parse; reparent edits return structured errors
- Skip redundant refresh after self-initiated graph edits
- `documentChanged` vs `loadDocument` for incremental webview updates
- v3 `TreeNodesModel` serialization preserves node kind wrapper tags
- Include resolver uses async `fs.promises.readFile`
- ROS cache cleared on `btview.*` config change
- `BtFlowNode` memoized; viewport persisted via `vscode.setState`
- Land full feature stack on `main` (stacked PRs #2–#6: parser, webview, host, custom editor, docs)
- Bump `elkjs` to 0.11.1, `react`/`react-dom` to 19.x
- Replace Husky + lint-staged with [pre-commit](https://pre-commit.com) (`.pre-commit-config.yaml`)
- CI runs `pre-commit run --all-files` on every PR; push triggers limited to `main` only

### Fixed

- macOS/Windows CI: install Rollup native bindings after `npm ci` (npm optional-deps bug)
- CI runs on pull requests targeting any branch (stacked `feat/*` PRs included)
- GitHub Actions no longer fails when `with-node.sh` calls `nvm use` for an uninstalled `.nvmrc` version
- Title bar graph/XML toggle buttons now appear in the primary navigation area (Markdown-style single icon with Alt+click for side preview), not hidden under `...`

### Removed

- `examples/` directory from the repository (kept local-only via `.gitignore`)
