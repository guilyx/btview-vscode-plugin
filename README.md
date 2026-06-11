# BTView — Behavior Tree Editor

[![CI](https://github.com/guilyx/btview-vscode-plugin/actions/workflows/ci.yml/badge.svg)](https://github.com/guilyx/btview-vscode-plugin/actions/workflows/ci.yml)
![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)
![VS Code](https://img.shields.io/badge/VS%20Code-%3E%3D1.85-brightgreen)

Visual graph editor for **BehaviorTree.CPP v3.8 and v4** XML files. Works in **VS Code** and **Cursor**.

## Features

- Interactive behavior tree graph (zoom, pan, node inspector)
- Bidirectional XML sync — edits in the graph update the XML file
- Dual format support: auto-detect v3.8 vs v4 (`BTCPP_format="4"`)
- Include resolution: relative paths, absolute paths, ROS `ros_pkg`
- Optional v3 → v4 migration with diff preview
- Version-faithful round-trip serialization

## Requirements

- VS Code ≥ 1.85 or Cursor (via Open VSX / VSIX)
- Node.js 20+ (development only)
- ROS 2 workspace (optional, for `ros_pkg` includes)

## Quick start

1. Open a `.xml` file containing a BehaviorTree.CPP tree
2. Click **Open BT Graph** in the editor title bar, or run **BTView: Open BT Graph** from the Command Palette
3. Use **BTView: Open BT Graph to the Side** for split XML + graph view
4. Click nodes to inspect and edit attributes; use the toolbar to add nodes

## Documentation

- [User Guide](docs/USER_GUIDE.md) — installation, commands, editing workflow
- [Configuration](docs/CONFIGURATION.md) — settings and ROS include setup
- [Development](docs/DEVELOPMENT.md) — build, test, debug
- [Distribution](docs/DISTRIBUTION.md) — package VSIX, publish to Marketplace / Open VSX

## Development

```bash
npm ci
npm run watch    # dev mode
# Press F5 to launch Extension Development Host
```

```bash
npm test         # unit + integration tests
npm run package  # production build
npm run vsix     # create .vsix installer
```

## License

Apache-2.0 — see [LICENSE](LICENSE).
