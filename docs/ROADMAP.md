# BTView Roadmap

Current version: **0.1.0** (released 2026-06-12).

Publisher: **rangonomics** · Extension ID: `rangonomics.btview`

## Milestones

| Version   | Focus                                                                   | Status   |
| --------- | ----------------------------------------------------------------------- | -------- |
| **0.1.0** | Distribution: publisher, icon, VSIX CI, Marketplace publish, agent docs | Released |
| **0.2.0** | Architecture: protocol, controller split, validation, diagnostics       | Planned  |
| **0.3.0** | Performance: edit debounce, skip self-refresh, async includes           | Planned  |
| **0.4.0** | UX: node picker, reparent/reorder, warnings panel, a11y                 | Planned  |
| **1.0.0** | Professional-grade criteria met                                         | Planned  |

## Phase details

### 0.1.0 — Ship

- VS Code Marketplace (primary) + GitHub Releases (VSIX)
- `AGENTS.md`, release automation, integration test fixes

### 0.2.0 — Foundation

- Shared `src/shared/protocol.ts`
- Split `BtGraphController` (panel manager, refresh scheduler)
- Output channel, edit error contract
- Validation wired to parse/edit + Problems panel

### 0.3.0 — Performance

- Inspector commit-on-blur / debounce
- Skip redundant re-parse after self-initiated edits
- Async include I/O, webview viewport persistence

### 0.4.0 — UX

- Node picker from `TreeNodesModel`
- Drop-target reparent, sibling reorder
- Warnings panel, keyboard/a11y basics

### 1.0.0 — Stable

- Coverage targets met, governance docs, optional telemetry

## Tracking

GitHub issues and PRs on [guilyx/btview-vscode-plugin](https://github.com/guilyx/btview-vscode-plugin).
