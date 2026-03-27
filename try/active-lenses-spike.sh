#!/usr/bin/env bash
#
# Whitebox spike: Active Lenses (#63)
#
# Tests lens prompts as cognitive filters in MOCK mode.
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

echo "=== Active Lenses Spike ==="
echo ""

# Setup
brane init > /dev/null 2>&1

echo "--- Running lens prompt tests ---"
echo ""

# Test 1: Create lens with prompt
echo "# Test 1: Create lens prompt"
RESULT=$(brane lens prompt security --set "Focus on authentication, authorization, encryption, attack surfaces" --json 2>/dev/null || true)
if echo "$RESULT" | bun -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); process.exit(d.status==="success" && d.result?.name==="security" ? 0 : 1)' 2>/dev/null; then
  pass "create lens prompt"
else
  fail "create lens prompt" "$RESULT"
fi

# Test 2: Get lens prompt
echo "# Test 2: Get lens prompt"
RESULT2=$(brane lens prompt security --json 2>/dev/null || true)
if echo "$RESULT2" | bun -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); process.exit(d.result?.prompt?.includes("authentication") ? 0 : 1)' 2>/dev/null; then
  pass "get lens prompt returns stored text"
else
  fail "get lens prompt" "$RESULT2"
fi

# Test 3: Lens starts inactive
echo "# Test 3: Starts inactive"
if echo "$RESULT2" | bun -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); process.exit(d.result?.active===false ? 0 : 1)' 2>/dev/null; then
  pass "lens starts inactive"
else
  fail "starts inactive" "$RESULT2"
fi

# Test 4: Activate lens
echo "# Test 4: Activate lens"
RESULT4=$(brane lens on security --json 2>/dev/null || true)
if echo "$RESULT4" | bun -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); process.exit(d.status==="success" && d.result?.active===true ? 0 : 1)' 2>/dev/null; then
  pass "activate lens"
else
  fail "activate" "$RESULT4"
fi

# Test 5: Verify active
echo "# Test 5: Verify active"
RESULT5=$(brane lens prompt security --json 2>/dev/null || true)
if echo "$RESULT5" | bun -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); process.exit(d.result?.active===true ? 0 : 1)' 2>/dev/null; then
  pass "lens shows as active"
else
  fail "verify active" "$RESULT5"
fi

# Test 6: Multiple lenses
echo "# Test 6: Multiple active lenses"
brane lens prompt performance --set "Focus on performance bottlenecks, latency, resource usage" > /dev/null 2>&1
brane lens on performance > /dev/null 2>&1
# Both should be active — test by trying to digest (prompt is auto-loaded)
brane concept create --name "TestConcept" --type Entity > /dev/null 2>&1
RESULT6=$(brane ask "test question" --json 2>/dev/null || true)
if echo "$RESULT6" | bun -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); process.exit(d.status==="success" ? 0 : 1)' 2>/dev/null; then
  pass "multiple active lenses don't break operations"
else
  fail "multiple lenses" "$RESULT6"
fi

# Test 7: Deactivate lens
echo "# Test 7: Deactivate lens"
RESULT7=$(brane lens off security --json 2>/dev/null || true)
if echo "$RESULT7" | bun -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); process.exit(d.status==="success" && d.result?.active===false ? 0 : 1)' 2>/dev/null; then
  pass "deactivate lens"
else
  fail "deactivate" "$RESULT7"
fi

# Test 8: Create lens with --prompt flag
echo "# Test 8: Create lens namespace with prompt"
RESULT8=$(brane lens create devops --prompt "Focus on CI/CD, deployment, infrastructure" --json 2>/dev/null || true)
if echo "$RESULT8" | bun -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); process.exit(d.status==="success" ? 0 : 1)' 2>/dev/null; then
  # Verify the prompt was saved
  RESULT8B=$(brane lens prompt devops --json 2>/dev/null || true)
  if echo "$RESULT8B" | bun -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); process.exit(d.result?.prompt?.includes("CI/CD") ? 0 : 1)' 2>/dev/null; then
    pass "lens create --prompt saves prompt"
  else
    fail "create with prompt" "$RESULT8B"
  fi
else
  fail "create lens" "$RESULT8"
fi

# Test 9: Activate nonexistent lens
echo "# Test 9: Activate nonexistent"
RESULT9=$(brane lens on nonexistent --json 2>/dev/null || true)
if echo "$RESULT9" | bun -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); process.exit(d.status==="error" ? 0 : 1)' 2>/dev/null; then
  pass "activate nonexistent returns error"
else
  fail "nonexistent" "$RESULT9"
fi

# Test 10: Pretty output
echo "# Test 10: Pretty output"
PRETTY=$(brane lens prompt security 2>/dev/null || true)
if [ -n "$PRETTY" ] && echo "$PRETTY" | grep -qi -e "security" -e "authentication" -e "prompt"; then
  pass "pretty output shows prompt info"
else
  fail "pretty output" "$PRETTY"
fi

echo ""
echo "=== Results: $PASS/$TOTAL passed, $FAIL failed ==="

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
