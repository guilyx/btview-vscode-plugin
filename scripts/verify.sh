#!/usr/bin/env bash
# Full local gate — must pass before push/PR/merge (mirrors CI pre-commit + compile + unit tests).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> pre-commit run --all-files"
pre-commit run --all-files

echo "==> npm run check-types"
bash scripts/with-node.sh npm run check-types

echo "==> npm run compile"
bash scripts/with-node.sh npm run compile

echo "==> npm run test:unit:coverage"
bash scripts/with-node.sh npm run test:unit:coverage

echo "==> npm run vsix"
rm -rf coverage
bash scripts/with-node.sh npm run vsix
bash scripts/assert-vsix-webview.sh

echo "verify: OK"
