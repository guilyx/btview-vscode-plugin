# Getting started

BTView turns BehaviorTree.CPP XML files into an interactive graph inside **VS Code** and **Cursor**. It reads and writes both **v3.8** and **v4** (`BTCPP_format="4"`) files and keeps the XML as the source of truth.

![BTView graph editor](/screenshots/overview.png)

## Install

| Editor      | How                                                                                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **VS Code** | Extensions view → search **BTView**, or Quick Open (<kbd>Ctrl</kbd>+<kbd>P</kbd>) → `ext install rangonomics.btview`                                    |
| **Cursor**  | Extensions view → search **BTView** (published on [Open VSX](https://open-vsx.org/extension/rangonomics/btview))                                        |
| **VSIX**    | Download `btview-<version>.vsix` from [GitHub Releases](https://github.com/guilyx/btview-vscode-plugin/releases) → **Extensions: Install from VSIX...** |

Requirements: VS Code **1.125+** (or a recent Cursor). A ROS 2 workspace is only needed if your trees use `<include ros_pkg="…">`. See [Distribution](../release/DISTRIBUTION.md) for details on registries.

## Open your first tree

1. Open a `.xml` file that contains `<root>` and at least one `<BehaviorTree ID="…">`.
2. Press <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>V</kbd> (<kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>V</kbd> on macOS) — or click the graph icon in the editor title bar, or run **BTView: Open BT Graph**.
3. Want XML and graph side by side? Use <kbd>Ctrl</kbd>+<kbd>K</kbd> <kbd>V</kbd> (**BTView: Open BT Graph to the Side**).

Don't have a tree yet? Run **BTView: New Behavior Tree**, or follow [Your first behavior tree in 5 minutes](../tutorials/first-tree.md).

::: tip Cursor
Cursor may hide third-party editor title icons. The graph header always has **XML Source** and **Graph beside** buttons, and every action is in the Command Palette under **BTView:**.
:::

## Open trees in graph mode by default

```json
{ "btview.defaultOpenMode": "side" }
```

`"graph"` opens the BT Graph editor tab, `"side"` keeps the XML and opens the graph beside it, `"text"` (default) leaves files alone. All settings are in [Configuration](CONFIGURATION.md).

## Where next

- [User guide](USER_GUIDE.md) — every panel and gesture
- [Tutorials](../tutorials/first-tree.md) — hands-on walkthroughs
- [Try it live](../try.md) — the same UI in your browser
