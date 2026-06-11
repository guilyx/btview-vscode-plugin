#!/usr/bin/env bash
# Ensure Node 20+ is active (loads nvm from .nvmrc when available).
set -euo pipefail

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [[ -s "$NVM_DIR/nvm.sh" ]]; then
  # shellcheck source=/dev/null
  . "$NVM_DIR/nvm.sh"
  if [[ -f .nvmrc ]]; then
    nvm use --silent 2>/dev/null || nvm use
  else
    nvm use 22 --silent 2>/dev/null || true
  fi
fi

if ! command -v node >/dev/null 2>&1; then
  echo "error: node not found. Install Node.js 20+ or enable nvm." >&2
  exit 1
fi

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if (( NODE_MAJOR < 20 )); then
  echo "error: Node.js 20+ required (found $(node -v))." >&2
  echo "  Run: nvm install && nvm use" >&2
  echo "  Or: export PATH=\"\$HOME/.nvm/versions/node/v22.13.1/bin:\$PATH\"" >&2
  exit 1
fi

exec "$@"
