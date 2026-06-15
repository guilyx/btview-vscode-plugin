# Groot parity & enhanced editor vision

BTView targets a **Groot-class** experience inside VS Code: visual authoring, XML as source of truth, and (planned) runtime monitoring — without leaving the editor.

Reference: [BehaviorTree.CPP Groot2](https://github.com/BehaviorTree/Groot2) (official BT editor).

## Feature matrix

| Capability | Groot2 | BTView today | Target |
| --- | --- | --- | --- |
| Graph canvas + auto layout | ✅ | ✅ ELK layout | Keep improving manual layout save |
| Node palette (built-ins) | ✅ | ✅ sidebar | — |
| Drag / connect wires | ✅ | ✅ staged nodes + edge connect | Drop-target highlight on parent |
| Click node → property editor | ✅ | ✅ inspector (name, ports) | **Kind + type editable (0.4.3)** |
| Change node type / fix mis-tags | ✅ | 🔜 0.4.3 | `changeNodeType` |
| Custom nodes (`TreeNodesModel`) | ✅ | ✅ parse + palette from models | Model editor UI |
| Port editing | ✅ | ✅ attribute fields | Typed port widgets, defaults |
| Multiple trees per file | ✅ | ✅ tree selector | — |
| Subtree nodes | ✅ | ✅ | Drill-down / open included file |
| Undo / redo | ✅ | ❌ | **0.4.x** — edit stack on host |
| Copy / paste subtree | ✅ | ❌ | **0.4.x** |
| Blackboard editor | ✅ | ❌ | **0.5.x** with monitor |
| Live tick monitor + node status | ✅ | ❌ | **0.5.0** simulation monitor |
| Manual branch pick during tick | ✅ | ❌ | 0.5.0 |
| Search / filter nodes | ✅ | ❌ | 0.4.x |
| Snap to grid | ✅ | ❌ | 0.4.x |
| XML round-trip | ✅ | ✅ | — |
| ROS package includes | partial | ✅ `ros_pkg` includes | — |

Legend: ✅ shipped · 🔜 in progress · ❌ planned

## Near-term editor UX (0.4.x)

Priority order for “best of Groot” authoring:

1. **Editable node definition** — kind (action/control/…) + registered ID; fixes unknown/bad XML tags.
2. **Undo / redo** — structural edits via host-side command stack (webview sends invertible ops).
3. **Copy / paste** — subtree clipboard as internal JSON + XML fragment.
4. **Add / remove port attributes** — inspector “+ port” for custom action fields.
5. **Subtree drill-down** — double-click SubTree → open referenced tree or file.
6. **Search** — highlight nodes by name/ID; filter palette.
7. **Layout persistence** — save manual node positions per tree (override ELK until re-layout).
8. **Keyboard shortcuts** — Delete, Duplicate, Escape deselect, Ctrl+Z/Y.

## 0.5.0 — Monitor (beyond Groot)

- Tick emulation, RUNNING/SUCCESS/FAILURE overlays
- Blackboard inspector per tick
- Mock action outcomes for offline debugging

See [ROADMAP.md](ROADMAP.md).

## Design principles

- **XML remains canonical** — graph edits apply `WorkspaceEdit`; no shadow file format.
- **Fail visible** — validation errors in Problems + inspector, never silent drops.
- **Offline-first** — no ROS required to author or emulate trees.
