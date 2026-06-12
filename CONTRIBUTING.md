# Contributing to BTView

Thank you for contributing. See [AGENTS.md](AGENTS.md) for build/test commands and [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for local setup.

## Workflow

1. Fork and branch from `main` (`feat/`, `fix/`, or `chore/`)
2. Update `CHANGELOG.md` under `[Unreleased]`
3. Run `bash scripts/with-node.sh npm run compile && npm test`
4. Run `pre-commit run --all-files`
5. Open a PR with a clear summary and test plan

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `test:`, `chore:`.

## Releases

Maintainers follow [docs/RELEASE.md](docs/RELEASE.md). Do not bump version or tag without release review.
