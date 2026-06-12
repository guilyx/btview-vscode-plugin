# BTView Distribution Guide

**Primary channel:** [VS Code Marketplace](https://marketplace.visualstudio.com/) — publisher **rangonomics** (`rangonomics.btview`).

**Companion:** [GitHub Releases](https://github.com/guilyx/btview-vscode-plugin/releases) with VSIX download.

See also: [RELEASE.md](RELEASE.md) for the full release runbook.

## Install from Marketplace

**VS Code:** Extensions view → search **BTView** → Install.

Or: `ext install rangonomics.btview`

## Build a VSIX locally

```bash
npm ci
npm run package
npm run vsix
# Output: btview-0.1.0.vsix
```

## Install VSIX manually

Command Palette → **Extensions: Install from VSIX...** → select the file → reload window.

Useful for Cursor or offline installs.

## Automated publish (maintainers)

On GitHub Release (tag `vX.Y.Z`), CI:

1. Verifies `package.json` version ↔ tag ↔ CHANGELOG
2. Builds VSIX and attaches to the GitHub Release
3. Runs `vsce publish` using `PAT_AZURE_MARKETPLACE` (repo secret)

Local publish (one-off):

```bash
npx vsce login rangonomics
npx vsce publish
```

## Open VSX (optional)

Not required for v0.1.0. Cursor users can install from VSIX or Marketplace if configured.

## Pre-publish checklist

- [x] `publisher` = `rangonomics` in `package.json`
- [ ] `CHANGELOG.md` section for release version
- [x] `media/icon.png` present (128×128)
- [ ] `npm test` passes
- [ ] `npm run vsix` succeeds
