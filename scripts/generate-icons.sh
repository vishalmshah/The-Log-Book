#!/usr/bin/env bash
set -e
PDF="public/logo.pdf"
SVG="public/logo.svg"

# PWA + favicon — always raster (PNG required)
sips -s format png --resampleWidth 512 "$PDF" --out src/app/icon.png
sips -s format png --resampleWidth 180 "$PDF" --out src/app/apple-icon.png

# In-app logo: use SVG if you've exported it from your design tool,
# otherwise fall back to a high-res PNG.
if [ -f "$SVG" ]; then
  echo "Found $SVG — SVG will be used in the app header."
else
  sips -s format png --resampleWidth 400 "$PDF" --out public/logo.png
  echo "No $SVG found — using PNG fallback. Export your logo as SVG from your design tool and place it at $SVG for sharper rendering."
fi

echo "Done. Re-run after editing public/logo.pdf or public/logo.svg."
