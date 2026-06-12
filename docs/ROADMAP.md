# BTView Roadmap

Current release: **0.1.0** on `main` (2026-06-12).
Integration branch: **`devel`**.

Publisher: **rangonomics** · Extension ID: `rangonomics.btview`

## Milestones

| Version   | Focus                                                       | Status       |
| --------- | ----------------------------------------------------------- | ------------ |
| **0.1.0** | Ship: Marketplace, VSIX CI, agent docs, full feature stack  | **Released** |
| **0.2.0** | Integration release from `devel` (CI gate, branching model) | In progress  |
| **1.0.0** | Stable: coverage gate, sync-layer tests, branch protection  | Planned      |

> Architecture (protocol, controller split), validation, performance, and UX milestones originally scoped as 0.2–0.4 were **delivered in 0.1.0**. See [CHANGELOG.md](../CHANGELOG.md).

## 0.2.0 — Integration (from `devel`)

- [x] `devel` branch as default integration target
- [x] Branching docs (`docs/BRANCHING.md`, CONTRIBUTING, AGENTS.md, cursor rules)
- [x] CI runs on `devel` pushes and PRs
- [x] `@vitest/coverage-v8` + unit coverage in CI
- [ ] Branch protection on `devel` + `main` (GitHub settings — maintainer)
- [x] Open VSX publish step in release CI + Cursor install docs
- [x] `OVSX_PAT` GitHub secret; namespace created by CI on first publish
- [ ] Run **Publish to registries** workflow for v0.1.0 on Open VSX
- [ ] Release **0.2.0** to `main` when above is merged and smoke-tested

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
