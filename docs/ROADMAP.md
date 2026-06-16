# BTView roadmap

|                    |                                                                                                    |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| **Latest release** | **0.4.3** on `main` ([GitHub](https://github.com/guilyx/btview-vscode-plugin/releases/tag/v0.4.3)) |
| **Integration**    | `devel` — all feature PRs merge here                                                               |
| **Publisher**      | `rangonomics.btview`                                                                               |

Deep dives: [Groot parity](planning/GROOT_PARITY.md) · [AI & agents](planning/AI_AGENT_INTEGRATION.md) · [Changelog](../CHANGELOG.md)

---

## Where we are (Jun 2026)

BTView is a **shippable graph editor** for BehaviorTree.CPP v3/v4: custom editor, palette, staged nodes, edge connect, inspector with kind/type editing, and a **stable webview boot path** (0.4.2–0.4.3).

```text
Shipped ──────────────────────────────────────────────► 0.4.3
Next major theme ─────────────────────────────────────► 0.5.0 simulation monitor
Parallel tracks ──► 0.4.x editor polish · 0.6+ agent API · 1.0 stable
```

### Capability snapshot

| Area                                          | Status                    |
| --------------------------------------------- | ------------------------- |
| Graph authoring (palette, connect, inspector) | **Shipped** (0.3–0.4)     |
| Webview reliability (load, bootstrap, loader) | **Shipped** (0.4.2–0.4.3) |
| Node kind / type editing                      | **Shipped** (0.4.3)       |
| Undo / redo, copy-paste subtree               | **Backlog** (0.4.x → 0.5) |
| Simulation monitor + blackboard               | **Planned** (0.5.0)       |
| Agent-readable API (JSON, Mermaid, snippets)  | **Planned** (0.6.0)       |
| MCP + graph capture for AI                    | **Planned** (0.7–1.0)     |

---

## Milestones

| Version   | Theme                                                | Status   |
| --------- | ---------------------------------------------------- | -------- |
| **0.1.0** | Initial ship: CI, VSIX, core stack                   | Released |
| **0.2.x** | `devel` workflow, Open VSX, dual publish             | Released |
| **0.3.x** | Palette, empty canvas, `nodeTypeMap`, webview CSP    | Released |
| **0.4.0** | Staged nodes, edge connect, load gate                | Released |
| **0.4.2** | Webview `defer` + `__BTVIEW_BOOT__`, branded loader  | Released |
| **0.4.3** | `changeNodeType`, webview docs, Groot/AI planning    | Released |
| **0.5.0** | **Simulation monitor** — tick emulation, node status | **Next** |
| **0.6.0** | Agent-readable commands (summary, snippet, Mermaid)  | Planned  |
| **0.7.0** | Graph capture PNG/SVG for multimodal agents          | Planned  |
| **0.8.0** | Monitor exports for agent “why did it fail?”         | Planned  |
| **1.0.0** | MCP server, coverage gate, stable                    | Planned  |

---

## Active backlog

### 0.5.0 — Simulation monitor (primary next release)

Interactive monitor to explore ticks without a live robot stack. Details unchanged from prior plan:

- [ ] Monitor panel (split view or dedicated webview)
- [ ] Tick mode: single step, continuous, rate Hz; initial blackboard
- [ ] Node status overlay: IDLE / RUNNING / SUCCESS / FAILURE / SKIPPED
- [ ] Manual branch selection on controls
- [ ] Tick timeline + optional export
- [ ] Blackboard inspector per tick
- [ ] Mock action outcomes (success / failure / delay)
- [ ] ROS-optional; standalone XML first

Design: monitor state is **session-scoped**; disk XML stays canonical unless user applies edits.

### 0.4.x carryover (editor polish — may land before or alongside 0.5)

- [ ] Undo / redo for structural edits
- [ ] Copy / paste subtree
- [ ] Add / remove custom port fields in inspector
- [ ] Persist staged node positions (partial today via webview state)
- [ ] Drop-target highlight when connecting staged nodes
- [ ] Snap-to-grid + manual layout save
- [ ] Subtree drill-down; search / filter nodes

See [Groot parity](planning/GROOT_PARITY.md) for priority order.

### AI & agents (cross-cutting)

Tier summary — full spec in [AI_AGENT_INTEGRATION.md](planning/AI_AGENT_INTEGRATION.md):

| Tier | Target | Deliverable                                           |
| ---- | ------ | ----------------------------------------------------- |
| 0    | Now    | Cursor skill + rules; agents read XML, open graph     |
| 1    | 0.6.0  | `getDocumentSummary`, subtree snippet, Mermaid export |
| 2    | 0.6.x  | `applyOperations`, `selectNode`                       |
| 3    | 0.7.0  | `captureGraph` for chat screenshots                   |
| 4    | 1.0.0  | MCP server package                                    |
| 5    | 0.8.0  | Monitor tick/blackboard export for agents             |

- [ ] Tier 0: Cursor skill `btview` + optional `btview-authoring.mdc` rule

### 1.0.0 — Stable

- [ ] `DocumentSyncService` integration tests
- [ ] Coverage gate ≥ 70% lines on `src/btcpp/` in `verify.sh`
- [ ] Optional opt-in telemetry (no PII)
- [ ] Marketplace + Open VSX smoke verified each release
- [ ] Branch protection on `devel` + `main` (maintainer)

---

## Shipped highlights (reference)

<details>
<summary>0.4.3 — Inspector & docs (2026-06)</summary>

- [x] Editable node kind + registered ID (`changeNodeType`)
- [x] [Webview guide](development/WEBVIEW.md) + Cursor rule `webview-html.mdc`
- [x] [Groot parity matrix](planning/GROOT_PARITY.md), [AI roadmap](planning/AI_AGENT_INTEGRATION.md)

</details>

<details>
<summary>0.4.2 — Webview boot fix (2026-06)</summary>

- [x] Script `defer` at end of `<body>`; stop patching Vite HTML
- [x] `__BTVIEW_BOOT__` embedded document; branded loading animation

</details>

<details>
<summary>0.4.0 — Graph authoring (2026-06)</summary>

- [x] Staged nodes, edge connect, set-as-root
- [x] `WebviewOutboundGate`, ready retry, integration tests

</details>

<details>
<summary>0.3.x — Visual authoring</summary>

- [x] Palette sidebar, `nodeTypeMap`, `newTree`, empty canvas
- [x] 0.3.1 black screen / CSP fix

</details>

<details>
<summary>0.1.0 — Foundation</summary>

- Protocol, `WebviewPanelManager`, `DocumentSyncService`, validation, diagnostics, tests, release CI

</details>

---

## Tracking

Issues and PRs: [guilyx/btview-vscode-plugin](https://github.com/guilyx/btview-vscode-plugin).

- Feature/fix PRs → **`devel`**
- Release PRs → **`main`** → tag `vX.Y.Z` → CI publishes registries

Workflow: [Branching](development/BRANCHING.md) · [Release process](release/RELEASE.md)
