#!/usr/bin/env bash
# Fail if the VSIX does not bundle webview/dist (black screen in Marketplace installs).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

VERSION="$(node -p "require('./package.json').version")"
VSIX="btview-${VERSION}.vsix"

if [[ ! -f "$VSIX" ]]; then
  echo "assert-vsix-webview: missing $VSIX (run npm run vsix first)" >&2
  exit 1
fi

for path in webview/dist/assets/index.js webview/dist/assets/index.css; do
  if ! unzip -l "$VSIX" | grep -q "extension/$path"; then
    echo "assert-vsix-webview: $VSIX missing extension/$path" >&2
    echo "Check .vscodeignore — webview/dist must be included in the package." >&2
    exit 1
  fi
done

echo "assert-vsix-webview: OK ($VSIX contains webview assets)"
