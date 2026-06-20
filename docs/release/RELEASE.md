# BTView Release Process

## Branching

- **`devel`** — integration; all features land here first
- **`main`** — releases only; tagged versions published to Marketplace

See [Branching](../development/BRANCHING.md).

## Versioning

| Artifact       | Format              | Example             |
| -------------- | ------------------- | ------------------- |
| `package.json` | `X.Y.Z`             | `0.1.0`             |
| Git tag        | `vX.Y.Z`            | `v0.1.0`            |
| CHANGELOG      | `## [X.Y.Z]`        | `## [0.1.0]`        |
| VSIX           | `btview-X.Y.Z.vsix` | `btview-0.1.0.vsix` |

SemVer pre-1.0: bump **minor** for features, **patch** for fixes.

## Release steps

1. Ensure **`devel`** CI is green and milestone work is merged
2. Release branch `release/vX.Y.Z` from `devel` (or PR `devel` → `main` for RC):
   - Move `[Unreleased]` → `[X.Y.Z]` in `CHANGELOG.md` (add date)
   - Set `version` in `package.json`
3. Merge release PR to **`main`** (all CI checks green)
4. Tag on `main`: `git tag vX.Y.Z && git push origin vX.Y.Z`
5. Push tag `vX.Y.Z` — CI `release` job runs automatically (also runs on published GitHub Release)
6. CI `release` job:
   - `scripts/verify-release.sh` — version ↔ tag ↔ CHANGELOG
   - `npm run vsix`
   - Attach VSIX to GitHub Release
   - `vsce publish` → VS Code Marketplace (`PAT_AZURE_MARKETPLACE`)
   - `ovsx publish` → Open VSX Registry (`OVSX_PAT`) for **Cursor**
7. Merge `main` back into `devel` if the release branch diverged (keep `devel` current)
8. Smoke test:
   - VS Code: `ext install rangonomics.btview`
   - Cursor: Extensions → search **BTView** (Open VSX)
   - Manual: download VSIX from GitHub Releases

### Registry secrets

| Secret                  | Registry            | Setup                                                                                                              |
| ----------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `PAT_AZURE_MARKETPLACE` | VS Code Marketplace | [VS Code publishing docs](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)          |
| `OVSX_PAT`              | Open VSX (Cursor)   | [open-vsx.org tokens](https://open-vsx.org/user-settings/tokens); run `npx ovsx create-namespace rangonomics` once |

See [Distribution](DISTRIBUTION.md) for full Cursor / Open VSX setup.

### Publish an existing tag to registries

If a release predates Open VSX CI (e.g. v0.1.0), run **Actions → Publish to registries** with the version number. Skip Marketplace if that version is already live.

## Local VSIX

```bash
npm ci
npm run package
npm run vsix
```

Install: **Extensions: Install from VSIX...**

## Rollback

Marketplace versions cannot be deleted; publish a patch release with fixes. GitHub Release assets can be replaced manually if needed.
