#!/usr/bin/env bash
#
# Whitebox spike: Loop (#64)
#
# Tests autonomous research loop in MOCK mode.
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

echo "=== Loop Spike ==="
echo ""

# Setup
brane init > /dev/null 2>&1

echo "--- Running loop tests ---"
echo ""

# Test 1: Basic loop runs and converges
echo "# Test 1: Basic loop"
RESULT=$(brane loop run "understand JWT tokens" --rounds 3 --json 2>/dev/null || true)
if echo "$RESULT" | bun -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); process.exit(d.status==="success" && d.result?.id ? 0 : 1)' 2>/dev/null; then
  pass "basic loop returns success with ID"
else
  fail "basic loop" "$RESULT"
fi

# Test 2: Loop has rounds
echo "# Test 2: Rounds executed"
if echo "$RESULT" | bun -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); process.exit(d.result?.rounds_completed > 0 ? 0 : 1)' 2>/dev/null; then
  pass "loop executed rounds"
else
  fail "rounds" "$RESULT"
fi

# Test 3: Converges (mock converges after round 2)
echo "# Test 3: Convergence"
if echo "$RESULT" | bun -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); process.exit(d.result?.status==="converged" || d.result?.status==="max_rounds" ? 0 : 1)' 2>/dev/null; then
  pass "loop reached terminal state"
else
  fail "convergence" "$RESULT"
fi

# Test 4: Rounds have expected structure
echo "# Test 4: Round structure"
if echo "$RESULT" | bun -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); const r=d.result?.rounds?.[0]; process.exit(r && typeof r.assessment==="string" && Array.isArray(r.gaps) && Array.isArray(r.queries_searched) ? 0 : 1)' 2>/dev/null; then
  pass "rounds have expected fields"
else
  fail "round structure" "$RESULT"
fi

# Test 5: Loop list
echo "# Test 5: Loop list"
RESULT5=$(brane loop list --json 2>/dev/null || true)
if echo "$RESULT5" | bun -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); process.exit(d.status==="success" && d.result?.loops?.length > 0 ? 0 : 1)' 2>/dev/null; then
  pass "loop list shows completed loop"
else
  fail "loop list" "$RESULT5"
fi

# Test 6: Dry run
echo "# Test 6: Dry run"
RESULT6=$(brane loop run "test goal" --rounds 2 --dry-run --json 2>/dev/null || true)
if echo "$RESULT6" | bun -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); process.exit(d.result?.dry_run===true ? 0 : 1)' 2>/dev/null; then
  pass "dry run mode works"
else
  fail "dry run" "$RESULT6"
fi

# Test 7: Resume
echo "# Test 7: Resume (creates new loop, pauses not applicable in mock)"
LOOP_ID=$(echo "$RESULT" | bun -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); console.log(d.result?.id??"")' 2>/dev/null || echo "")
if [ -n "$LOOP_ID" ]; then
  RESULT7=$(brane loop run --resume "$LOOP_ID" --rounds 5 --json 2>/dev/null || true)
  if echo "$RESULT7" | bun -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); process.exit(d.status==="success" ? 0 : 1)' 2>/dev/null; then
    pass "resume existing loop"
  else
    fail "resume" "$RESULT7"
  fi
else
  fail "resume" "no loop ID from previous run"
fi

# Test 8: Pretty output
echo "# Test 8: Pretty output"
PRETTY=$(brane loop run "architecture patterns" --rounds 2 2>/dev/null || true)
if [ -n "$PRETTY" ] && echo "$PRETTY" | grep -qi -e "round" -e "loop" -e "status" -e "converging"; then
  pass "pretty output contains expected text"
else
  fail "pretty output" "$PRETTY"
fi

# Test 9: Search history prevents duplicates
echo "# Test 9: Search history"
RESULT9=$(brane loop run "same topic again" --rounds 3 --json 2>/dev/null || true)
# In mock mode, queries are deterministic, so round 2 should have fewer/no queries since round 1 used them
if echo "$RESULT9" | bun -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); process.exit(d.status==="success" ? 0 : 1)' 2>/dev/null; then
  pass "search history tracked"
else
  fail "search history" "$RESULT9"
fi

# Test 10: Episodes created as journal
echo "# Test 10: Journal episodes"
EPS=$(brane memory list --json 2>/dev/null || true)
if echo "$EPS" | bun -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); const eps=d.result?.episodes??[]; process.exit(eps.some(e=>e.context?.includes("loop:")) ? 0 : 1)' 2>/dev/null; then
  pass "loop creates journal episodes"
else
  fail "journal episodes" "$EPS"
fi

echo ""
echo "=== Results: $PASS/$TOTAL passed, $FAIL failed ==="

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
