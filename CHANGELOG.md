# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- CI runs on pull requests targeting any branch (stacked `feat/*` PRs included)
- GitHub Actions no longer fails when `with-node.sh` calls `nvm use` for an uninstalled `.nvmrc` version
- Title bar graph/XML toggle buttons now appear in the primary navigation area (Markdown-style single icon with Alt+click for side preview), not hidden under `...`

### Added

- **Custom Text Editor** (`BT Graph`) with Reopen With / Open XML Source (Markdown-like UX)
- Side-by-side graph preview (`Ctrl+K V`) while keeping the XML editor
- `btview.defaultOpenMode` setting (`text` | `graph` | `side`)
- `btview.openSource` command and title bar buttons
- BehaviorTree.CPP v3.8 and v4 XML parsing and serialization
- Visual graph editor webview with React Flow
- Bidirectional XML sync
- ROS `ros_pkg` include resolution
- v3 to v4 migration command
- Unit and integration tests
- Documentation (user guide, development, distribution, configuration)

## [0.1.0] - 2026-06-11

### Added

- First release of BTView behavior tree visual editor
