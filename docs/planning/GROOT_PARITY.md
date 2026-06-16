# Groot parity & enhanced editor vision

BTView targets a **Groot-class** experience inside VS Code: visual authoring, XML as source of truth, and (planned) runtime monitoring — without leaving the editor.

Reference: [BehaviorTree.CPP Groot2](https://github.com/BehaviorTree/Groot2) (official BT editor).

Editor feature checklist: [EDITOR_ROADMAP.md](EDITOR_ROADMAP.md)

## Feature matrix

| Capability                      | Groot2  | BTView today                   | Phase | PR ID      |
| ------------------------------- | ------- | ------------------------------ | ----- | ---------- |
| Graph canvas + auto layout      | ✅      | ✅ ELK layout                  | 0.8   | E-31       |
| Node palette (built-ins)        | ✅      | ✅ sidebar                     | —     | —          |
| Drag / connect wires            | ✅      | ✅ staged nodes + edge connect | 0.5   | E-05       |
| Click node → property editor    | ✅      | ✅ inspector (kind, type)      | —     | —          |
| Change node type / fix mis-tags | ✅      | ✅ `changeNodeType` (0.4.3)    | —     | —          |
| Color legend                    | ✅      | ❌                             | 0.5   | E-01       |
| Keyboard shortcuts              | ✅      | partial (open graph only)      | 0.5   | E-03, E-47 |
| Context menus                   | ✅      | ❌                             | 0.5   | E-06       |
| Custom nodes (`TreeNodesModel`) | ✅      | ✅ parse + palette from models | 0.7   | E-20–E-24  |
| Port editing                    | ✅      | flat attribute fields          | 0.6   | E-10–E-15  |
| Multiple trees per file         | ✅      | ✅ tree selector               | —     | —          |
| Subtree nodes                   | ✅      | ✅ parse                       | 0.8   | E-33       |
| Undo / redo                     | ✅      | ❌                             | 0.5   | E-02       |
| Copy / paste subtree            | ✅      | ❌                             | 0.8   | E-30       |
| Search / filter nodes           | ✅      | ❌                             | 0.5   | E-04       |
| Snap to grid                    | ✅      | ❌                             | 0.8   | E-32       |
| Layout persistence              | ✅      | partial (viewport only)        | 0.8   | E-31       |
| XML round-trip                  | ✅      | ✅                             | —     | —          |
| ROS package includes            | partial | ✅ `ros_pkg` includes          | 0.8   | E-34       |
| Blackboard editor               | ✅      | ❌                             | 1.1+  | (monitor)  |
| Live tick monitor + node status | ✅      | ❌                             | 1.1+  | (monitor)  |
| Manual branch pick during tick  | ✅      | ❌                             | 1.1+  | (monitor)  |

Legend: ✅ shipped · ❌ planned

## Editor UX priority (0.5 → 0.8)

1. ~~**Editable node definition**~~ — shipped 0.4.3
2. **Legend + shortcuts + context menus** — E-01, E-03, E-06
3. **Undo / redo** — E-02
4. **Typed port editing** — E-10–E-15
5. **Model editor + workspace config export** — E-20–E-24
6. **Copy / paste, layout, drill-down** — E-30–E-35

## Simulation monitor (1.1+, deferred)

- Tick emulation, RUNNING/SUCCESS/FAILURE overlays
- Blackboard inspector per tick
- Mock action outcomes for offline debugging

See [Roadmap](../ROADMAP.md).

## Design principles

- **XML remains canonical** — graph edits apply `WorkspaceEdit`; no shadow file format.
- **Fail visible** — validation errors in Problems + inspector, never silent drops.
- **Offline-first** — no ROS required to author or emulate trees.
- **Triple access** — actions via menu, keyboard, and inspector where practical ([COMMAND_SURFACES.md](COMMAND_SURFACES.md)).
