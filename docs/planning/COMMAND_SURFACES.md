# Command surfaces

How BTView exposes editing actions via **keyboard**, **context menu**, and **inspector/toolbar**.

Architecture: [`webview/src/commands/graphActions.ts`](../../webview/src/commands/graphActions.ts) is the single action registry; context menus and hotkeys call the same handlers.

---

## Triple access principle

| Surface             | Role                                                   |
| ------------------- | ------------------------------------------------------ |
| Right-click menu    | Discovery for hobbyists; shows shortcut in label       |
| Keyboard            | Power users; disabled while typing in inspector inputs |
| Inspector / toolbar | Precision editing fallback                             |

---

## Host vs webview routing

| Layer                                           | Examples                                                                        |
| ----------------------------------------------- | ------------------------------------------------------------------------------- |
| **Webview** (`useGraphHotkeys`)                 | Delete, Escape, F2, Ctrl+F, Ctrl+Z/Y, fit view, toggle legend/ports, copy/paste |
| **Host** (`package.json` + `BtGraphController`) | Go to XML source, Command Palette `btview.graph.*`, export workspace config     |

```text
ContextMenu / Hotkeys → postMessage → BtGraphController → DocumentSyncService → WorkspaceEdit
```

---

## Keyboard shortcuts

| Action                     | Default                   | Layer   | Phase   |
| -------------------------- | ------------------------- | ------- | ------- |
| Open BT Graph              | `Ctrl+Shift+V`            | host    | shipped |
| Graph beside               | `Ctrl+K V`                | host    | shipped |
| Delete node                | `Del`                     | webview | 0.5     |
| Deselect                   | `Escape`                  | webview | 0.5     |
| Rename                     | `F2`                      | webview | 0.5     |
| Undo / Redo                | `Ctrl+Z` / `Ctrl+Shift+Z` | webview | 0.5     |
| Search nodes               | `Ctrl+F`                  | webview | 0.5     |
| Fit view                   | `Ctrl+0`                  | webview | 0.5     |
| Toggle legend              | `Ctrl+Shift+G`            | webview | 0.5     |
| Go to XML source           | `Alt+Enter`               | host    | 0.5     |
| Toggle port display        | `Ctrl+Alt+P`              | webview | 0.6     |
| Copy / Cut / Paste subtree | `Ctrl+C/X/V`              | webview | 0.8     |
| Duplicate                  | `Ctrl+D`                  | webview | 0.8     |
| Auto-layout                | `Ctrl+Shift+L`            | webview | 0.8     |
| Navigate tree              | `↑` `↓` `←` `→`           | webview | 0.9     |
| Next / previous node       | `Tab` / `Shift+Tab`       | webview | 0.9     |
| Edit node in inspector     | `Enter`                   | webview | 0.9     |
| Open context menu          | `Shift+F10` / Menu key    | webview | 0.9     |
| Shortcut help              | `?`                       | webview | 0.9     |

**Note:** `Ctrl+Shift+P` is VS Code Command Palette — ports use `Ctrl+Alt+P`.

Focus follows selection: arrow-key navigation, search match cycling and Issues-panel clicks move keyboard focus to the node card, and tabbing onto a card selects it.

---

## Context menus

Webview HTML overlays at click position (or under the selected node for `Shift+F10`); dismissed on click-outside, `Escape` or `Tab`. The first enabled item takes focus, `↑`/`↓`/`Home`/`End` move between items, and focus returns to where it was when the menu closes.

### Canvas

| Item                    | Shortcut             |
| ----------------------- | -------------------- |
| Fit view                | `Ctrl+0`             |
| Toggle color legend     | `Ctrl+Shift+G`       |
| Toggle port labels      | `Ctrl+Alt+P`         |
| Paste subtree           | `Ctrl+V` (0.8)       |
| Auto-layout             | `Ctrl+Shift+L` (0.8) |
| Export workspace config | — (0.7)              |

### Node

| Item                   | Shortcut           |
| ---------------------- | ------------------ |
| Inspect                | `Enter`            |
| Rename                 | `F2`               |
| Delete                 | `Del`              |
| Add child…             | —                  |
| Change node type…      | —                  |
| Copy / Cut / Duplicate | `Ctrl+C/X/D` (0.8) |
| Go to XML source       | `Alt+Enter`        |
| Open subtree file      | — (0.8)            |

### Staged node

| Item          | Shortcut |
| ------------- | -------- |
| Delete staged | `Del`    |
| Cancel        | `Escape` |

---

## Validation quick-fixes (0.9)

Every fix is computed once, in `src/btcpp/quickFixes.ts` (pure, text edits on the XML), and surfaced in three places:

| Surface                | Trigger                                          | Route                                                                      |
| ---------------------- | ------------------------------------------------ | -------------------------------------------------------------------------- |
| XML editor lightbulb   | `Ctrl+.` on a BTView diagnostic                  | `BtCodeActionProvider` → `WorkspaceEdit` (text undo)                       |
| XML **Source Action…** | `Convert file to BTCpp v4` on v3 files           | `BtCodeActionProvider` (`source.btview.convertToV4`)                       |
| Graph Issues panel     | **Fix** button next to an issue                  | `applyQuickFix` message → `DocumentSyncService.applyQuickFix` (graph undo) |
| Inspector              | **Fix** button in the selected node's Issues box | same as Issues panel                                                       |

| Diagnostic code         | Fix                                                     |
| ----------------------- | ------------------------------------------------------- |
| `undefined-subtree`     | Create `<BehaviorTree ID>` stub with `<AlwaysSuccess/>` |
| `missing-main-tree`     | Set `main_tree_to_execute` to one of the file's trees   |
| `unknown-main-tree`     | Retarget `main_tree_to_execute`, or create the tree     |
| `missing-required-port` | Add `port="{port}"` (blackboard placeholder)            |
| `unknown-port`          | Remove the attribute (never `_`-prefixed directives)    |
| `duplicate-tree-id`     | Rename the duplicate to `ID_2`, `ID_3`, …               |
| `missing-btcpp-format`  | Declare `BTCPP_format="4"` on `<root>`                  |
| `v4-only-node`          | Convert the file to BTCpp v4                            |
| `no-behavior-tree`      | Add `<BehaviorTree ID="MainTree">`                      |

Structural issues (`too-many-children`, `leaf-has-children`, `subtree-cycle`, `subtree-missing-id`) have no automatic fix.

---

## Simple mode (0.9)

When `btview.simpleMode` is true, hide Cut, model export, and advanced type menus; keep Delete, Rename, Add child, Inspect.
