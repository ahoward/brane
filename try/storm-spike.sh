#!/usr/bin/env bash
#
# Whitebox spike: Storm (#61)
#
# Tests brainstorming in MOCK mode.
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

echo "=== Storm Spike ==="
echo ""

# Setup
brane init > /dev/null 2>&1

echo "--- Populating knowledge ---"
brane concept create --name "AuthService" --type Entity > /dev/null 2>&1
brane concept create --name "UserModel" --type Entity > /dev/null 2>&1
brane edge create --from 1 --to 2 --rel "DEPENDS_ON" > /dev/null 2>&1
brane memory remember --observation "Auth uses JWT tokens" --context "review" > /dev/null 2>&1

echo "--- Running storm tests ---"
echo ""

# Test 1: Basic unseeded storm
echo "# Test 1: Basic storm"
RESULT=$(brane storm --json 2>/dev/null || true)
if echo "$RESULT" | bun -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); process.exit(d.status==="success" && d.result?.rounds_completed > 0 ? 0 : 1)' 2>/dev/null; then
  pass "basic storm returns success"
else
  fail "basic storm" "$RESULT"
fi

# Test 2: Storm creates knowledge
echo "# Test 2: Creates knowledge"
if echo "$RESULT" | bun -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); const r=d.result; process.exit(r?.total_concepts > 0 || r?.total_episodes > 0 ? 0 : 1)' 2>/dev/null; then
  pass "storm creates concepts or episodes"
else
  fail "creates knowledge" "$RESULT"
fi

# Test 3: Storm returns suggestions
echo "# Test 3: Suggestions"
if echo "$RESULT" | bun -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); process.exit(Array.isArray(d.result?.suggestions) && d.result.suggestions.length > 0 ? 0 : 1)' 2>/dev/null; then
  pass "storm returns suggestions"
else
  fail "suggestions" "$RESULT"
fi

# Test 4: Seeded storm
echo "# Test 4: Seeded storm"
RESULT4=$(brane storm "security" --json 2>/dev/null || true)
if echo "$RESULT4" | bun -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); process.exit(d.status==="success" ? 0 : 1)' 2>/dev/null; then
  pass "seeded storm works"
else
  fail "seeded storm" "$RESULT4"
fi

# Test 5: Dry run
echo "# Test 5: Dry run"
# Count concepts before
BEFORE=$(brane concept list --json 2>/dev/null | bun -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); console.log(d.result?.items?.length ?? 0)' 2>/dev/null || echo "0")
RESULT5=$(brane storm "testing" --dry-run --json 2>/dev/null || true)
AFTER=$(brane concept list --json 2>/dev/null | bun -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); console.log(d.result?.items?.length ?? 0)' 2>/dev/null || echo "0")
if echo "$RESULT5" | bun -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); process.exit(d.result?.dry_run === true ? 0 : 1)' 2>/dev/null && [ "$BEFORE" = "$AFTER" ]; then
  pass "dry run doesn't write to graph"
else
  fail "dry run" "before=$BEFORE after=$AFTER result=$RESULT5"
fi

# Test 6: Multi-round
echo "# Test 6: Multi-round"
RESULT6=$(brane storm "architecture" --rounds 2 --json 2>/dev/null || true)
if echo "$RESULT6" | bun -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); process.exit(d.result?.rounds_completed === 2 && d.result?.rounds?.length === 2 ? 0 : 1)' 2>/dev/null; then
  pass "multi-round storm completes 2 rounds"
else
  fail "multi-round" "$RESULT6"
fi

# Test 7: Pretty output
echo "# Test 7: Pretty output"
PRETTY=$(brane storm "testing" 2>/dev/null || true)
if [ -n "$PRETTY" ] && echo "$PRETTY" | grep -qi -e "concept" -e "episode" -e "suggestion" -e "round"; then
  pass "pretty output contains expected text"
else
  fail "pretty output" "$PRETTY"
fi

# Test 8: Input file
echo "# Test 8: Input file"
echo "This is a test document about microservices architecture and API design." > "$WORKSPACE/test-input.md"
RESULT8=$(brane storm --input test-input.md --json 2>/dev/null || true)
if echo "$RESULT8" | bun -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); process.exit(d.status==="success" ? 0 : 1)' 2>/dev/null; then
  pass "input file brainstorming works"
else
  fail "input file" "$RESULT8"
fi

# Test 9: Missing input file
echo "# Test 9: Missing input file"
RESULT9=$(brane storm --input nonexistent.md --json 2>/dev/null || true)
if echo "$RESULT9" | bun -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); process.exit(d.status==="error" ? 0 : 1)' 2>/dev/null; then
  pass "missing input file returns error"
else
  fail "missing input" "$RESULT9"
fi

# Test 10: Suggestion kinds
echo "# Test 10: Suggestion kinds"
if echo "$RESULT" | bun -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); const kinds=d.result?.suggestions?.map(s=>s.kind)??[]; process.exit(kinds.includes("question") || kinds.includes("source") || kinds.includes("lens") ? 0 : 1)' 2>/dev/null; then
  pass "suggestions have valid kinds"
else
  fail "suggestion kinds" "$RESULT"
fi

echo ""
echo "=== Results: $PASS/$TOTAL passed, $FAIL failed ==="

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
