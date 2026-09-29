# BTView User Guide

## Installation

| Method              | Steps                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| VS Code Marketplace | Extensions → search **BTView** → Install                                                       |
| Open VSX (Cursor)   | Extensions → search **BTView** or install from [open-vsx.org](https://open-vsx.org)            |
| VSIX (manual)       | Download `.vsix` from GitHub Releases → Command Palette → **Extensions: Install from VSIX...** |

## Opening a behavior tree

### Title bar icons (VS Code — like Markdown preview)

The SVG files in `media/icons/` are **not unused** — they are the icons for the **editor tab title bar** (top-right of the XML tab), wired exactly like Markdown’s preview button:

```json
"menus": {
  "editor/title": [
    { "command": "btview.openPreview", "when": "editorLangId == xml", "group": "navigation" }
  ]
}
```

| Icon          | Shows when                           | Action                                         |
| ------------- | ------------------------------------ | ---------------------------------------------- |
| Graph (nodes) | XML **text** editor is active        | Click → BT Graph tab; Alt+click → graph beside |
| XML (code)    | **BT Graph** custom editor is active | Click → back to XML source                     |

This is **supported by the VS Code extension API** — plugins cannot draw buttons _inside_ the text editor surface, only on the **tab chrome** (`editor/title`), which is what Markdown uses.

**Cursor** may hide third-party `editor/title` icons even when configured correctly. Use the in-graph **XML Source** / **Graph beside** header buttons, or Command Palette / shortcuts.

### From the XML text editor

1. Open any `.xml` file with a BTCpp `<root>` and `<BehaviorTree>` elements
2. Use the title bar icon in the **top-right** of the editor tab (VS Code; may not appear in Cursor):
   - **Click** the graph icon → BT Graph as editor tab (`Ctrl+Shift+V`)
   - **Alt+click** the graph icon → graph beside XML (`Ctrl+K V`)
   - When in graph mode, click the **XML icon** in the title bar → back to source
3. **In the graph view**, use **XML Source** / **Graph beside** in the header toolbar (always visible)
4. Or Command Palette → **BTView: Open BT Graph** / **Open BT Graph to the Side**

### From the graph editor

- Click **Open XML Source** in the title bar to switch back to the text editor
- Or right-click the tab → **Reopen Editor With…** → **Text Editor**

### Default open mode

Set `btview.defaultOpenMode` to `"graph"` or `"side"` to auto-open BTCpp files in graph mode (see [CONFIGURATION.md](CONFIGURATION.md)).

## Graph editor

- **Pan/zoom**: scroll and drag the canvas; use the controls panel or minimap; `Ctrl+0` fits the view
- **Tree selector**: dropdown in the header when multiple `<BehaviorTree ID="...">` exist
- **Format badge**: shows `BTCpp v3.8` or `BTCpp v4` — edits preserve the detected format
- **Inspect node**: click a node → right panel shows `name`, ports, and attributes
- **Keyboard navigation**: arrow keys walk the tree (`↑` parent, `↓` first child, `←`/`→` siblings); press `?` for the full shortcut cheat sheet
- **Search**: `Ctrl+F`, then `Enter` / `Shift+Enter` to cycle matches — the viewport centers on each hit
- **Edit attributes**: change values in the inspector; XML updates automatically
- **Add nodes**: drag from the palette sidebar, or connect a staged node to a parent
- **Delete node**: `Del`, the inspector button, or the right-click menu
- **Reparent**: drag a node onto a new parent
- **SubTree**: double-click a subtree node to drill in; a breadcrumb trail in the header takes you back
- **Issues panel**: click a validation issue to jump to the offending node; **Fix** applies a quick fix
- **Includes**: click include chips in the header to open resolved files

### Getting started and empty states

- A **Getting started** card lists the basics the first time you open a graph; dismiss it once and it stays hidden in every editor
- **Empty tree**: pick **Start with Sequence** / **Start with Fallback**, or drag nodes from the palette and connect them
- **No `<BehaviorTree>` in the file**: **Add BehaviorTree** creates `MainTree` (and sets `main_tree_to_execute`)
- **XML that does not parse**: the graph shows the error with its line and column plus **Open XML Source**; it reloads by itself once the XML is fixed. The same error is in the Problems panel
- **BTView: New Behavior Tree** opens an empty canvas directly in the graph

## Validation and quick fixes

BTView validates BTCpp XML whether it is open as text or as a graph. Issues appear in the **Problems** panel (source `btview`), anchored on the offending element, each with a stable code.

| Where                 | How                                                                    |
| --------------------- | ---------------------------------------------------------------------- |
| XML editor            | Put the cursor on the squiggle → lightbulb or `Ctrl+.`                 |
| XML editor (v3 files) | **Source Action…** → **Convert file to BTCpp v4** (in place, undoable) |
| Graph Issues panel    | **Fix** next to the issue                                              |
| Graph inspector       | **Fix** in the selected node's Issues box                              |

Available fixes: create a stub tree for an unknown `<SubTree ID>`, set or retarget `main_tree_to_execute`, add a missing required port as `port="{port}"`, rename a duplicate `<BehaviorTree ID>`, declare `BTCPP_format="4"`, remove an unknown attribute, convert a v3 file that uses v4-only nodes, and add a first `<BehaviorTree>`. Fixes edit only the affected text (comments and formatting are kept). In the XML editor undo with `Ctrl+Z`; from the graph use graph Undo. See [Command surfaces](../planning/COMMAND_SURFACES.md#validation-quick-fixes-09) for the full code → fix table.

## Keyboard and accessibility

- **Tab** / **Shift+Tab** move between node cards (focus selects the node); arrow keys walk the tree
- **Enter** jumps into the inspector for the selected node; **F2** renames; **Del** deletes
- **Shift+F10** (or the Menu key) opens the context menu; use `↑`/`↓`, `Home`/`End`, `Enter` and `Escape` inside it
- **?** opens the shortcut list (a modal dialog; `Escape` closes it)
- Screen readers hear each node as kind, type, instance name, child count, simulation status and whether it has issues; selection changes and simulation results are announced
- Colors, borders and focus rings come from the active VS Code theme, including high-contrast themes; with the OS **reduce motion** setting on, the RUNNING pulse, loader animation and viewport transitions are disabled

## Text editor features

When a file is recognized as a BehaviorTree.CPP document (a `<root>` with `<BehaviorTree>` or `<TreeNodesModel>`, or any `*.bt.xml` file), the plain XML text editor becomes BT-aware. Other XML files are left alone.

- **Completion**
  - Element names inside a `<BehaviorTree>`: built-in controls, decorators and actions for the detected format (v3.8 or v4), plus custom nodes from the file's `<TreeNodesModel>`, its includes, the workspace models file (`btview.customModelsInclude`, default `.btview/models.xml`) and `btview.nodeTypeMap`. Nodes with required input ports insert them as a snippet.
  - Under `<root>`: `BehaviorTree`, `TreeNodesModel`, `include`. Inside `<TreeNodesModel>`: `Action` / `Condition` / `Control` / `Decorator` / `SubTree` and the `input_port` / `output_port` / `inout_port` tags.
  - Attribute names: the node's declared ports (direction, type and default shown), `name`, and in v4 the `_skipIf` / `_successIf` / `_failureIf` / `_while` / `_onSuccess` / `_onFailure` / `_post` / `_onHalted` script attributes.
  - Attribute values: `<SubTree ID="…">` and `main_tree_to_execute` suggest trees from the file and its includes; `<Action ID="…">`-style wrappers suggest declared nodes of that kind; typing `{` suggests blackboard keys already used in the file; boolean ports suggest `true` / `false`.
- **Hover** — node names show kind, source (built-in, TreeNodesModel, include path, workspace models, or setting) and a ports table; port attributes show direction, type, default and description; `{key}` values list every node that reads, writes or remaps that blackboard entry; SubTree IDs show where the tree is defined and how often it is referenced.
- **Go to Definition** (`F12`) — from `<SubTree ID>` or `main_tree_to_execute` to the `<BehaviorTree ID>` (in this file or a resolved include); from a custom node to its TreeNodesModel entry; from `<include path>` to the file (relative paths and `ros_pkg`); from `{key}` to where it is written.
- **Find All References** (`Shift+F12`) — SubTree usages of a tree, instances of a custom node, and uses of a blackboard key.
- **Rename** (`F2`) — renaming a `<BehaviorTree ID>` updates every `<SubTree ID>` reference and `main_tree_to_execute` in the same file. Trees defined in an included file must be renamed there.
- **Outline** — trees as top-level symbols with the nested node hierarchy (instance `name` or node ID), plus includes and the TreeNodesModel section. Also powers breadcrumbs and `Ctrl+Shift+O`.
- **CodeLens** — above each `<BehaviorTree>`: **Open in BT Graph** (opens the graph with that tree selected), the node count, and a clickable SubTree reference count.

Disable all of the above with `"btview.languageFeatures.enabled": false`.

## Commands

| Command                   | ID                       |
| ------------------------- | ------------------------ |
| Open BT Graph             | `btview.openPreview`     |
| Open BT Graph to the Side | `btview.openPreviewSide` |
| Open XML Source           | `btview.openSource`      |
| Convert to BTCpp v4       | `btview.convertToV4`     |
| New Behavior Tree         | `btview.newTree`         |

`btview.newTree` also accepts an argument object for scripts and keybindings — `{ "uri", "formatVersion", "treeId", "rootControl", "openIn" }` — and then runs without prompts (`uri` is required in that mode).

## v3 → v4 migration

1. Open a v3.8 XML file (no `BTCPP_format` attribute)
2. Run **BTView: Convert to BTCpp v4**
3. Review the diff in the VS Code diff editor
4. Manually fix flagged nodes (`SetBlackboard`, `BlackboardCheck*`) before saving

## Troubleshooting

**Graph is empty** — The graph says why: no `<BehaviorTree>` (use **Add BehaviorTree**), an empty tree (pick a starter root), or an XML syntax error (see the line/column shown and the Problems panel).

**ROS include not found** — Source your ROS workspace or configure `btview.rosPackageShareOverrides`. See [CONFIGURATION.md](CONFIGURATION.md).

**Edits not syncing** — Check the Problems panel for XML syntax errors; save the file.

**Extension not found in Cursor** — Install from VSIX or Open VSX. See [Distribution](../release/DISTRIBUTION.md).
