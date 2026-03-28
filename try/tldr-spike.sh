#!/usr/bin/env bash
#
# Whitebox spike: TLDR (#66)
#
# Tests knowledge outline in MOCK mode.
#
set -euo pipefail

BRANE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$BRANE_ROOT"

PASS=0
FAIL=0
TOTAL=0

pass() { PASS=$((PASS + 1)); TOTAL=$((TOTAL + 1)); echo "  ✅ $1"; }
fail() { FAIL=$((FAIL + 1)); TOTAL=$((TOTAL + 1)); echo "  ❌ $1: $2"; }

WORKSPACE=$(mktemp -d)
trap "rm -rf $WORKSPACE" EXIT

brane() { (cd "$WORKSPACE" && BRANE_EMBED_MOCK=1 BRANE_LLM_MOCK=1 bun run "$BRANE_ROOT/src/cli.ts" "$@"); }

echo "=== TLDR Spike ==="
echo ""

# Setup
brane init > /dev/null 2>&1

echo "--- 1. Empty graph ---"
OUT=$(brane tldr --json 2>/dev/null)
STATUS=$(echo "$OUT" | jq -r '.status')
TOPICS=$(echo "$OUT" | jq -r '.result.topics | length')
if [ "$STATUS" = "success" ] && [ "$TOPICS" = "0" ]; then
  pass "empty graph returns success with 0 topics"
else
  fail "empty graph" "status=$STATUS topics=$TOPICS"
fi

echo "--- 2. Populate graph ---"
# Add some concepts
brane concept create --name "AuthService" --type "Entity" > /dev/null 2>&1
brane concept create --name "UserModel" --type "Entity" > /dev/null 2>&1
brane concept create --name "OAuth2" --type "Pattern" > /dev/null 2>&1
brane concept create --name "JWT" --type "Pattern" > /dev/null 2>&1
brane edge create --from "AuthService" --to "UserModel" --rel "DEPENDS_ON" > /dev/null 2>&1
brane edge create --from "AuthService" --to "OAuth2" --rel "IMPLEMENTS" > /dev/null 2>&1

echo "--- 3. TLDR with populated graph (JSON) ---"
OUT=$(brane tldr --json 2>/dev/null)
STATUS=$(echo "$OUT" | jq -r '.status')
TOPICS=$(echo "$OUT" | jq -r '.result.topics | length')
CONCEPTS=$(echo "$OUT" | jq -r '.result.stats.concepts')
EDGES=$(echo "$OUT" | jq -r '.result.stats.edges')
if [ "$STATUS" = "success" ] && [ "$TOPICS" -gt 0 ]; then
  pass "populated graph returns topics"
else
  fail "populated graph" "status=$STATUS topics=$TOPICS"
fi

if [ "$CONCEPTS" -gt 0 ] && [ "$EDGES" -gt 0 ]; then
  pass "stats include concepts=$CONCEPTS edges=$EDGES"
else
  fail "stats" "concepts=$CONCEPTS edges=$EDGES"
fi

echo "--- 4. TLDR with focus ---"
OUT=$(brane tldr --focus "auth" --json 2>/dev/null)
STATUS=$(echo "$OUT" | jq -r '.status')
if [ "$STATUS" = "success" ]; then
  pass "focus mode returns success"
else
  fail "focus mode" "status=$STATUS"
fi

echo "--- 5. TLDR with limit ---"
OUT=$(brane tldr --limit 2 --json 2>/dev/null)
STATUS=$(echo "$OUT" | jq -r '.status')
if [ "$STATUS" = "success" ]; then
  pass "limit mode returns success"
else
  fail "limit mode" "status=$STATUS"
fi

echo "--- 6. TLDR text output ---"
OUT=$(brane tldr 2>/dev/null)
if echo "$OUT" | grep -q "##"; then
  pass "text output has topic headings"
else
  fail "text output" "no ## headings found"
fi

if echo "$OUT" | grep -q "concepts"; then
  pass "text output has stats line"
else
  fail "text output stats" "no stats line found"
fi

echo "--- 7. Topics have items ---"
OUT=$(brane tldr --json 2>/dev/null)
FIRST_ITEMS=$(echo "$OUT" | jq -r '.result.topics[0].items | length')
if [ "$FIRST_ITEMS" -gt 0 ]; then
  pass "first topic has $FIRST_ITEMS items"
else
  fail "topic items" "first topic has 0 items"
fi

echo ""
echo "=== Results: $PASS/$TOTAL passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
