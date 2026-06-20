# BTView roadmap

|                    |                                                                                                    |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| **Latest release** | **0.8.0** on `main` ([GitHub](https://github.com/guilyx/btview-vscode-plugin/releases/tag/v0.8.0)) |
| **Integration**    | `devel` — editor train 0.9.x polish toward 1.0                                                     |
| **Publisher**      | `rangonomics.btview`                                                                               |

Deep dives: [Editor roadmap](planning/EDITOR_ROADMAP.md) · [Command surfaces](planning/COMMAND_SURFACES.md) · [Groot parity](planning/GROOT_PARITY.md) · [AI & agents](planning/AI_AGENT_INTEGRATION.md) · [Changelog](../CHANGELOG.md)

---

## Where we are (Jun 2026)

BTView is a **shippable graph editor** for BehaviorTree.CPP v3/v4. **0.8.0** shipped the 0.5–0.8 editor train (legend, shortcuts, typed ports, layout, drill-down). **0.9.x** polish and **1.0** Editor Complete remain on `devel`.

```text
Shipped ──────────────────────────────────────────────► 0.8.0 (editor train 0.5–0.8)
Active train (devel) ─────────────────────────────────► 0.9 polish → 1.0 Editor Complete
Then ─────────────────────────────────────────────────► 1.1+ simulation monitor
```

### Capability snapshot

| Area                                          | Status                    |
| --------------------------------------------- | ------------------------- |
| Graph authoring (palette, connect, inspector) | **Shipped** (0.3–0.4)     |
| Webview reliability                           | **Shipped** (0.4.2–0.4.3) |
| Node kind / type editing                      | **Shipped** (0.4.3)       |
| Legend, shortcuts, context menus, undo        | **Shipped** (0.5, 0.8.0)  |
| Typed ports & model authoring                 | **Shipped** (0.6–0.7, 0.8.0) |
| Copy/paste, layout, drill-down                | **Shipped** (0.8.0)       |
| Simulation monitor + blackboard               | **Deferred** (1.1+)       |
| Agent API / MCP                               | **Deferred** (1.2+)       |

---

## Milestones

| Version   | Theme                                              | Status     |
| --------- | -------------------------------------------------- | ---------- |
| **0.4.3** | `changeNodeType`, webview docs, Groot/AI planning  | Released   |
| **0.5.x** | Editor UX — legend, shortcuts, menus, undo, search | Released (0.8.0) |
| **0.6.x** | Typed ports — model-aware inspector + canvas chips | Released (0.8.0) |
| **0.7.x** | Model authoring + export workspace config          | Released (0.8.0) |
| **0.8.x** | Pro graph ops — copy/paste, layout, drill-down     | **Released**     |
| **0.9.x** | Hobbyist polish, RC hardening                      | **Active**       |
| **1.0.0** | **Editor Complete** — release to `main`            | Planned    |
| **1.1.x** | Simulation monitor                                 | Deferred   |
| **1.2.x** | Agent commands / capture                           | Deferred   |
| **1.3+**  | MCP server                                         | Deferred   |

Full feature checklist: [EDITOR_ROADMAP.md](planning/EDITOR_ROADMAP.md).

---

## Active backlog (editor train)

### 0.5.x — Editor UX

- [ ] Color legend (E-01)
- [ ] Keyboard shortcuts + context menus (E-03, E-06)
- [ ] Undo / redo (E-02)
- [ ] Node search / highlight (E-04)
- [ ] Drop-target highlight (E-05)

### 0.6.x — Typed ports

- [ ] Port resolution against `TreeNodesModel` (E-10)
- [ ] Inspector typed port sections (E-11–E-12)
- [ ] Port chips on canvas (E-13)
- [ ] Add/remove port attrs (E-14)
- [ ] Port validation (E-15)

### 0.7.x — Model authoring

- [ ] TreeNodesModel editor UI (E-20–E-21)
- [ ] Export workspace config button (E-24)

### 0.8.x — Pro graph ops

- [ ] Copy / paste subtree (E-30)
- [ ] Layout persistence + snap (E-31–E-32)
- [ ] Subtree drill-down + includes (E-33–E-34)

See [Groot parity](planning/GROOT_PARITY.md) for matrix vs Groot2.

### 1.1+ — Simulation monitor (deferred)

- Tick emulation, node status overlays, blackboard inspector
- Previously planned as 0.5.0; deferred until Editor Complete (1.0)

### AI & agents (deferred to 1.2+)

Full spec: [AI_AGENT_INTEGRATION.md](planning/AI_AGENT_INTEGRATION.md)

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

---

## Tracking

- Feature/fix PRs → **`devel`**
- Release PRs → **`main`** → tag `vX.Y.Z` → CI publishes registries
- Dev tags on `devel` between Marketplace releases: `v0.X.0-dev.N`

Workflow: [Branching](development/BRANCHING.md) · [Release process](release/RELEASE.md)
