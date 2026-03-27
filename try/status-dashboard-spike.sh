#!/usr/bin/env bash
#
# Whitebox spike: Status Dashboard (#58)
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

brane() { (cd "$WORKSPACE" && BRANE_EMBED_MOCK=1 bun run "$BRANE_ROOT/src/cli.ts" "$@"); }

echo "=== Status Dashboard Spike ==="
echo ""

# Setup
brane init > /dev/null 2>&1

# ─────────────────────────────────────────────────────────────────
echo "--- empty graph ---"

OUT=$(brane status 2>&1)
if echo "$OUT" | grep -q "brane"; then
  pass "shows brane version"
else
  fail "version" "no version: $OUT"
fi

if echo "$OUT" | grep -q "Lens:"; then
  pass "shows active lens"
else
  fail "lens" "no lens info"
fi

if echo "$OUT" | grep -q "Schema:"; then
  pass "shows schema version"
else
  fail "schema" "no schema"
fi

if echo "$OUT" | grep -q "Body DB:"; then
  pass "shows body DB size"
else
  fail "body" "no body DB size"
fi

if echo "$OUT" | grep -q "Mind DB:"; then
  pass "shows mind DB size"
else
  fail "mind" "no mind DB size"
fi

if echo "$OUT" | grep -q "Concepts:"; then
  pass "shows concept count"
else
  fail "concepts" "no concept count"
fi

if echo "$OUT" | grep -q "Edges:"; then
  pass "shows edge count"
else
  fail "edges" "no edge count"
fi

# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- with data ---"

# Add some concepts and an episode
echo '{"name": "AuthService", "type": "Entity"}' | brane /mind/concepts/create > /dev/null 2>&1
echo '{"name": "UserDB", "type": "Entity"}' | brane /mind/concepts/create > /dev/null 2>&1
echo '{"source": 1, "target": 2, "relation": "DEPENDS_ON"}' | brane /mind/edges/create > /dev/null 2>&1
brane memory remember "Auth uses JWT tokens" > /dev/null 2>&1

OUT2=$(brane status 2>&1)
if echo "$OUT2" | grep -q "Concepts: 2"; then
  pass "shows 2 concepts"
else
  fail "concepts" "expected 2 concepts: $OUT2"
fi

if echo "$OUT2" | grep -q "Edges:    1"; then
  pass "shows 1 edge"
else
  fail "edges" "expected 1 edge"
fi

if echo "$OUT2" | grep -q "Entity: 2"; then
  pass "shows concept type breakdown"
else
  fail "types" "no type breakdown"
fi

if echo "$OUT2" | grep -q "DEPENDS_ON: 1"; then
  pass "shows edge relation breakdown"
else
  fail "rels" "no relation breakdown"
fi

if echo "$OUT2" | grep -q "Recent memories"; then
  pass "shows recent memories"
else
  fail "recent" "no recent memories section"
fi

if echo "$OUT2" | grep -q "JWT"; then
  pass "shows memory content"
else
  fail "content" "memory content not shown"
fi

# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- json mode ---"

JSON_OUT=$(brane status -j 2>&1)
if echo "$JSON_OUT" | jq -e '.status == "success"' > /dev/null 2>&1; then
  pass "JSON mode: valid result"
else
  fail "json" "invalid JSON"
fi

TC=$(echo "$JSON_OUT" | jq '.result.total_concepts' 2>/dev/null)
if [ "$TC" = "2" ]; then
  pass "JSON: total_concepts = 2"
else
  fail "json-concepts" "expected 2, got $TC"
fi

LENS=$(echo "$JSON_OUT" | jq -r '.result.lens' 2>/dev/null)
if [ "$LENS" = "default" ]; then
  pass "JSON: lens = default"
else
  fail "json-lens" "expected default, got $LENS"
fi

# ─────────────────────────────────────────────────────────────────
echo ""
echo "=== Results ==="
echo ""
echo "  $PASS passed, $FAIL failed, $TOTAL total"
echo ""
if [ "$FAIL" -eq 0 ]; then
  echo "  all tests passed!"
else
  echo "  FAILURES DETECTED"
  exit 1
fi
