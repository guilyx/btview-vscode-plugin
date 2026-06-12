## Summary

<!-- 2–3 bullets -->

## Base branch

- [ ] PR targets **`devel`** (features/fixes) or **`main`** (release / RC only)

## Test plan

- [ ] `bash scripts/verify.sh` (or at minimum `pre-commit run --all-files`)
- [ ] CHANGELOG `[Unreleased]` updated

## CI (required before merge)

- [ ] All PR checks green: `pre-commit`, `build (ubuntu-latest)`, `build (macos-latest)`, `build (windows-latest)`
- [ ] **Do not merge** until every check shows success

## Phase

<!-- e.g. 0.2.0 integration, 1.0.0 stable -->
