#!/usr/bin/env bash
# Ensure Node 20+ is active (loads nvm from .nvmrc when needed).
set -euo pipefail

node_meets_minimum() {
  command -v node >/dev/null 2>&1 || return 1
  local major
  major="$(node -p "process.versions.node.split('.')[0]")"
  (( major >= 20 ))
}

# Prefer Node already on PATH (e.g. actions/setup-node in CI, or a local shell).
if node_meets_minimum; then
  exec "$@"
fi

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [[ -s "$NVM_DIR/nvm.sh" ]]; then
  # shellcheck source=/dev/null
  . "$NVM_DIR/nvm.sh"
  if [[ -f .nvmrc ]]; then
    nvm install --silent 2>/dev/null || nvm install
    nvm use --silent 2>/dev/null || nvm use
  else
    nvm install 22 --silent 2>/dev/null || nvm install 22
    nvm use 22 --silent 2>/dev/null || nvm use 22
  fi
fi

if ! node_meets_minimum; then
  echo "error: Node.js 20+ required (found $(node -v 2>/dev/null || echo 'none'))." >&2
  echo "  Run: nvm install && nvm use" >&2
  exit 1
fi

exec "$@"
