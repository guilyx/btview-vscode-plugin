#!/usr/bin/env bash
# Verify package.json version matches git tag vX.Y.Z and CHANGELOG has a section.
set -euo pipefail

TAG="${1:-}"
if [[ -z "$TAG" ]]; then
  echo "Usage: verify-release.sh vX.Y.Z" >&2
  exit 1
fi

if [[ ! "$TAG" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Tag must be vX.Y.Z, got: $TAG" >&2
  exit 1
fi

VERSION="${TAG#v}"
PKG_VERSION="$(node -p "require('./package.json').version")"

if [[ "$PKG_VERSION" != "$VERSION" ]]; then
  echo "package.json version ($PKG_VERSION) does not match tag ($VERSION)" >&2
  exit 1
fi

if ! grep -q "## \\[$VERSION\\]" CHANGELOG.md; then
  echo "CHANGELOG.md missing section ## [$VERSION]" >&2
  exit 1
fi

echo "Release verification OK: $TAG (package.json $PKG_VERSION)"
