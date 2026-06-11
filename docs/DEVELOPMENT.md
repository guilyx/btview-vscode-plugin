# BTView Development Guide

## Prerequisites

- **Node.js 20+** (project `.nvmrc` pins 22 — run `nvm use` before npm commands)
- npm
- VS Code or Cursor

If you see `SyntaxError: Unexpected token '?'` when running `tsc`, your shell is using an old system Node (e.g. v12). Fix:

```bash
nvm install    # reads .nvmrc
nvm use
node -v        # should be v20+
```

All npm scripts use `scripts/with-node.sh` to auto-load nvm when available.

## Setup

```bash
git clone <repo-url> btview-vscode-plugin
cd btview-vscode-plugin
npm ci
```

## Dev loop

```bash
npm run watch
```

Press **F5** → **Run Extension** to open an Extension Development Host.

Open a fixture file, e.g. `fixtures/v4/simple_sequence.xml`, then run **BTView: Open BT Graph**.

## Scripts

| Script                     | Purpose                                 |
| -------------------------- | --------------------------------------- |
| `npm run compile`          | Production build (extension + webview)  |
| `npm run watch`            | Parallel watch: esbuild + tsc + webview |
| `npm run check-types`      | TypeScript type-check                   |
| `npm run lint`             | ESLint                                  |
| `npm run test`             | Unit + integration tests                |
| `npm run test:unit`        | Vitest parser/serializer tests          |
| `npm run test:integration` | VS Code extension tests                 |
| `npm run package`          | Production compile                      |
| `npm run vsix`             | Create `.vsix` package                  |

## Project structure

- `src/extension.ts` — activation and commands
- `src/btcpp/` — XML parser, serializer, migration (v3 + v4)
- `src/preview/` — webview panel manager
- `src/sync/` — bidirectional document sync
- `src/ros/` — ROS package path resolution
- `webview/` — React + React Flow UI
- `fixtures/` — sample XML for tests

## Debugging

- **Extension host**: Debug Console when running F5
- **Webview**: In Extension Development Host → Command Palette → **Developer: Open Webview Developer Tools**

## Pre-commit hooks

Husky runs lint-staged on commit (ESLint + Prettier). Commits must follow [Conventional Commits](https://www.conventionalcommits.org/).

## Adding tests

- Unit tests: `src/test/unit/*.test.ts` with Vitest
- Fixtures: `fixtures/v3/` and `fixtures/v4/`
- Integration: `src/test/suite/*.test.ts`

## Cursor development

```bash
cursor --extensionDevelopmentPath=/path/to/btview-vscode-plugin
```

Or set Cursor as the debug host in VS Code launch configuration.
