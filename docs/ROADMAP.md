# BTView Roadmap

Current release: **0.4.0** on `main` (2026-06-14).
Integration branch: **`devel`**.

Publisher: **rangonomics** · Extension ID: `rangonomics.btview`

## Milestones

| Version   | Focus                                                                | Status       |
| --------- | -------------------------------------------------------------------- | ------------ |
| **0.1.0** | Ship: Marketplace, VSIX CI, agent docs, full feature stack           | **Released** |
| **0.2.x** | Integration: devel branch, CI gate, Open VSX, dual publish, VSIX fix | **Released** |
| **0.3.x** | Authoring: palette, empty canvas, nodeTypeMap, webview reliability   | **Released** |
| **0.4.0** | Staged nodes, edge connect, webview load hardening                   | **Released** |
| **0.5.0** | **Simulation monitor** — tick emulation, node status, blackboard     | Planned      |
| **1.0.0** | Stable: coverage gate, sync-layer tests, branch protection           | Planned      |

> Architecture (protocol, controller split), validation, performance, and UX milestones originally scoped as 0.2–0.4 were **delivered in 0.1.0**. See [CHANGELOG.md](../CHANGELOG.md).

## 0.4.0 — Graph authoring UX (released)

- [x] **Staged (dangling) nodes** — palette drag/click places unconnected nodes on canvas
- [x] **Edge connect** — parent bottom → child top handle commits `addNode` / `reparentNode`
- [x] **Set as tree root** — inspector action for staged control on empty tree
- [x] **Webview load hardening** — `WebviewOutboundGate`, ready retry, integration tests
- [ ] Persist staged node positions across reload (webview state — partial)
- [ ] Drop target highlight when connecting palette nodes onto specific parents
- [ ] Undo/redo for structural edits
- [ ] Snap-to-grid and manual layout save (override auto-layout positions)

## 0.5.0 — Simulation monitor (planned)

Interactive **monitor view** alongside the graph editor to explore how a behavior tree would tick without a live robot stack.

- [ ] **Monitor panel** — separate webview or split view (“BT Monitor”) opened from command palette / title bar
- [ ] **Emulation configuration** — choose tick mode (single step, continuous, rate Hz), initial blackboard key/values, which subtree is `main_tree_to_execute`
- [ ] **Node status overlay** — IDLE / RUNNING / SUCCESS / FAILURE (and SKIPPED) on graph nodes per tick
- [ ] **Manual branch selection** — for controls with multiple running children, pick which child advances (what-if exploration)
- [ ] **Tick timeline** — step history, current path through the tree, optional export of tick log
- [ ] **Blackboard inspector** — live view of port reads/writes per tick (aligned with BTCpp v3/v4 port model)
- [ ] **Fixture / mock actions** — configurable outcomes for action nodes during emulation (success, failure, async delay)
- [ ] **ROS-optional** — monitor works on standalone XML; later hook to live `btcpp` / ROS 2 topic feedback

Design note: emulation stays **read-only against disk XML** unless the user explicitly applies edits; monitor state is ephemeral (session-scoped) unless saved as a scenario file.

## 0.3.x — Visual authoring (shipped)

- [x] **`btview.nodeTypeMap`**, **`btview.newTree`**, palette sidebar, empty canvas
- [x] Visual edits → XML via `DocumentSyncService`
- [x] **0.3.1** — webview black screen fix (CSP, ready handshake, upgrade reload)

## 1.0.0 — Stable

- [ ] `DocumentSyncService` unit or integration tests
- [ ] Coverage thresholds enforced in `verify.sh` for `src/btcpp/` (target ≥ 70% lines)
- [ ] Optional telemetry (opt-in usage, no PII)
- [ ] VS Code Marketplace + Open VSX listings verified end-to-end
- [ ] Branch protection on `devel` + `main` (GitHub settings — maintainer)

## Delivered in 0.1.0 (reference)

- Shared `src/shared/protocol.ts`, `WebviewPanelManager`, `DocumentRefreshScheduler`
- Output channel, `DiagnosticsService`, validation on parse/edit
- Inspector debounce, skip self-refresh, async includes, viewport persistence
- `NodePicker`, reparent/reorder UX, `WarningsPanel`
- Unit + integration tests, governance docs, release automation

## Tracking

GitHub issues and PRs on [guilyx/btview-vscode-plugin](https://github.com/guilyx/btview-vscode-plugin).
Feature PRs target **`devel`**; release PRs target **`main`**.
