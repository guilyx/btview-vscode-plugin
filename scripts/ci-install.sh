#!/usr/bin/env bash
# Install deps for CI. npm ci alone can omit Rollup platform binaries on macOS/Windows
# when package-lock.json was generated on Linux (https://github.com/npm/cli/issues/4828).
set -euo pipefail

npm ci
npm install --no-audit --no-fund --prefer-offline
