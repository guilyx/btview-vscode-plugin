#!/usr/bin/env bash
# Publish built VSIX to VS Code Marketplace and Open VSX. Requires env PATs.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

VERSION="$(node -p "require('./package.json').version")"
VSIX="btview-${VERSION}.vsix"

if [[ ! -f "$VSIX" ]]; then
  echo "Building $VSIX..."
  bash scripts/with-node.sh npm run package
  bash scripts/with-node.sh npm run vsix
fi

if [[ -n "${OVSX_PAT:-}" ]]; then
  echo "==> Ensure Open VSX namespace rangonomics"
  npx ovsx create-namespace rangonomics -p "$OVSX_PAT" || true
  echo "==> Publish to Open VSX (Cursor)"
  npx ovsx publish "$VSIX" -p "$OVSX_PAT"
else
  echo "skip Open VSX (OVSX_PAT not set)"
fi

if [[ -n "${PAT_AZURE_MARKETPLACE:-}" ]]; then
  echo "==> Publish to VS Code Marketplace"
  npx vsce publish --pat "$PAT_AZURE_MARKETPLACE"
else
  echo "skip VS Code Marketplace (PAT_AZURE_MARKETPLACE not set)"
fi

echo "publish-registries: OK ($VERSION)"
