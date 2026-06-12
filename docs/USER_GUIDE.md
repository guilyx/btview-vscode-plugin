# BTView User Guide

## Installation

| Method              | Steps                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| VS Code Marketplace | Extensions → search **BTView** → Install                                                       |
| Open VSX (Cursor)   | Extensions → search **BTView** or install from [open-vsx.org](https://open-vsx.org)            |
| VSIX (manual)       | Download `.vsix` from GitHub Releases → Command Palette → **Extensions: Install from VSIX...** |

## Opening a behavior tree

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

- **Pan/zoom**: scroll and drag the canvas; use the controls panel for fit-to-view
- **Tree selector**: dropdown in the header when multiple `<BehaviorTree ID="...">` exist
- **Format badge**: shows `BTCpp v3.8` or `BTCpp v4` — edits preserve the detected format
- **Inspect node**: click a node → right panel shows `name`, ports, and attributes
- **Edit attributes**: change values in the inspector; XML updates automatically
- **Add nodes**: select a parent node, then use toolbar buttons
- **Delete node**: use the Delete button in the inspector
- **Reparent**: drag a node onto a new parent
- **SubTree**: double-click navigation planned via include buttons
- **Includes**: click include chips in the header to open resolved files

## Commands

| Command                   | ID                       |
| ------------------------- | ------------------------ |
| Open BT Graph             | `btview.openPreview`     |
| Open BT Graph to the Side | `btview.openPreviewSide` |
| Open XML Source           | `btview.openSource`      |
| Convert to BTCpp v4       | `btview.convertToV4`     |

## v3 → v4 migration

1. Open a v3.8 XML file (no `BTCPP_format` attribute)
2. Run **BTView: Convert to BTCpp v4**
3. Review the diff in the VS Code diff editor
4. Manually fix flagged nodes (`SetBlackboard`, `BlackboardCheck*`) before saving

## Troubleshooting

**Graph is empty** — Ensure the XML has a valid `<BehaviorTree>` with child nodes.

**ROS include not found** — Source your ROS workspace or configure `btview.rosPackageShareOverrides`. See [CONFIGURATION.md](CONFIGURATION.md).

**Edits not syncing** — Check the Problems panel for XML syntax errors; save the file.

**Extension not found in Cursor** — Install from VSIX or Open VSX. See [DISTRIBUTION.md](DISTRIBUTION.md).
