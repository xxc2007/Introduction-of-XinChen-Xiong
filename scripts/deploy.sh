#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Commit only the reviewed release before invoking this entry point.
[ -z "$(git status --porcelain)" ] || { echo "Commit the reviewed release before publishing"; exit 1; }
node scripts/prepare-release.mjs --check
node --test "tests/*.test.mjs"
node scripts/check-vendor.mjs
node scripts/check-parity.mjs
node scripts/check-links.mjs
node scripts/check-bytes.mjs
# Normal Git transport is mandatory; non-fast-forward and network failures stop release.
git push origin HEAD:main
node tools/deploy-release.mjs intro
bash scripts/verify-sync.sh
