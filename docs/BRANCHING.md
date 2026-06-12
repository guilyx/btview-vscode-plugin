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

See [RELEASE.md](RELEASE.md) for the full runbook.

## Branch protection (maintainers)

Configure in GitHub → Settings → Branches:

### `devel`

- Require pull request before merging
- Require status checks: `pre-commit`, `build (ubuntu-latest)`, `build (macos-latest)`, `build (windows-latest)`

### `main`

- Same required checks as `devel`
- Restrict who can push (maintainers only)
- Prefer merging only from `devel` or `release/*` branches
