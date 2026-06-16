# Contributing to BTView

Thank you for contributing. See [AGENTS.md](AGENTS.md) for build/test commands and [docs/development/DEVELOPMENT.md](docs/development/DEVELOPMENT.md) for local setup.

## Branches

| Branch  | Use for                                     |
| ------- | ------------------------------------------- |
| `devel` | **Default integration branch** — merge here |
| `main`  | Releases and release candidates only        |

Full model: [docs/development/BRANCHING.md](docs/development/BRANCHING.md).

## Workflow

1. Fork and branch from **`devel`** (`feat/`, `fix/`, or `chore/`)
2. Update `CHANGELOG.md` under `[Unreleased]`
3. Run `bash scripts/verify.sh` before every push
4. Open a PR targeting **`devel`** with a clear summary and test plan
5. **Wait for all CI checks to pass** before merge (`pre-commit` + all `build` matrix jobs)
6. Never merge on red CI; never use `git commit --no-verify`

**Do not** open feature PRs against `main`. Maintainers merge `devel` → `main` only for releases and release candidates.

### Branch protection (maintainers)

Enable on **`devel`** and **`main`** in GitHub → Settings → Branches:

- Require status checks: `pre-commit`, `build (ubuntu-latest)`, `build (macos-latest)`, `build (windows-latest)`
- Require pull request before merging

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `test:`, `chore:`.

## Releases

Maintainers follow [docs/release/RELEASE.md](docs/release/RELEASE.md). Do not bump version or tag without release review. Releases land on `main` only.
