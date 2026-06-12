# BTView — Agent Instructions

Visual VS Code extension for BehaviorTree.CPP v3/v4 XML. Publisher: **rangonomics** (`rangonomics.btview`).

## Branches

| Branch  | Merge target for                         |
| ------- | ---------------------------------------- |
| `devel` | **All feature/fix/chore PRs** (default)  |
| `main`  | **Releases and RCs only** (from `devel`) |

See [docs/BRANCHING.md](docs/BRANCHING.md).

## Build & test

```bash
bash scripts/verify.sh                      # full gate — run before every push
pre-commit run --all-files                  # minimum: format + lint (uses Node 20+)
bash scripts/with-node.sh npm run compile   # typecheck + extension + webview
bash scripts/with-node.sh npm test          # unit + integration
bash scripts/with-node.sh npm run format    # fix prettier issues locally
bash scripts/with-node.sh npm run lint:fix  # fix eslint issues locally
```

Node **20+** required. Pre-commit hooks call `scripts/with-node.sh` — do not run raw `npx prettier`/`npx eslint` on system Node 12.

## CI gate (mandatory)

**Never merge a PR or push to `devel` / `main` unless all CI checks are green.**

Required PR checks:

| Check      | Job                      |
| ---------- | ------------------------ |
| pre-commit | `pre-commit`             |
| Linux      | `build (ubuntu-latest)`  |
| macOS      | `build (macos-latest)`   |
| Windows    | `build (windows-latest)` |

Workflow:

1. `bash scripts/verify.sh` locally before push
2. Open PR targeting **`devel`** (not `main` for feature work)
3. Wait until **every** check is `success`
4. If pre-commit fails in CI, fix formatting/lint on the branch, push, wait again
5. **Never merge on red** — no admin bypass, no `--no-verify`

## Architecture

| Path                              | Role                                                        |
| --------------------------------- | ----------------------------------------------------------- |
| `src/btcpp/`                      | Parse, serialize, validate, edit (VS Code–agnostic)         |
| `src/sync/DocumentSyncService.ts` | Bridge domain ↔ workspace XML                               |
| `src/preview/`                    | Custom editor, webview host, message routing                |
| `webview/`                        | React Flow UI (no direct `vscode` API — use `vscodeApi.ts`) |
| `src/shared/protocol.ts`          | Host ↔ webview message types                                |

## PR workflow

1. Branch from **`devel`**: `feat/<topic>` or `fix/<topic>`
2. Log changes under `[Unreleased]` in `CHANGELOG.md`
3. Conventional Commits: `feat:`, `fix:`, `chore:`, `test:`, `docs:`
4. `bash scripts/verify.sh` before push
5. Open PR → **`devel`**; **wait for all CI jobs green** before merge
6. Merge; delete branch

## Release workflow

See [docs/RELEASE.md](docs/RELEASE.md). Roadmap: [docs/ROADMAP.md](docs/ROADMAP.md).

- Merge **`devel` → `main`** only for releases / release candidates
- **Ask first:** version bumps, git tags, Marketplace publish
- **Never:** commit secrets, skip hooks, force-push `main` or `devel`, merge without green CI

## Boundaries

**Always:** branch from `devel`; run `verify.sh` or at least `pre-commit run --all-files` before push; update CHANGELOG; wait for CI green before merge.

**Never:** hardcode API keys; modify `node_modules/`; co-sign commits; merge while CI is failing; open feature PRs to `main`.
