# BTView Release Process

## Versioning

| Artifact | Format | Example |
|----------|--------|---------|
| `package.json` | `X.Y.Z` | `0.1.0` |
| Git tag | `vX.Y.Z` | `v0.1.0` |
| CHANGELOG | `## [X.Y.Z]` | `## [0.1.0]` |
| VSIX | `btview-X.Y.Z.vsix` | `btview-0.1.0.vsix` |

SemVer pre-1.0: bump **minor** for features, **patch** for fixes.

## Release steps

1. Ensure `main` CI is green and milestone PRs are merged
2. Release branch `release/vX.Y.Z`:
   - Move `[Unreleased]` → `[X.Y.Z]` in `CHANGELOG.md` (add date)
   - Set `version` in `package.json`
3. Merge release PR to `main`
4. Tag and push: `git tag vX.Y.Z && git push origin vX.Y.Z`
5. Create **GitHub Release** (published) from the tag
6. CI `release` job runs:
   - `scripts/verify-release.sh` — version ↔ tag ↔ CHANGELOG
   - `npm run vsix`
   - Attach VSIX to GitHub Release
   - `vsce publish` to VS Code Marketplace (`PAT_AZURE_MARKETPLACE` secret)
7. Smoke test: `ext install rangonomics.btview` and download VSIX from GitHub Releases

## Local VSIX

```bash
npm ci
npm run package
npm run vsix
```

Install: **Extensions: Install from VSIX...**

## Rollback

Marketplace versions cannot be deleted; publish a patch release with fixes. GitHub Release assets can be replaced manually if needed.
