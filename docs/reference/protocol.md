# Protocol & architecture

BTView is split into a VS Code–agnostic domain core, an extension host, and a React webview that talk over a typed message protocol. The same core and webview also power the [browser demo](../try.md).

```text
VS Code / Cursor                                   Browser demo (demo/)
────────────────                                   ────────────────────
extension.ts ─ commands, activation                shell.ts ─ fixture picker, XML pane
BtGraphController ─ message routing, sim, verify   DemoHost ─ same routing, in memory
DocumentSyncService ─ TextDocument ↔ BtDocument    virtual file map
        │                                                  │
        └──────────────► src/btcpp/ ◄──────────────────────┘
          parser · serializer · validation · edit ops
          include merge · exec/ (Simulator, traces) · verify/
        │                                                  │
        ▼ postMessage (src/shared/protocol.ts)             ▼
webview/ ─ React Flow graph, inspector, palette  (the same bundle in both)
```

| Layer                  | Path                     | Depends on VS Code?                                   |
| ---------------------- | ------------------------ | ----------------------------------------------------- |
| Domain core            | `src/btcpp/`             | No                                                    |
| Simulator & traces     | `src/btcpp/exec/`        | No                                                    |
| Bounded verifier       | `src/btcpp/verify/`      | No                                                    |
| Sync & edit stack      | `src/sync/`              | Yes                                                   |
| Custom editor / panels | `src/preview/`           | Yes                                                   |
| Protocol types         | `src/shared/protocol.ts` | No                                                    |
| Webview UI             | `webview/src/`           | No — only `vscodeApi.ts` touches `acquireVsCodeApi()` |

More detail: [Architecture](../development/ARCHITECTURE.md) and [Webview integration](../development/WEBVIEW.md).

## Host → webview

| Message           | Payload                                                                                        | When                                         |
| ----------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `loadDocument`    | `SerializedDocument`                                                                           | First load, after `ready`, forced reloads    |
| `documentChanged` | `SerializedDocument`                                                                           | After any edit or text change                |
| `error`           | `message`                                                                                      | Parse or handler failure (shown as a banner) |
| `validationError` | `message`                                                                                      | A rejected edit (e.g. invalid reparent)      |
| `graphAction`     | `fitView` · `toggleLegend` · `togglePorts` · `focusSearch` · `deleteNode` · `showShortcutHelp` | Command Palette graph commands               |
| `tickUpdate`      | `tick`, `rootStatus`, `statuses` (path → status), `blackboard`                                 | Each simulation step / reset                 |

`SerializedDocument` carries the format version, `main_tree_to_execute`, the active tree, every tree's node payload (`path`, `kind`, `registeredId`, `instanceName`, `attributes`, `children`), models with ports, the add-node palette, includes (with resolution errors), warnings, validation errors, saved layout positions and the `showNodePorts` / `simpleMode` settings.

## Webview → host

| Message                                                                             | Effect                                                 |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `ready` / `loaded`                                                                  | Handshake: host (re)sends the document, stops retrying |
| `selectTree`                                                                        | Switch the active `BehaviorTree`                       |
| `editNode`, `removePort`                                                            | Set / remove an attribute                              |
| `changeNodeType`                                                                    | Change kind and registered ID                          |
| `addNode`, `deleteNode`, `pasteSubtree`                                             | Structural edits                                       |
| `reparentNode`, `reorderChildren`                                                   | Move nodes                                             |
| `addModel`, `deleteModel`                                                           | Edit `TreeNodesModel`                                  |
| `undo`, `redo`                                                                      | Host-side edit stack                                   |
| `saveLayout`, `resetLayout`                                                         | Sidecar node positions                                 |
| `sim` (`step` · `reset`)                                                            | Drive the Simulator                                    |
| `openSource`, `goToSource`, `openGraphSide`, `openInclude`, `exportWorkspaceConfig` | Editor / workspace actions                             |

Every inbound message is validated by `parseWebviewMessage()`; unknown or malformed messages are dropped. Node paths are strings like `0-3-1`: the tree root is `0`, followed by child indices.

## Simulation model

`Simulator` (`src/btcpp/exec/tick.ts`) is a stateful tick engine: `tick()` advances the whole tree once and returns per-node statuses (`IDLE`, `RUNNING`, `SUCCESS`, `FAILURE`, `SKIPPED`) and the blackboard. Leaf outcomes come from a pluggable `OutcomeProvider`; the extension uses "RUNNING on the first tick, then SUCCESS", traces use `scriptedOutcomes(mocks)`, and the verifier enumerates every SUCCESS/FAILURE assignment of the leaves.
