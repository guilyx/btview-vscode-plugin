# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Onboarding empty states** (E-41) — XML that cannot be loaded now shows the syntax error with its line/column and an **Open XML Source** button (and an error in the Problems panel) instead of a blank or half-parsed graph; the graph recovers on its own once the XML parses. Files without a `<BehaviorTree>` offer **Add BehaviorTree**, empty trees offer **Start with Sequence / Fallback**, the palette explains empty searches with **Clear search**, and a dismissible first-run tips card is remembered across editors. `BTView: New Behavior Tree` opens an empty canvas in the graph and accepts arguments (`uri`, `formatVersion`, `treeId`, `rootControl`, `openIn`) to run without prompts
- **Accessibility pass** (E-44) — node cards expose an accessible name (kind, type, instance name, children, simulation status, issues) and Tab/arrow navigation moves keyboard focus with the selection; `Enter` jumps into the inspector and `Shift+F10` / the Menu key open the context menu, which now supports arrow keys, `Home`/`End`, `Escape` and focus return. A polite live region announces selection and simulation results, the shortcut dialog is a proper modal, toolbar and legend buttons carry labels and pressed state, and focus rings use the theme focus color. High-contrast themes get solid borders and outlines, secondary text uses the theme description color, and `prefers-reduced-motion` stops the RUNNING pulse, loader animation and viewport transitions
- **Editor RC integration tests** (E-45) — the VS Code test suite now opens the v3, v4 and Nav2 fixtures in the graph editor, round-trips add/rename/delete edits through `DocumentSyncService` with undo/redo, applies quick fixes from both the XML lightbulb and the graph path, and covers in-place and previewed v3 → v4 conversion, argument-driven `btview.newTree`, and the load-error path; unit tests cover the new locator, quick-fix, onboarding and accessibility helpers
- **Validation quick-fixes** (E-43) — BTView diagnostics now carry stable codes (`undefined-subtree`, `missing-main-tree`, `missing-required-port`, `duplicate-tree-id`, `missing-btcpp-format`, …) and point at the offending element instead of line 1. Lightbulb fixes in the XML editor: create a stub `<BehaviorTree>` for an unknown SubTree ID, set `main_tree_to_execute`, add a missing required port (`port="{port}"`), rename a duplicate tree ID, declare `BTCPP_format="4"`, remove an unknown attribute, or convert a v3 file to v4 (also under **Source Action…**). The graph Issues panel and inspector show the same fixes as **Fix** buttons; they apply minimal text edits (comments and formatting are kept) and graph Undo reverts them. Diagnostics are also published for BTCpp XML opened as plain text, without a graph
- **BT-aware XML completion** (`src/language/`) — in the text editor, BehaviorTree.CPP files get completion for node names (built-ins for the detected v3/v4 format, TreeNodesModel entries from the file, its includes and `.btview/models.xml`, and `btview.nodeTypeMap`), port and common attributes (`name`, v4 `_skipIf`/`_successIf`/`_failureIf`/`_while`/`_onSuccess`/`_onFailure`/`_post`/`_onHalted`), `<SubTree ID>` / `main_tree_to_execute` tree IDs, and `{blackboard}` keys already used in the file. Non-BT XML is untouched
- **XML hover** — node kind, source (built-in / TreeNodesModel / include path) and ports table on node names; direction, type, default and description on port attributes; every read/write/remap of a `{key}` blackboard entry
- **XML go to definition, references and rename** — `<SubTree ID>` → `<BehaviorTree ID>` (same file or resolved include), custom node → its TreeNodesModel entry, `<include path>` → the file (including `ros_pkg`); references for tree IDs, custom nodes and blackboard keys; renaming a `<BehaviorTree ID>` updates its SubTree references and `main_tree_to_execute`
- **XML outline and CodeLens** — Outline view lists trees with their nested node hierarchy, includes and the TreeNodesModel section; a CodeLens above each `<BehaviorTree>` opens it in the BT Graph and shows its node and SubTree reference counts
- **`btview.languageFeatures.enabled`** setting (default `true`) to turn the text editor features off
- **Bounded formal verification** (`src/btcpp/verify/boundedCheck.ts`) — exhaustively enumerates every SUCCESS/FAILURE combination of a tree's leaves, runs the exec-core `Simulator` for each, and proves reachability/termination properties ("root can succeed", "root can fail", "always terminates") with witnesses/counterexamples. Offline, no external solver. Exposed via `BTView: Verify Tree (Bounded Check)` (roadmap Phase 5)
- **Behavior-tree trace-testing pipeline** (`src/btcpp/exec/trace.ts`) — declarative `*.trace.json` scenarios (leaf mocks + per-tick/final assertions on node status, root status, and blackboard) run against a tree via the exec core. A Vitest discovery test executes every `fixtures/**/*.trace.json` as a CI behavior gate; sample traces added for `simple_sequence`, `fallback_recovery`, and a two-tick `subtree_running` (roadmap Phase 3 / E-45)
- **Live signal-firing overlays** — step/play/pause/reset an offline simulation of the active tree from a new graph toolbar (or `BTView: Simulate: Step One Tick` / `Reset`). Nodes light up with RUNNING/SUCCESS/FAILURE status as ticks fire, the blackboard readout updates, and edits clear the run. Host drives the Phase 2a `Simulator`; new `sim`/`tickUpdate` protocol messages carry per-node status (roadmap Phase 2b)
- **Tick-semantics exec core** (`src/btcpp/exec/`) — a pure, offline BehaviorTree.CPP simulator: `NodeStatus`, a stateful `Simulator` with faithful memory/reactive control flow (Sequence, SequenceWithMemory, ReactiveSequence, Fallback/ReactiveFallback, Parallel, IfThenElse), decorators (Inverter, Force\*, Repeat, Retry, RunOnce), SubTree expansion, a minimal Script/blackboard, and pluggable leaf outcome providers. Foundation for signal-firing overlays and the trace-testing pipeline (roadmap Phase 2)
- **Static verification pack** — `validateDocument` now checks SubTree references resolve to a defined tree, `main_tree_to_execute` exists, `<BehaviorTree ID>` uniqueness, recursive subtree cycles, and required (input/inout, no-default) ports. Surfaces in the Problems panel and inspector alongside existing structural checks (roadmap Phase 1 / E-43)
- **Tidy tree layout** — parents are centered over their children instead of each depth being laid out independently, so large trees read as nested subtrees without overlaps
- **Kind glyphs** — node cards and the legend show Groot-style glyphs (`→` Sequence, `?` Fallback, `⇉` Parallel, `↻` Retry, …) with a per-kind accent color
- **Search navigation** — match counter in the search box; `Enter` / `Shift+Enter` cycle through matches and center the viewport on each (E-44 groundwork)
- **Keyboard tree navigation** — arrow keys walk the tree: `↑` parent, `↓` first child, `←`/`→` siblings (E-44)
- **Drill-down breadcrumbs** — subtree drill-in shows a clickable breadcrumb trail instead of a single Back button
- **Minimap upgrades** — nodes colored by kind, pannable and zoomable
- **Nav2 fixture** — `fixtures/nav2/navigate_w_replanning_and_recovery.xml` with `TreeNodesModel` for the custom Nav2 nodes, plus parser regression tests (E-42)

### Changed

- **Dependencies** — consolidate Dependabot bumps (#76, #77, #79–#84): vite 8.1.4, vitest 4.1.10, @vitest/coverage-v8 4.1.10, eslint 10.8.0, typescript-eslint 8.66.0, @xyflow/react 12.11.2, @types/node 26.1.2, @commitlint/cli 21.2.1. TypeScript 7 (#78) held back until typescript-eslint supports it
- **Dependabot** — PRs now target `devel` instead of `main`
- **Node card design** — kind-colored accent bar and glyph chip, child-count badge, subtree open hint, truncation for long names; edges, controls, and minimap themed to match the active VS Code theme

### Fixed

- **Includes inlined on save** — any graph edit re-serialized the whole document, including trees and `TreeNodesModel` entries merged in from `<include>`d files, copying them into the including file. Saving now writes only what the file itself declares; included trees and models are read-only in the including file (edits explain which file to open), and local model definitions take precedence over included ones
- **Webview crash** — `GraphContextProvider` used `useEffect` without importing it, crashing the graph editor at mount; the webview is now typechecked (`tsconfig.webview.json`, wired into `npm run check-types`) so missing imports and type drift fail CI
- **Broken install** — `npm ci` failed after the vite 8 bump (`@vitejs/plugin-react@4` peer conflict); upgraded to `@vitejs/plugin-react@6`
- **macOS integration tests** — bump `@vscode/test-electron` to 3.1.0; VS Code 1.110+ renamed the macOS app binary and the old runner failed with `spawn …/Contents/MacOS/Electron ENOENT`
- **Issues panel** — clicking a validation issue now selects the offending node and centers the viewport on it (was a no-op)

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
