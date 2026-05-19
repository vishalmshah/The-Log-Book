#!/usr/bin/env bash
set -e
PDF="public/logo.pdf"
SVG="public/logo.svg"

# PWA + favicon — raster required
sips -s format png --resampleWidth 512 "$PDF" --out src/app/icon.png
sips -s format png --resampleWidth 180 "$PDF" --out src/app/apple-icon.png

# In-app logo: SVG is preferred (sharper at any size).
# Export your logo as SVG from your design tool and place it at public/logo.svg.
# Falls back to PNG if SVG is not present.
if [ ! -f "$SVG" ]; then
  sips -s format png --resampleWidth 400 "$PDF" --out public/logo.png
  echo "No $SVG found — generated PNG fallback at public/logo.png."
  echo "For best quality, export your logo as SVG and place it at $SVG."
else
  echo "Found $SVG — it will be used as the in-app logo."
fi

echo "Done. Re-run after editing public/logo.pdf or public/logo.svg."
