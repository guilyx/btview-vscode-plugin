# BTView Configuration

All settings are under the **BTView** section in VS Code settings.

## Settings reference

### `btview.rosDistro`

ROS distribution name (e.g. `humble`, `jazzy`). Used when `btview.rosWorkspaceSetup` is not set.

```json
{ "btview.rosDistro": "jazzy" }
```

### `btview.rosWorkspaceSetup`

Path to a `setup.bash` or `setup.zsh` file to source before resolving ROS packages.

```json
{
  "btview.rosWorkspaceSetup": "/home/user/ros2_ws/install/setup.bash"
}
```

### `btview.rosPackageShareOverrides`

Manual map of ROS package name → share directory. Highest priority.

```json
{
  "btview.rosPackageShareOverrides": {
    "swarm_behavior_trees": "/home/user/ros2_ws/install/swarm_behavior_trees/share/swarm_behavior_trees"
  }
}
```

### `btview.defaultFormatVersion`

How to interpret XML without `BTCPP_format`:

- `"auto"` (default) — treat as v3.8
- `"3"` — force v3.8 parser
- `"4"` — force v4 parser

### `btview.defaultOpenMode`

How BTCpp XML files open when detected (`<root>` + `<BehaviorTree>`):

- `"text"` (default) — normal XML text editor
- `"graph"` — BT Graph custom editor (Markdown-style full preview tab)
- `"side"` — XML editor with graph preview beside it (`Ctrl+K V` layout)

```json
{ "btview.defaultOpenMode": "side" }
```

## Editor modes (Markdown-like)

| Action                    | Shortcut         | Result                                                |
| ------------------------- | ---------------- | ----------------------------------------------------- |
| Open BT Graph             | `Ctrl+Shift+V`   | Graph as custom editor tab (Reopen With **BT Graph**) |
| Open BT Graph to the Side | `Ctrl+K V`       | XML stays open; graph webview beside it               |
| Open XML Source           | title bar button | Switch from graph tab back to text editor             |

Right-click a file tab → **Reopen Editor With…** → **Text Editor** or **BT Graph**.

### `btview.serializeNewFilesAs`

Format for newly created trees from the palette: `"3"` or `"4"` (default).

## ROS include resolution

For XML like:

```xml
<include ros_pkg="swarm_behavior_trees" path="behavior_trees_xml/prod/subtrees/land_home.xml"/>
```

BTView resolves the path as:

```
join(share_directory(swarm_behavior_trees), "behavior_trees_xml/prod/subtrees/land_home.xml")
```

Resolution order:

1. `btview.rosPackageShareOverrides`
2. `ros2 pkg prefix --share <pkg>` (after sourcing setup script)
3. Workspace `install/<pkg>/share/<pkg>`
4. `AMENT_PREFIX_PATH` index

## Example workspace settings

```json
{
  "btview.rosWorkspaceSetup": "/home/user/ros2_ws/install/setup.bash",
  "btview.rosDistro": "jazzy",
  "btview.rosPackageShareOverrides": {
    "swarm_behavior_trees": "/home/user/ros2_ws/install/swarm_behavior_trees/share/swarm_behavior_trees"
  }
}
```
