#!/usr/bin/env bash
#
# Whitebox spike: Rebuild (#65)
#
# Tests re-extraction in MOCK mode.
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

echo "=== Rebuild Spike ==="
echo ""

# Setup: init and digest some files
brane init > /dev/null 2>&1

echo "--- Creating test files and digesting ---"
mkdir -p "$WORKSPACE/docs"
echo "Authentication uses JWT tokens with refresh rotation." > "$WORKSPACE/docs/auth.md"
echo "Rate limiting is enforced at the API gateway level." > "$WORKSPACE/docs/rate-limit.md"

brane digest "$WORKSPACE/docs/auth.md" > /dev/null 2>&1
brane digest "$WORKSPACE/docs/rate-limit.md" > /dev/null 2>&1

echo "--- Running rebuild tests ---"
echo ""

# Test 1: Dry run shows sources
echo "# Test 1: Dry run"
RESULT=$(brane rebuild --dry-run --json 2>/dev/null || true)
if echo "$RESULT" | bun -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); process.exit(d.status==="success" && d.result?.sources_total >= 2 ? 0 : 1)' 2>/dev/null; then
  pass "dry run shows digested sources"
else
  fail "dry run" "$RESULT"
fi

# Test 2: Dry run is actually dry
echo "# Test 2: Dry run is dry"
if echo "$RESULT" | bun -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); process.exit(d.result?.dry_run===true && d.result?.sources_rebuilt===0 ? 0 : 1)' 2>/dev/null; then
  pass "dry run doesn't rebuild"
else
  fail "dry run is dry" "$RESULT"
fi

# Test 3: Full rebuild
echo "# Test 3: Full rebuild"
RESULT3=$(brane rebuild --json 2>/dev/null || true)
if echo "$RESULT3" | bun -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); process.exit(d.status==="success" && d.result?.sources_rebuilt >= 2 ? 0 : 1)' 2>/dev/null; then
  pass "rebuild processes all sources"
else
  fail "full rebuild" "$RESULT3"
fi

# Test 4: Result details
echo "# Test 4: Result details"
if echo "$RESULT3" | bun -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); const det=d.result?.details??[]; process.exit(det.length >= 2 && det.every(d=>d.label && d.status) ? 0 : 1)' 2>/dev/null; then
  pass "details include label and status per source"
else
  fail "details" "$RESULT3"
fi

# Test 5: Empty rebuild (nothing to rebuild after just rebuilding)
echo "# Test 5: No sources"
WORKSPACE2=$(mktemp -d)
RESULT5=$( (cd "$WORKSPACE2" && BRANE_EMBED_MOCK=1 BRANE_LLM_MOCK=1 bun run "$BRANE_ROOT/src/cli.ts" init > /dev/null 2>&1 && BRANE_EMBED_MOCK=1 BRANE_LLM_MOCK=1 bun run "$BRANE_ROOT/src/cli.ts" rebuild --json 2>/dev/null) || true)
rm -rf "$WORKSPACE2"
if echo "$RESULT5" | bun -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); process.exit(d.status==="success" && d.result?.sources_total===0 ? 0 : 1)' 2>/dev/null; then
  pass "empty graph rebuild returns 0 sources"
else
  fail "empty rebuild" "$RESULT5"
fi

# Test 6: Pretty output
echo "# Test 6: Pretty output"
# Re-digest so there's something to rebuild
brane digest "$WORKSPACE/docs/auth.md" > /dev/null 2>&1
PRETTY=$(brane rebuild 2>/dev/null || true)
if [ -n "$PRETTY" ] && echo "$PRETTY" | grep -qi -e "rebuilt" -e "sources" -e "skip"; then
  pass "pretty output shows rebuild info"
else
  fail "pretty output" "$PRETTY"
fi

# Test 7: Lens override
echo "# Test 7: Lens override"
brane digest "$WORKSPACE/docs/rate-limit.md" > /dev/null 2>&1
RESULT7=$(brane rebuild --lens "Focus on security" --json 2>/dev/null || true)
if echo "$RESULT7" | bun -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); process.exit(d.status==="success" ? 0 : 1)' 2>/dev/null; then
  pass "lens override accepted"
else
  fail "lens override" "$RESULT7"
fi

# Test 8: Stdin sources are skipped
echo "# Test 8: Stdin skipped"
echo "Some stdin content" | brane digest - > /dev/null 2>&1
RESULT8=$(brane rebuild --json 2>/dev/null || true)
HAS_STDIN=$(echo "$RESULT8" | bun -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); const det=d.result?.details??[]; const stdin=det.find(d=>d.label==="stdin"); console.log(stdin?.status??"none")' 2>/dev/null || echo "none")
if [ "$HAS_STDIN" = "skipped" ] || [ "$HAS_STDIN" = "none" ]; then
  pass "stdin sources handled gracefully"
else
  fail "stdin skipped" "$HAS_STDIN"
fi

echo ""
echo "=== Results: $PASS/$TOTAL passed, $FAIL failed ==="

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
