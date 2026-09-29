# BTView — Behavior Tree Editor

[![CI](https://github.com/guilyx/btview-vscode-plugin/actions/workflows/ci.yml/badge.svg)](https://github.com/guilyx/btview-vscode-plugin/actions/workflows/ci.yml)
![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)
![VS Code](https://img.shields.io/badge/VS%20Code-%3E%3D1.125-brightgreen)
[![Docs](https://img.shields.io/badge/docs-guilyx.github.io-4a9eff)](https://guilyx.github.io/btview-vscode-plugin/)

Visual graph editor, simulator and verifier for **BehaviorTree.CPP v3.8 and v4** XML files. Works in **VS Code** and **Cursor**.

**[Documentation site](https://guilyx.github.io/btview-vscode-plugin/)** · **[Try it live in your browser](https://guilyx.github.io/btview-vscode-plugin/try)** · [Tutorials](https://guilyx.github.io/btview-vscode-plugin/tutorials/first-tree) · [Promo video](https://raw.githubusercontent.com/guilyx/btview-vscode-plugin/main/docs/public/media/promo.mp4)

![BTView: editing ports, drilling into subtrees, validating and simulating a behavior tree](https://raw.githubusercontent.com/guilyx/btview-vscode-plugin/main/docs/public/media/demo.gif)

## Features

**Edit visually**

- Interactive behavior tree graph (zoom, pan, minimap, node inspector) with a tidy tree layout
- Bidirectional XML sync — graph edits are written back to the file, text edits refresh the graph
- Typed ports from `TreeNodesModel` (inputs / outputs / in-out, C++ types, defaults), port chips on nodes
- Node palette with drag-and-drop, model editor (add / copy XML / delete), copy / paste / duplicate subtrees, undo / redo
- Full keyboard workflow — arrow-key tree navigation, search with match cycling (`Enter`/`Shift+Enter`), `F2` rename (press `?` in the graph for the cheat sheet)
- Node kind glyphs and colors (`→` Sequence, `?` Fallback, `⇉` Parallel, `↻` Retry, …), light and dark themes

**Navigate real-world trees**

- Subtree drill-down with breadcrumb navigation, multi-tree files, `main_tree_to_execute`
- Include resolution: relative paths, absolute paths, ROS 2 `ros_pkg`
- BT-aware XML text editor — completion for nodes, ports and blackboard keys, hover with port tables, go to definition / references / rename for trees, Outline, and an **Open in BT Graph** CodeLens
- Dual format support: auto-detect v3.8 vs v4 (`BTCPP_format="4"`), version-faithful round-trip, v3 → v4 migration with diff preview

**Check behaviour before you run the robot**

- Validation pack — missing required ports, unknown attributes, undefined or recursive subtrees, bad child counts, v4-only nodes in v3; in the issues panel (click to jump) and the Problems view
- Offline tick simulation — step / play the tree with BehaviorTree.CPP semantics and watch RUNNING / SUCCESS / FAILURE overlays and the blackboard live
- Bounded verification — `BTView: Verify Tree` proves "root can succeed / can fail / always terminates" over every leaf outcome, with witnesses
- Trace testing — declarative `*.trace.json` scenarios (leaf mocks + expected statuses) that run as a CI gate

| Typed ports in the inspector                                                                                                                  | Simulation with live status overlays                                                                                              |
| --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| ![Inspector with typed ports](https://raw.githubusercontent.com/guilyx/btview-vscode-plugin/main/docs/public/screenshots/inspector-ports.png) | ![Simulation overlays](https://raw.githubusercontent.com/guilyx/btview-vscode-plugin/main/docs/public/screenshots/simulation.png) |
| **Validation issues, click to jump**                                                                                                          | **Graph edits highlighted in the XML**                                                                                            |
| ![Validation issues](https://raw.githubusercontent.com/guilyx/btview-vscode-plugin/main/docs/public/screenshots/validation-issues.png)        | ![Graph to XML sync](https://raw.githubusercontent.com/guilyx/btview-vscode-plugin/main/docs/public/screenshots/xml-sync.png)     |

## Requirements

- VS Code ≥ 1.125 or Cursor (Marketplace / VSIX from [GitHub Releases](https://github.com/guilyx/btview-vscode-plugin/releases))
- Node.js 20+ (development only)
- ROS 2 workspace (optional, for `ros_pkg` includes)

## Install

| IDE         | How                                                                                                                                     |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **VS Code** | Extensions → search **BTView** or `ext install rangonomics.btview`                                                                      |
| **Cursor**  | Extensions → search **BTView** ([Open VSX](https://open-vsx.org/extension/rangonomics/btview))                                          |
| **Any**     | Download `.vsix` from [GitHub Releases](https://github.com/guilyx/btview-vscode-plugin/releases) → **Extensions: Install from VSIX...** |

Cursor uses Open VSX, not the Microsoft Marketplace. See [Distribution guide](docs/release/DISTRIBUTION.md#install-in-cursor).

## Quick start

1. Open a `.xml` file containing a BehaviorTree.CPP tree
2. Click **Open BT Graph** in the editor title bar, or run **BTView: Open BT Graph** from the Command Palette
3. Use **BTView: Open BT Graph to the Side** for split XML + graph view
4. Click nodes to inspect and edit kind, type, name, and ports

## Documentation

**[guilyx.github.io/btview-vscode-plugin](https://guilyx.github.io/btview-vscode-plugin/)** — guides, tutorials, reference and a live demo. The sources live in [`docs/`](docs/README.md).

| Topic              | Guide                                                                                        |
| ------------------ | -------------------------------------------------------------------------------------------- |
| Using BTView       | [User guide](docs/getting-started/USER_GUIDE.md) · [Tutorials](docs/tutorials/first-tree.md) |
| Settings & ROS     | [Configuration](docs/getting-started/CONFIGURATION.md)                                       |
| Building & testing | [Development](docs/development/DEVELOPMENT.md)                                               |
| Architecture       | [Architecture](docs/development/ARCHITECTURE.md) · [Protocol](docs/reference/protocol.md)    |
| Docs, demo & media | [Media pipeline](docs/development/MEDIA.md)                                                  |
| Publishing         | [Release](docs/release/RELEASE.md) · [Distribution](docs/release/DISTRIBUTION.md)            |
| Roadmap            | [Roadmap](docs/ROADMAP.md)                                                                   |

## Development

Contributors: branch from **`devel`** and open PRs to **`devel`**. See [CONTRIBUTING.md](CONTRIBUTING.md) and [Branching](docs/development/BRANCHING.md).

```bash
git checkout devel
npm ci
pip install pre-commit   # or: uv tool install pre-commit
pre-commit install -t pre-commit -t commit-msg
npm run watch            # dev mode
# Press F5 to launch Extension Development Host
```

```bash
npm test         # unit + integration tests
npm run package  # production build
npm run vsix     # create .vsix installer
```

## License

Apache-2.0 — see [LICENSE](LICENSE).
