#!/usr/bin/env bash
# Recovery script for the recurring Turbopack failure:
#   "Persisting failed: Unable to write SST file"
#   "Cannot find module '.next/dev/server/middleware-manifest.json'"
# Run with: npm run fix-dev

set -e

echo "→ Killing any process on port 3000…"
lsof -i :3000 -t 2>/dev/null | xargs kill 2>/dev/null || true
sleep 1

echo "→ Removing node_modules and .next…"
rm -rf node_modules .next

echo "→ Reinstalling dependencies…"
npm install

echo "→ Reapplying patch-package patches…"
npx patch-package

echo "→ Verifying the write-atomic patch is in place…"
if grep -q "mkdirSync" node_modules/next/dist/lib/fs/write-atomic.js; then
  echo "  ✓ mkdirSync found in write-atomic.js"
else
  echo "  ✗ patch did not apply — check patches/next+16.2.6.patch"
  exit 1
fi

echo ""
echo "Done. Run 'npm run dev' to start the dev server."
