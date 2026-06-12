# BTView Distribution Guide

BTView is distributed on **three channels**:

| Channel                                                                                       | IDE                                | Install                                     |
| --------------------------------------------------------------------------------------------- | ---------------------------------- | ------------------------------------------- |
| [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=rangonomics.btview) | VS Code                            | Extensions → search **BTView**              |
| [Open VSX Registry](https://open-vsx.org/extension/rangonomics/btview)                        | **Cursor**, VSCodium, Gitpod, etc. | Extensions → search **BTView**              |
| [GitHub Releases](https://github.com/guilyx/btview-vscode-plugin/releases)                    | Any (manual)                       | Download `.vsix` → **Install from VSIX...** |

Publisher: **rangonomics** · Extension ID: `rangonomics.btview`

See [RELEASE.md](RELEASE.md) for the maintainer release runbook.

---

## Install in VS Code

Extensions view → search **BTView** → Install.

Or Command Palette:

```text
ext install rangonomics.btview
```

## Install in Cursor

Since mid-2025, Cursor uses the **[Open VSX Registry](https://open-vsx.org)** — not the Microsoft VS Code Marketplace.

### Option A — Open VSX (recommended)

Once published, search in Cursor:

1. Open **Extensions** (`Ctrl+Shift+X`)
2. Search **BTView** or `rangonomics.btview`
3. Click **Install**

Direct link: https://open-vsx.org/extension/rangonomics/btview

### Option B — VSIX from GitHub Releases (works today)

1. Download `btview-X.Y.Z.vsix` from [GitHub Releases](https://github.com/guilyx/btview-vscode-plugin/releases)
2. Command Palette → **Extensions: Install from VSIX...**
3. Select the downloaded file → reload window

No account or registry setup required.

---

## Build a VSIX locally

```bash
npm ci
npm run package
npm run vsix
# Output: btview-0.1.0.vsix
```

Install: Command Palette → **Extensions: Install from VSIX...**

---

## Publishing (maintainers)

Releases publish to **all three channels** automatically when a `vX.Y.Z` tag is pushed to `main`.

| Registry            | CLI            | Secret                  |
| ------------------- | -------------- | ----------------------- |
| VS Code Marketplace | `vsce publish` | `PAT_AZURE_MARKETPLACE` |
| Open VSX (Cursor)   | `ovsx publish` | `OVSX_PAT`              |

> **Important:** `vsce publish` uploads to Microsoft's Marketplace only. Cursor requires **`ovsx publish`** to Open VSX — a separate registry and token.

### One-time Open VSX setup

1. Sign in at [open-vsx.org](https://open-vsx.org) (GitHub OAuth)
2. Create a personal access token: [User Settings → Access Tokens](https://open-vsx.org/user-settings/tokens)
3. Create the publisher namespace (once per publisher):

   ```bash
   npx ovsx create-namespace rangonomics -p "$OVSX_PAT"
   ```

4. Add the token as GitHub repo secret **`OVSX_PAT`**

Requirements: `license` field in `package.json` (we use `Apache-2.0`).

### One-time VS Code Marketplace setup

1. Create publisher at [marketplace.visualstudio.com/manage](https://marketplace.visualstudio.com/manage)
2. Azure DevOps PAT with **Marketplace → Manage** scope
3. Add as GitHub secret **`PAT_AZURE_MARKETPLACE`**

### Automated publish (CI)

On tag `vX.Y.Z`, the `release` job:

1. Verifies version ↔ tag ↔ CHANGELOG
2. Builds VSIX and attaches to GitHub Release
3. `vsce publish` → VS Code Marketplace
4. `ovsx publish` → Open VSX (Cursor)

### Manual publish (one-off)

After `npm run vsix`:

```bash
# VS Code Marketplace
npx vsce publish --pat "$PAT_AZURE_MARKETPLACE"

# Open VSX (Cursor)
npx ovsx publish btview-0.1.0.vsix -p "$OVSX_PAT"
```

To publish **0.1.0** to Cursor before the next tagged release, download or build the VSIX and run the `ovsx publish` command above.

### Pre-publish checklist

- [x] `publisher` = `rangonomics` in `package.json`
- [x] `license` set (`Apache-2.0`)
- [x] `media/icon.png` present (128×128)
- [ ] `CHANGELOG.md` section for release version
- [ ] `bash scripts/verify.sh` passes
- [ ] `OVSX_PAT` and `PAT_AZURE_MARKETPLACE` secrets configured
- [ ] Open VSX namespace `rangonomics` created
