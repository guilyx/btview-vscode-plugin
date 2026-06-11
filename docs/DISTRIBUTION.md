# BTView Distribution Guide

## Build a VSIX locally

```bash
npm ci
npm run package
npm run vsix
# Output: btview-0.1.0.vsix
```

## Install VSIX manually

**VS Code / Cursor**: Command Palette → **Extensions: Install from VSIX...** → select the file → reload window.

## Publish to VS Code Marketplace

1. Create a [Marketplace publisher](https://marketplace.visualstudio.com/manage)
2. Update `publisher` in `package.json` (replace `your-publisher`)
3. Create Azure DevOps PAT with **Marketplace → Manage** scope
4. Login: `npx vsce login <publisher-id>`
5. Update `CHANGELOG.md` and bump `version` in `package.json`
6. Publish: `npx vsce publish`

## Publish to Open VSX (Cursor, VSCodium)

1. Create account at [open-vsx.org](https://open-vsx.org)
2. Generate access token
3. `npx ovsx publish -p <OVSX_PAT>`

Cursor uses Open VSX by default — publish here for in-IDE search.

## GitHub Releases

CI uploads a `.vsix` artifact on `release` events. Recommended flow:

1. Move `[Unreleased]` entries to `[X.Y.Z]` in `CHANGELOG.md`
2. Commit and tag: `git tag v0.1.0 && git push origin v0.1.0`
3. Create GitHub Release from the tag
4. Attach CI-built `.vsix` or run `npm run vsix` locally

## Versioning

Follow [Semantic Versioning](https://semver.org/). Update [CHANGELOG.md](../CHANGELOG.md) for every release.

## Cursor compatibility

- Standard VS Code Extension API only
- No Microsoft-proprietary dependencies
- Distribute via **Open VSX** or **VSIX** for Cursor users
- Marketplace publish optional for VS Code users

## Pre-publish checklist

- [ ] `publisher` set in `package.json`
- [ ] `repository` URL correct
- [ ] `CHANGELOG.md` updated
- [ ] `media/icon.png` present
- [ ] `npm test` passes
- [ ] `npm run vsix` succeeds
- [ ] README screenshots in `docs/images/` (optional)
