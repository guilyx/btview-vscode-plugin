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

**Note:** `Ctrl+Shift+P` is VS Code Command Palette — ports use `Ctrl+Alt+P`.

---

## Context menus

Webview HTML overlays at click position; dismissed on click-outside or Escape.

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

## Simple mode (0.9)

When `btview.simpleMode` is true, hide Cut, model export, and advanced type menus; keep Delete, Rename, Add child, Inspect.
