#!/usr/bin/env bash
# Pre-commit hook: prettier --check with Node 20+ (via with-node.sh).
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"
bash scripts/with-node.sh npx prettier --check --ignore-unknown "$@"
