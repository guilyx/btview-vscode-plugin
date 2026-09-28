# BTView documentation

**Current release:** [v0.9.0](https://github.com/guilyx/btview-vscode-plugin/releases/tag/v0.9.0) · **Integration branch:** `devel`

Publisher: **rangonomics** · Extension ID: `rangonomics.btview`

**Documentation site:** <https://guilyx.github.io/btview-vscode-plugin/> — built from this folder with VitePress (`npm run docs:dev`), including a [live browser demo](try.md). See [Docs & media](development/MEDIA.md).

## Quick links

| I want to…                          | Start here                                                          |
| ----------------------------------- | ------------------------------------------------------------------- |
| Install BTView                      | [Getting started → Installation](getting-started/INSTALLATION.md)   |
| Learn by doing                      | [Tutorials → Your first tree](tutorials/first-tree.md)              |
| Use every feature                   | [Getting started → User guide](getting-started/USER_GUIDE.md)       |
| Look up commands / settings / XML   | [Reference](reference/commands.md)                                  |
| Configure settings / ROS includes   | [Getting started → Configuration](getting-started/CONFIGURATION.md) |
| Build, test, or debug the extension | [Development → Dev guide](development/DEVELOPMENT.md)               |
| Understand the codebase             | [Development → Architecture](development/ARCHITECTURE.md)           |
| Fix webview / infinite loading      | [Development → Webview guide](development/WEBVIEW.md)               |
| Regenerate screenshots / video      | [Development → Docs & media](development/MEDIA.md)                  |
| See what's planned                  | [Roadmap](ROADMAP.md)                                               |
| Cut a release                       | [Release → Process](release/RELEASE.md)                             |

## Documentation map

```text
docs/
├── README.md                 ← you are here (GitHub index; not part of the site)
├── index.md                  docs site home page
├── try.md                    live browser demo page
├── ROADMAP.md                product milestones & backlog
├── getting-started/          end users
│   ├── INSTALLATION.md
│   ├── USER_GUIDE.md
│   └── CONFIGURATION.md
├── tutorials/                hands-on walkthroughs
│   ├── first-tree.md
│   ├── ports-and-models.md
│   ├── subtrees-and-includes.md
│   ├── validate-simulate-verify.md
│   └── migrate-v3-v4.md
├── reference/                commands, settings, XML format, protocol
├── development/              contributors & extension internals
│   ├── DEVELOPMENT.md
│   ├── ARCHITECTURE.md
│   ├── WEBVIEW.md
│   ├── BRANCHING.md
│   └── MEDIA.md              docs site, demo harness, screenshots & video
├── planning/                 product vision & future work
│   ├── EDITOR_ROADMAP.md
│   ├── COMMAND_SURFACES.md
│   ├── GROOT_PARITY.md
│   └── AI_AGENT_INTEGRATION.md
├── release/                  publishing & distribution
│   ├── RELEASE.md
│   └── DISTRIBUTION.md
├── images/                   diagrams (assets)
├── public/                   site assets: screenshots/, media/ (promo video, GIF)
└── .vitepress/               site config and theme
```

## Planning & vision

- **[Roadmap](ROADMAP.md)** — version milestones, active backlog, shipped summary
- **[Editor roadmap](planning/EDITOR_ROADMAP.md)** — E-01…E-47 checklist, dev tags, 1.0 criteria
- **[Command surfaces](planning/COMMAND_SURFACES.md)** — shortcuts, context menus, host vs webview
- **[Groot parity](planning/GROOT_PARITY.md)** — feature matrix vs Groot2; editor UX priorities
- **[AI & agents](planning/AI_AGENT_INTEGRATION.md)** — Cursor skills, MCP, graph capture path

## Repository docs (outside `docs/`)

| Doc                                   | Audience                       |
| ------------------------------------- | ------------------------------ |
| [README.md](../README.md)             | Project overview               |
| [CHANGELOG.md](../CHANGELOG.md)       | Version history                |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | PR workflow                    |
| [AGENTS.md](../AGENTS.md)             | Cursor / CI agent instructions |
