# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- In-graph **XML Source** / **Graph beside** buttons (header toolbar) when editor title bar icons are unavailable

### Changed

- Regenerate `media/icon.png` from `media/icon.svg` (behavior tree logo; was solid blue placeholder)
- Title bar toggle uses `editorLangId == xml` (same pattern as built-in Markdown preview) so graph/XML icons appear on the XML editor tab
- Title bar menu `when` clauses; add `webview/title` buttons for side preview panel

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
