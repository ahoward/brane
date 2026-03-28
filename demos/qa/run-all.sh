#!/usr/bin/env bash
#
# run-all.sh — Run all QA demos
#
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
PASS=0
FAIL=0

for demo in "$DIR"/[0-9]*.sh; do
  name=$(basename "$demo" .sh)
  echo ""
  echo "━━━ $name ━━━"
  if bash "$demo"; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
  fi
done

echo ""
echo "═══════════════════════════════"
echo "  QA Suite: $PASS passed, $FAIL failed ($(( PASS + FAIL )) total)"
echo "═══════════════════════════════"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
