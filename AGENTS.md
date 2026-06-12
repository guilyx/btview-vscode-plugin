# BTView — Agent Instructions

Visual VS Code extension for BehaviorTree.CPP v3/v4 XML. Publisher: **rangonomics** (`rangonomics.btview`).

## Build & test

```bash
bash scripts/with-node.sh npm run compile   # typecheck + extension + webview
bash scripts/with-node.sh npm test           # unit + integration
pre-commit run --all-files                 # lint, format, commitlint
bash scripts/with-node.sh npm run vsix       # package VSIX
```

Node **20+** required. Use `scripts/with-node.sh` for all npm scripts locally.

## Architecture

| Path | Role |
|------|------|
| `src/btcpp/` | Parse, serialize, validate, edit (VS Code–agnostic) |
| `src/sync/DocumentSyncService.ts` | Bridge domain ↔ workspace XML |
| `src/preview/` | Custom editor, webview host, message routing |
| `webview/` | React Flow UI (no direct `vscode` API — use `vscodeApi.ts`) |
| `src/shared/protocol.ts` | Host ↔ webview message types |

## PR workflow

1. Branch from `main`: `feat/prof-XX-<name>` or `fix/<topic>`
2. Log changes under `[Unreleased]` in `CHANGELOG.md`
3. Conventional Commits: `feat:`, `fix:`, `chore:`, `test:`, `docs:`
4. Local gate: compile + test (+ pre-commit)
5. Open PR; wait for CI green (pre-commit, ubuntu/macos/windows build, VSIX on ubuntu)
6. Merge; delete branch

## Release workflow

See [docs/RELEASE.md](docs/RELEASE.md). Roadmap: [docs/ROADMAP.md](docs/ROADMAP.md).

- **Ask first:** version bumps, git tags, Marketplace publish
- **Never:** commit secrets, skip hooks, force-push `main`

## Boundaries

**Always:** update CHANGELOG; run tests before PR; match existing code style.

**Never:** hardcode API keys; modify `node_modules/`; co-sign commits.
