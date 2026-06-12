#!/usr/bin/env bash
# Regenerate media/icon.png (128×128) from media/icon.svg for Marketplace / VSIX.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SRC="$ROOT/media/icon.svg"
OUT="$ROOT/media/icon.png"

if ! command -v convert >/dev/null 2>&1; then
  echo "generate-icon: ImageMagick 'convert' required (e.g. apt install imagemagick)" >&2
  exit 1
fi

convert -background none -density 256 "$SRC" -resize 128x128 "$OUT"
echo "generate-icon: wrote $OUT (128×128 from icon.svg)"
