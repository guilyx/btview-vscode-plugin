#!/usr/bin/env bash
# Install deps for CI. npm ci alone can omit Rollup platform binaries on macOS/Windows
# when package-lock.json was generated on Linux (https://github.com/npm/cli/issues/4828).
set -euo pipefail

npm ci

rollup_native_pkg() {
  local version
  version="$(node -p "require('rollup/package.json').version")"
  case "$(uname -s)" in
    Darwin)
      if [[ "$(uname -m)" == "arm64" ]]; then
        echo "@rollup/rollup-darwin-arm64@${version}"
      else
        echo "@rollup/rollup-darwin-x64@${version}"
      fi
      ;;
    Linux)
      if [[ "$(uname -m)" == "aarch64" || "$(uname -m)" == "arm64" ]]; then
        echo "@rollup/rollup-linux-arm64-gnu@${version}"
      else
        echo "@rollup/rollup-linux-x64-gnu@${version}"
      fi
      ;;
    MINGW* | MSYS* | CYGWIN* | Windows_NT)
      if [[ "$(uname -m)" == "aarch64" || "$(uname -m)" == "arm64" ]]; then
        echo "@rollup/rollup-win32-arm64-msvc@${version}"
      else
        echo "@rollup/rollup-win32-x64-msvc@${version}"
      fi
      ;;
    *)
      return 1
      ;;
  esac
}

if pkg="$(rollup_native_pkg)"; then
  npm install --no-save --no-audit --no-fund "${pkg}"
fi
