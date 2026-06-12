# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
