# Branching model

BTView uses a **two-branch** integration model:

| Branch  | Role                                                                 |
| ------- | -------------------------------------------------------------------- |
| `devel` | Integration — all feature and fix work lands here                    |
| `main`  | Releases only — stable, tagged versions published to the Marketplace |

```text
feat/fix/chore ──PR──► devel ──PR (release / RC)──► main ──tag vX.Y.Z──► Marketplace
```

## Day-to-day development

1. Branch from **`devel`**: `feat/<topic>`, `fix/<topic>`, `chore/<topic>`
2. Open a PR targeting **`devel`**
3. Wait for all CI checks green; merge; delete the feature branch

**Do not** open feature PRs against `main`.

## Releases and release candidates

Only maintainers merge to `main`:

1. Ensure `devel` CI is green and `[Unreleased]` in `CHANGELOG.md` is ready
2. Open `release/vX.Y.Z` from `devel` (or a PR `devel` → `main` for RC)
3. Finalize version + changelog on the release branch / PR
4. Merge to `main` after CI green
5. Tag `vX.Y.Z` on `main` — CI publishes VSIX + Marketplace

See [Release process](../release/RELEASE.md) for the full runbook.

## Development tags (pre-release)

Between Marketplace releases, maintainers may tag **`devel`** for integration checkpoints:

| Tag pattern       | When                                      |
| ----------------- | ----------------------------------------- |
| `vX.Y.0-dev.0`    | Baseline before a minor editor phase      |
| `vX.Y.0-dev.N`    | Phase complete on `devel` (N ≥ 1)         |
| `vX.Y.0-rc.1`     | Release candidate soak test before 1.0    |

Dev tags produce installable VSIX via CI or local `npm run vsix` — **not** published to Marketplace.

**Release tags** (`vX.Y.Z` on `main` only) trigger Marketplace + Open VSX publish.

```text
feat/* ──► devel ──tag v0.8.0-dev.1──► (soak)
                └──release/v1.0.0──► main ──tag v1.0.0──► Marketplace
```

## Branch protection (maintainers)

Configure in GitHub → Settings → Branches:

### `devel`

- Require pull request before merging
- Require status checks: `pre-commit`, `build (ubuntu-latest)`, `build (macos-latest)`, `build (windows-latest)`

### `main`

- Same required checks as `devel`
- Restrict who can push (maintainers only)
- Prefer merging only from `devel` or `release/*` branches
