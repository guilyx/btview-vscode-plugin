# BTView documentation

**Current release:** [v0.4.3](https://github.com/guilyx/btview-vscode-plugin/releases/tag/v0.4.3) · **Integration branch:** `devel`

Publisher: **rangonomics** · Extension ID: `rangonomics.btview`

## Quick links

| I want to…                          | Start here                                                          |
| ----------------------------------- | ------------------------------------------------------------------- |
| Install and use BTView              | [Getting started → User guide](getting-started/USER_GUIDE.md)       |
| Configure settings / ROS includes   | [Getting started → Configuration](getting-started/CONFIGURATION.md) |
| Build, test, or debug the extension | [Development → Dev guide](development/DEVELOPMENT.md)               |
| Understand the codebase             | [Development → Architecture](development/ARCHITECTURE.md)           |
| Fix webview / infinite loading      | [Development → Webview guide](development/WEBVIEW.md)               |
| See what's planned                  | [Roadmap](ROADMAP.md)                                               |
| Cut a release                       | [Release → Process](release/RELEASE.md)                             |

## Documentation map

```text
docs/
├── README.md                 ← you are here
├── ROADMAP.md                product milestones & backlog
├── getting-started/          end users
│   ├── USER_GUIDE.md
│   └── CONFIGURATION.md
├── development/              contributors & extension internals
│   ├── DEVELOPMENT.md
│   ├── ARCHITECTURE.md
│   ├── WEBVIEW.md
│   └── BRANCHING.md
├── planning/                 product vision & future work
│   ├── GROOT_PARITY.md
│   └── AI_AGENT_INTEGRATION.md
├── release/                  publishing & distribution
│   ├── RELEASE.md
│   └── DISTRIBUTION.md
└── images/                   screenshots & diagrams (assets)
```

## Planning & vision

- **[Roadmap](ROADMAP.md)** — version milestones, active backlog, shipped summary
- **[Groot parity](planning/GROOT_PARITY.md)** — feature matrix vs Groot2; editor UX priorities
- **[AI & agents](planning/AI_AGENT_INTEGRATION.md)** — Cursor skills, MCP, graph capture path

## Repository docs (outside `docs/`)

| Doc                                   | Audience                       |
| ------------------------------------- | ------------------------------ |
| [README.md](../README.md)             | Project overview               |
| [CHANGELOG.md](../CHANGELOG.md)       | Version history                |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | PR workflow                    |
| [AGENTS.md](../AGENTS.md)             | Cursor / CI agent instructions |
