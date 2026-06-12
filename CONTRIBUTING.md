# Contributing to BTView

Thank you for contributing. See [AGENTS.md](AGENTS.md) for build/test commands and [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for local setup.

## Workflow

1. Fork and branch from `main` (`feat/`, `fix/`, or `chore/`)
2. Update `CHANGELOG.md` under `[Unreleased]`
3. Run `bash scripts/verify.sh` before every push
4. Open a PR with a clear summary and test plan
5. **Wait for all CI checks to pass** before merge (`pre-commit` + all `build` matrix jobs)
6. Never merge on red CI; never use `git commit --no-verify`

### Branch protection (maintainers)

Enable on `main` in GitHub → Settings → Branches:

- Require status checks: `pre-commit`, `build (ubuntu-latest)`, `build (macos-latest)`, `build (windows-latest)`
- Require pull request before merging

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `test:`, `chore:`.

## Releases

Maintainers follow [docs/RELEASE.md](docs/RELEASE.md). Do not bump version or tag without release review.
