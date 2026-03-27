#!/usr/bin/env bash
#
# Whitebox spike: Enhance (#62)
#
# Tests convergent refinement in MOCK mode.
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

echo "=== Enhance Spike ==="
echo ""

# Setup
brane init > /dev/null 2>&1

echo "--- Populating knowledge ---"
brane concept create --name "AuthService" --type Entity > /dev/null 2>&1
brane concept create --name "UserModel" --type Entity > /dev/null 2>&1
brane concept create --name "LoginEndpoint" --type Entity > /dev/null 2>&1
brane concept create --name "AuthenticationService" --type Entity > /dev/null 2>&1
brane edge create --from 1 --to 2 --rel "DEPENDS_ON" > /dev/null 2>&1
brane memory remember --observation "Auth uses JWT" --context "review" > /dev/null 2>&1

echo "--- Running enhance tests ---"
echo ""

# Test 1: Basic enhance
echo "# Test 1: Basic enhance"
RESULT=$(brane enhance --json 2>/dev/null || true)
if echo "$RESULT" | bun -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); process.exit(d.status==="success" && d.result?.rounds_completed > 0 ? 0 : 1)' 2>/dev/null; then
  pass "basic enhance returns success"
else
  fail "basic enhance" "$RESULT"
fi

# Test 2: Creates edges
echo "# Test 2: Creates edges"
if echo "$RESULT" | bun -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); process.exit(d.result?.total_edges > 0 ? 0 : 1)' 2>/dev/null; then
  pass "enhance creates edges"
else
  fail "creates edges" "$RESULT"
fi

# Test 3: Adds observations
echo "# Test 3: Observations"
if echo "$RESULT" | bun -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); process.exit(d.result?.total_observations > 0 ? 0 : 1)' 2>/dev/null; then
  pass "enhance adds observations"
else
  fail "observations" "$RESULT"
fi

# Test 4: Focused enhance
echo "# Test 4: Focused enhance"
RESULT4=$(brane enhance "authentication" --json 2>/dev/null || true)
if echo "$RESULT4" | bun -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); process.exit(d.status==="success" ? 0 : 1)' 2>/dev/null; then
  pass "focused enhance works"
else
  fail "focused enhance" "$RESULT4"
fi

# Test 5: Dry run doesn't modify graph
echo "# Test 5: Dry run"
EDGES_BEFORE=$(brane edge list --json 2>/dev/null | bun -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); console.log(d.result?.items?.length ?? 0)' 2>/dev/null || echo "0")
RESULT5=$(brane enhance --dry-run --json 2>/dev/null || true)
EDGES_AFTER=$(brane edge list --json 2>/dev/null | bun -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); console.log(d.result?.items?.length ?? 0)' 2>/dev/null || echo "0")
if echo "$RESULT5" | bun -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); process.exit(d.result?.dry_run === true ? 0 : 1)' 2>/dev/null && [ "$EDGES_BEFORE" = "$EDGES_AFTER" ]; then
  pass "dry run doesn't modify graph"
else
  fail "dry run" "edges before=$EDGES_BEFORE after=$EDGES_AFTER"
fi

# Test 6: Multi-round
echo "# Test 6: Multi-round"
RESULT6=$(brane enhance --rounds 2 --json 2>/dev/null || true)
if echo "$RESULT6" | bun -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); process.exit(d.result?.rounds_completed === 2 ? 0 : 1)' 2>/dev/null; then
  pass "multi-round enhance works"
else
  fail "multi-round" "$RESULT6"
fi

# Test 7: Pretty output
echo "# Test 7: Pretty output"
PRETTY=$(brane enhance 2>/dev/null || true)
if [ -n "$PRETTY" ] && echo "$PRETTY" | grep -qi -e "merge" -e "edge" -e "observation" -e "round" -e "refine"; then
  pass "pretty output contains expected text"
else
  fail "pretty output" "$PRETTY"
fi

# Test 8: Empty graph
echo "# Test 8: Empty graph"
WORKSPACE2=$(mktemp -d)
RESULT8=$( (cd "$WORKSPACE2" && BRANE_EMBED_MOCK=1 BRANE_LLM_MOCK=1 bun run "$BRANE_ROOT/src/cli.ts" init > /dev/null 2>&1 && BRANE_EMBED_MOCK=1 BRANE_LLM_MOCK=1 bun run "$BRANE_ROOT/src/cli.ts" enhance --json 2>/dev/null) || true)
rm -rf "$WORKSPACE2"
if echo "$RESULT8" | bun -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); process.exit(d.status==="success" && d.result?.rounds_completed === 0 ? 0 : 1)' 2>/dev/null; then
  pass "empty graph returns 0 rounds"
else
  fail "empty graph" "$RESULT8"
fi

echo ""
echo "=== Results: $PASS/$TOTAL passed, $FAIL failed ==="

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
