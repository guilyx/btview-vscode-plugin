# BTView Roadmap

Current release: **0.2.1** on `main` (2026-06-12).
Integration branch: **`devel`** (0.3.0 RC).

Publisher: **rangonomics** · Extension ID: `rangonomics.btview`

## Milestones

| Version   | Focus                                                                 | Status          |
| --------- | --------------------------------------------------------------------- | --------------- |
| **0.1.0** | Ship: Marketplace, VSIX CI, agent docs, full feature stack            | **Released**    |
| **0.2.x** | Integration: devel branch, CI gate, Open VSX, dual publish, VSIX fix  | **Released**    |
| **0.3.0** | Authoring: node type config, new tree, palette, visual → XML workflow | **In progress** |
| **1.0.0** | Stable: coverage gate, sync-layer tests, branch protection            | Planned         |

> Architecture (protocol, controller split), validation, performance, and UX milestones originally scoped as 0.2–0.4 were **delivered in 0.1.0**. See [CHANGELOG.md](../CHANGELOG.md).

## 0.3.0 — Visual authoring

- [x] **`btview.nodeTypeMap`** — map custom node IDs to kinds (action, condition, …) for parse + palette
- [x] Fix TreeNodesModel kind inference for explicit `<Action>`, `<Control>`, `<Decorator>` wrappers
- [x] **`btview.newTree`** wizard — format, tree ID, empty canvas or root control
- [x] **Node palette sidebar** — searchable builtins + models + configured nodes; drag onto canvas
- [x] **Empty canvas authoring** — blank graph materializes root via palette or quick-add controls
- [x] Visual edits → XML via `DocumentSyncService`
- [x] In-graph view switcher + title bar icons
- [ ] Release **0.3.0** to `main` (Marketplace + Open VSX)

## 0.2.x — Integration (shipped)

- [x] `devel` branch as default integration target
- [x] Branching docs, CI on `devel`, Open VSX publish, VSIX webview fix
- [ ] Branch protection on `devel` + `main` (GitHub settings — maintainer)

## 1.0.0 — Stable

- [ ] `DocumentSyncService` unit or integration tests
- [ ] Coverage thresholds enforced in `verify.sh` for `src/btcpp/` (target ≥ 70% lines)
- [ ] Drop target highlighting when dragging palette nodes onto specific graph nodes
- [ ] Optional telemetry (opt-in usage, no PII)
- [ ] VS Code Marketplace + Open VSX listings verified end-to-end

## Delivered in 0.1.0 (reference)

- Shared `src/shared/protocol.ts`, `WebviewPanelManager`, `DocumentRefreshScheduler`
- Output channel, `DiagnosticsService`, validation on parse/edit
- Inspector debounce, skip self-refresh, async includes, viewport persistence
- `NodePicker`, reparent/reorder UX, `WarningsPanel`
- Unit + integration tests, governance docs, release automation

## Tracking

GitHub issues and PRs on [guilyx/btview-vscode-plugin](https://github.com/guilyx/btview-vscode-plugin).
Feature PRs target **`devel`**; release PRs target **`main`**.
