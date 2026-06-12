## Summary

<!-- 2–3 bullets -->

## Test plan

- [ ] `bash scripts/verify.sh` (or at minimum `pre-commit run --all-files`)
- [ ] CHANGELOG `[Unreleased]` updated

## CI (required before merge)

- [ ] All PR checks green: `pre-commit`, `build (ubuntu-latest)`, `build (macos-latest)`, `build (windows-latest)`
- [ ] **Do not merge** until every check shows success

## Phase

<!-- e.g. Phase 0 distribution, Phase 1 protocol -->
