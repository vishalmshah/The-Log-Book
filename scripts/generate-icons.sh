#!/usr/bin/env bash
set -e
PDF="public/logo.pdf"
SVG="public/logo.svg"
FONT="public/fonts/Thwack.ttf"

# PWA + favicon — raster required
sips -s format png --resampleWidth 512 "$PDF" --out src/app/icon.png
sips -s format png --resampleWidth 180 "$PDF" --out src/app/apple-icon.png

# Firefox/legacy browsers probe /favicon.ico directly; without one they fall
# back to a cached default. Modern browsers accept PNG bytes inside .ico.
cp src/app/icon.png src/app/favicon.ico

# In-app logo: SVG is preferred (sharper at any size).
# Export your logo as SVG from your design tool and place it at public/logo.svg.
# Falls back to PNG if SVG is not present.
if [ ! -f "$SVG" ]; then
  sips -s format png --resampleWidth 400 "$PDF" --out public/logo.png
  echo "No $SVG found — generated PNG fallback at public/logo.png."
  echo "For best quality, export your logo as SVG and place it at $SVG."
else
  # Embed the display font into the SVG so the logo renders correctly when
  # loaded as <img src="…">. An externally-referenced font in an SVG can't
  # see the page's next/font-loaded fonts.
  if [ -f "$FONT" ]; then
    python3 - <<PY
import base64, re
with open("$FONT", "rb") as f:
    b64 = base64.b64encode(f.read()).decode()
with open("$SVG", "r") as f:
    svg = f.read()
# Skip if already embedded
if "@font-face" in svg:
    print("$SVG already has @font-face — skipping font embed.")
else:
    rule = (
        "\n      @font-face {\n"
        "        font-family: 'Thwack';\n"
        f"        src: url(data:font/ttf;base64,{b64}) format('truetype');\n"
        "        font-weight: normal;\n"
        "        font-style: normal;\n"
        "      }\n\n"
    )
    out = re.sub(r"(<style>\s*)", r"\1" + rule, svg, count=1)
    with open("$SVG", "w") as f:
        f.write(out)
    print(f"Embedded $FONT into $SVG ({len(b64)} b64 chars).")
PY
  else
    echo "No $FONT found — skipping font embed. SVG text may render with the wrong font."
  fi
  echo "Found $SVG — it will be used as the in-app logo."
fi

echo "Done. Re-run after editing public/logo.pdf or public/logo.svg."
