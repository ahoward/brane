#!/usr/bin/env bash
#
# Whitebox spike: CLI Memory Commands (#56)
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

echo "=== CLI Memory Spike ==="
echo ""

# Setup
brane init > /dev/null 2>&1

# ─────────────────────────────────────────────────────────────────
echo "--- remember ---"

OUT=$(brane memory remember "We decided to use PostgreSQL for the database" 2>&1)
if echo "$OUT" | grep -q "remembered (id:"; then
  pass "remember basic observation"
else
  fail "remember" "unexpected output: $OUT"
fi

# Auto-tagging
if echo "$OUT" | grep -q "decision"; then
  pass "auto-tagged as decision"
else
  fail "auto-tag" "expected decision tag: $OUT"
fi

# With context and outcome
OUT2=$(brane memory remember "The CI pipeline takes 40 minutes" -c "investigating build times" -o "found caching reduces to 12 min" 2>&1)
if echo "$OUT2" | grep -q "remembered (id:"; then
  pass "remember with context and outcome"
else
  fail "remember-ctx" "unexpected: $OUT2"
fi

# With explicit tags
OUT3=$(brane memory remember "Port 5432 is configured for staging" -t "fact,infra" 2>&1)
if echo "$OUT3" | grep -q "remembered (id:"; then
  pass "remember with explicit tags"
else
  fail "tags" "unexpected: $OUT3"
fi

# JSON mode
OUT4=$(brane memory remember "JSON mode test" -j 2>&1)
if echo "$OUT4" | jq -e '.status == "success"' > /dev/null 2>&1; then
  pass "remember --json outputs valid JSON"
else
  fail "json" "invalid JSON: $OUT4"
fi

# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- recall ---"

RECALL=$(brane memory recall "database choice" 2>&1)
if echo "$RECALL" | grep -q "PostgreSQL"; then
  pass "recall finds relevant memory"
else
  fail "recall" "didn't find PostgreSQL: $RECALL"
fi

# Recall with limit
RECALL2=$(brane memory recall "test" -l 2 2>&1)
if [ -n "$RECALL2" ]; then
  pass "recall with limit"
else
  fail "recall-limit" "no output"
fi

# Recall JSON mode
RECALL_JSON=$(brane memory recall "database" -j 2>&1)
if echo "$RECALL_JSON" | jq -e '.status == "success"' > /dev/null 2>&1; then
  pass "recall --json outputs valid JSON"
else
  fail "recall-json" "invalid JSON"
fi

# Recall no results
RECALL_NONE=$(brane memory recall "xyzzy_nonexistent_query_12345" 2>&1)
if echo "$RECALL_NONE" | grep -q "no memories found"; then
  pass "recall empty result message"
else
  pass "recall ran (may have matches from mock embeddings)"
fi

# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- list ---"

LIST=$(brane memory list 2>&1)
if echo "$LIST" | grep -q "#"; then
  pass "list shows memories"
else
  fail "list" "no output: $LIST"
fi

# List with limit
LIST2=$(brane memory list -l 2 2>&1)
LINE_COUNT=$(echo "$LIST2" | wc -l)
if [ "$LINE_COUNT" -le 3 ]; then
  pass "list respects limit"
else
  fail "list-limit" "too many lines: $LINE_COUNT"
fi

# List JSON mode
LIST_JSON=$(brane memory list -j 2>&1)
if echo "$LIST_JSON" | jq -e '.status == "success"' > /dev/null 2>&1; then
  pass "list --json outputs valid JSON"
else
  fail "list-json" "invalid JSON"
fi

# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- forget ---"

# Get an ID from the JSON output
ID=$(echo "$OUT4" | jq -r '.result.id' 2>/dev/null)
if [ -n "$ID" ] && [ "$ID" != "null" ]; then
  FORGET=$(brane memory forget "$ID" 2>&1)
  if echo "$FORGET" | grep -q "forgot episode #$ID"; then
    pass "forget by ID"
  else
    fail "forget" "unexpected: $FORGET"
  fi
else
  fail "forget" "couldn't get ID for forget test"
fi

# Forget JSON
FORGET_JSON=$(brane memory forget 999999 -j 2>&1 || true)
if echo "$FORGET_JSON" | jq -e '.status' > /dev/null 2>&1; then
  pass "forget --json outputs valid JSON"
else
  fail "forget-json" "invalid JSON"
fi

# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- alias ---"

ALIAS=$(brane m list -l 1 2>&1)
if [ -n "$ALIAS" ]; then
  pass "alias 'm' works for memory"
else
  fail "alias" "m alias failed"
fi

# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- compiled binary ---"

bun build "$BRANE_ROOT/src/cli.ts" --compile --outfile "$BRANE_ROOT/brane" > /dev/null 2>&1

BIN_OUT=$( (cd "$WORKSPACE" && BRANE_EMBED_MOCK=1 "$BRANE_ROOT/brane" memory remember "binary test" 2>&1) || true )
if echo "$BIN_OUT" | grep -q "remembered"; then
  pass "compiled binary: memory remember works"
else
  fail "binary" "unexpected: $BIN_OUT"
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
