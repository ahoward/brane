#!/usr/bin/env bash
#
# Whitebox spike: Ask (#60)
#
# Tests ask in MOCK mode first (no real LLM needed for basic flow),
# then optionally with real LLM if BRANE_LLM_MOCK is not set.
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

echo "=== Ask Spike ==="
echo ""

# Setup: init + populate with some knowledge
brane init > /dev/null 2>&1

echo "--- Populating knowledge ---"

# Add some concepts
brane concept create --name "AuthService" --type Entity > /dev/null 2>&1
brane concept create --name "UserModel" --type Entity > /dev/null 2>&1
brane concept create --name "LoginEndpoint" --type Entity > /dev/null 2>&1

# Add edges
brane edge create --from 1 --to 2 --rel "DEPENDS_ON" > /dev/null 2>&1
brane edge create --from 3 --to 1 --rel "DEPENDS_ON" > /dev/null 2>&1

# Add episodes
brane memory remember --observation "AuthService handles JWT token validation" --context "code review" > /dev/null 2>&1
brane memory remember --observation "UserModel stores hashed passwords in bcrypt format" --context "security audit" > /dev/null 2>&1

echo "--- Running ask tests ---"
echo ""

# Test 1: Basic ask returns an answer
echo "# Test 1: Basic ask"
RESULT=$(brane ask "How does authentication work?" --json 2>/dev/null || true)
if echo "$RESULT" | bun -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); process.exit(d.status==="success" && d.result?.answer ? 0 : 1)' 2>/dev/null; then
  pass "basic ask returns success with answer"
else
  fail "basic ask" "$RESULT"
fi

# Test 2: Answer has citations
echo "# Test 2: Citations"
if echo "$RESULT" | bun -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); const c=d.result?.citations; process.exit(c && Array.isArray(c.concept_ids) && Array.isArray(c.episode_ids) && Array.isArray(c.edge_ids) ? 0 : 1)' 2>/dev/null; then
  pass "answer includes citations structure"
else
  fail "citations" "missing or malformed"
fi

# Test 3: Context loaded stats
echo "# Test 3: Context stats"
if echo "$RESULT" | bun -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); const c=d.result?.context_loaded; process.exit(c && typeof c.concepts==="number" && typeof c.episodes==="number" && typeof c.edges==="number" ? 0 : 1)' 2>/dev/null; then
  pass "context_loaded stats present"
else
  fail "context stats" "missing or malformed"
fi

# Test 4: Missing question returns error
echo "# Test 4: Missing question"
RESULT4=$(brane ask "" --json 2>/dev/null || true)
if echo "$RESULT4" | bun -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); process.exit(d.status==="error" ? 0 : 1)' 2>/dev/null; then
  pass "missing question returns error"
else
  fail "missing question" "$RESULT4"
fi

# Test 5: Pretty output (non-JSON)
echo "# Test 5: Pretty output"
PRETTY=$(brane ask "What is AuthService?" 2>/dev/null || true)
if [ -n "$PRETTY" ] && echo "$PRETTY" | grep -qi -e "auth" -e "concept" -e "Based on" -e "relevant" -e "don't have"; then
  pass "pretty output contains answer text"
else
  fail "pretty output" "$PRETTY"
fi

# Test 6: Limit parameter
echo "# Test 6: Limit parameter"
RESULT6=$(brane ask "test" --limit 5 --json 2>/dev/null || true)
if echo "$RESULT6" | bun -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); process.exit(d.status==="success" ? 0 : 1)' 2>/dev/null; then
  pass "limit parameter accepted"
else
  fail "limit parameter" "$RESULT6"
fi

# Test 7: Empty knowledge graph
echo "# Test 7: Empty graph"
WORKSPACE2=$(mktemp -d)
RESULT7=$( (cd "$WORKSPACE2" && BRANE_EMBED_MOCK=1 BRANE_LLM_MOCK=1 bun run "$BRANE_ROOT/src/cli.ts" init > /dev/null 2>&1 && BRANE_EMBED_MOCK=1 BRANE_LLM_MOCK=1 bun run "$BRANE_ROOT/src/cli.ts" ask "anything" --json 2>/dev/null) || true)
rm -rf "$WORKSPACE2"
if echo "$RESULT7" | bun -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); process.exit(d.status==="success" && d.result?.answer?.includes("don") ? 0 : 1)' 2>/dev/null; then
  pass "empty graph returns helpful message"
else
  fail "empty graph" "$RESULT7"
fi

# Test 8: After/before time filters
echo "# Test 8: Time filters"
RESULT8=$(brane ask "test" --after "2020-01-01" --before "2030-01-01" --json 2>/dev/null || true)
if echo "$RESULT8" | bun -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); process.exit(d.status==="success" ? 0 : 1)' 2>/dev/null; then
  pass "time filter parameters accepted"
else
  fail "time filters" "$RESULT8"
fi

echo ""
echo "=== Results: $PASS/$TOTAL passed, $FAIL failed ==="

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
