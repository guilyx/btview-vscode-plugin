# BTView Roadmap

Current release: **0.2.1** on `main` (2026-06-12).
Integration branch: **`devel`**.

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
- [x] **`btview.newTree`** command — create empty BTCpp XML with a root `Sequence`
- [x] Palette toolbar driven by builtins + user map (grouped by kind)
- [x] In-graph view switcher + title bar icons (PR #32)
- [ ] **Empty canvas authoring** — start from blank graph (no XML root yet) and materialize `<BehaviorTree>`
- [ ] **Node palette sidebar** — docked panel with searchable builtins + models + configured nodes (drag onto canvas)
- [ ] **New tree wizard** — pick format (v3/v4), main tree id, default root control
- [ ] Export / sync: visual edits → XML (partially done via `DocumentSyncService`; needs empty-doc path)
- [ ] Tag **0.3.0** release to Marketplace + Open VSX when milestone is complete

## 0.2.x — Integration (shipped)

- [x] `devel` branch as default integration target
- [x] Branching docs (`docs/BRANCHING.md`, CONTRIBUTING, AGENTS.md, cursor rules)
- [x] CI runs on `devel` pushes and PRs
- [x] `@vitest/coverage-v8` + unit coverage in CI
- [x] Open VSX publish step in release CI + Cursor install docs
- [x] Release **0.2.0** / **0.2.1** to `main` (VSIX webview packaging fix)
- [ ] Branch protection on `devel` + `main` (GitHub settings — maintainer)
- [ ] Run **Publish to registries** workflow for v0.1.0 on Open VSX

## 1.0.0 — Stable

- [ ] `DocumentSyncService` unit or integration tests (currently 0% coverage)
- [ ] Coverage thresholds enforced in `verify.sh` for `src/btcpp/` (target ≥ 70% lines)
- [ ] Optional telemetry (opt-in usage, no PII)
- [ ] VS Code Marketplace + Open VSX (Cursor) listings verified end-to-end

## Delivered in 0.1.0 (reference)

- Shared `src/shared/protocol.ts`, `WebviewPanelManager`, `DocumentRefreshScheduler`
- Output channel, `DiagnosticsService`, validation on parse/edit
- Inspector debounce, skip self-refresh, async includes, viewport persistence
- `NodePicker`, reparent/reorder UX, `WarningsPanel`
- Unit + integration tests, governance docs, release automation

## Tracking

GitHub issues and PRs on [guilyx/btview-vscode-plugin](https://github.com/guilyx/btview-vscode-plugin).
Feature PRs target **`devel`**; release PRs target **`main`**.

Internal milestone tags (no Marketplace publish): `devel-v0.3.0-*` on `devel`.
