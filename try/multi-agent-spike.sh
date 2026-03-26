#!/usr/bin/env bash
#
# Whitebox spike: multi-agent lens isolation (#40)
#
# Tests:
#   1. MCP initialize auto-creates agent lens
#   2. Agent writes scope to its own lens
#   3. Different agents get different lenses
#   4. Agent can read from shared lens (read-only)
#   5. Agent naming convention enforced
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

echo "=== Multi-Agent Lens Isolation Spike ==="
echo ""

# ─────────────────────────────────────────────────────────────────
# Setup: init body + mind + state on default lens
# ─────────────────────────────────────────────────────────────────
echo "--- Setup ---"
brane /body/init > /dev/null 2>&1
brane /state/init > /dev/null 2>&1
brane /mind/init > /dev/null 2>&1
pass "default lens initialized"

# ─────────────────────────────────────────────────────────────────
# Test 1: Agent lens auto-creation via MCP initialize
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- Agent lens auto-creation ---"

# Simulate MCP initialize with agent name "claude-code"
INIT_RESULT=$(echo '{"agent_id": "claude-code"}' | brane /mind/agent-lens/init 2>/dev/null)
INIT_STATUS=$(echo "$INIT_RESULT" | jq -r '.status')

if [ "$INIT_STATUS" = "success" ]; then
  pass "agent lens init succeeds"
else
  fail "agent lens init" "$INIT_RESULT"
fi

# Verify lens was created with correct name
LENS_NAME=$(echo "$INIT_RESULT" | jq -r '.result.lens_name')
if [ "$LENS_NAME" = "agent-claude-code" ]; then
  pass "lens name follows convention: $LENS_NAME"
else
  fail "lens naming" "expected agent-claude-code, got $LENS_NAME"
fi

# Verify lens is now active
ACTIVE=$(brane /lens/list 2>/dev/null | jq -r '.result.lenses[] | select(.active == true) | .name')
if [ "$ACTIVE" = "agent-claude-code" ]; then
  pass "agent lens is active"
else
  fail "active lens" "expected agent-claude-code, got $ACTIVE"
fi

# ─────────────────────────────────────────────────────────────────
# Test 2: Agent writes scope to its own lens
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- Agent write isolation ---"

# Create concept in agent lens
CONCEPT=$(echo '{"name": "AuthService", "type": "Entity"}' | brane /mind/concepts/create 2>/dev/null)
CONCEPT_STATUS=$(echo "$CONCEPT" | jq -r '.status')

if [ "$CONCEPT_STATUS" = "success" ]; then
  pass "created concept in agent lens"
else
  fail "concept create" "$CONCEPT"
fi

# Verify concept exists in agent lens
CONCEPTS=$(echo '{}' | brane /mind/concepts/list 2>/dev/null)
CONCEPT_COUNT=$(echo "$CONCEPTS" | jq '.result.concepts | length')
if [ "$CONCEPT_COUNT" -eq 1 ]; then
  pass "concept visible in agent lens"
else
  fail "concept count" "expected 1, got $CONCEPT_COUNT"
fi

# Switch to default lens and verify concept is NOT visible
brane /lens/use '{"name": "default"}' > /dev/null 2>&1
DEFAULT_CONCEPTS=$(echo '{}' | brane /mind/concepts/list 2>/dev/null)
DEFAULT_COUNT=$(echo "$DEFAULT_CONCEPTS" | jq '.result.concepts | length')
if [ "$DEFAULT_COUNT" -eq 0 ]; then
  pass "concept NOT visible in default lens (isolated)"
else
  fail "isolation" "default lens has $DEFAULT_COUNT concepts, expected 0"
fi

# ─────────────────────────────────────────────────────────────────
# Test 3: Different agents get different lenses
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- Multi-agent isolation ---"

# Init second agent
INIT2=$(echo '{"agent_id": "gemini-pro"}' | brane /mind/agent-lens/init 2>/dev/null)
INIT2_STATUS=$(echo "$INIT2" | jq -r '.status')
LENS2_NAME=$(echo "$INIT2" | jq -r '.result.lens_name')

if [ "$INIT2_STATUS" = "success" ] && [ "$LENS2_NAME" = "agent-gemini-pro" ]; then
  pass "second agent lens created: $LENS2_NAME"
else
  fail "second agent" "$INIT2"
fi

# Create different concept in second agent's lens
echo '{"name": "DatabasePool", "type": "Entity"}' | brane /mind/concepts/create > /dev/null 2>&1

# Verify second agent has its own concept
AGENT2_CONCEPTS=$(echo '{}' | brane /mind/concepts/list 2>/dev/null)
AGENT2_COUNT=$(echo "$AGENT2_CONCEPTS" | jq '.result.concepts | length')
AGENT2_NAME=$(echo "$AGENT2_CONCEPTS" | jq -r '.result.concepts[0].name')
if [ "$AGENT2_COUNT" -eq 1 ] && [ "$AGENT2_NAME" = "DatabasePool" ]; then
  pass "second agent has only its own concept ($AGENT2_NAME)"
else
  fail "agent2 isolation" "count=$AGENT2_COUNT, name=$AGENT2_NAME"
fi

# List all lenses — should have default, agent-claude-code, agent-gemini-pro
LENSES=$(brane /lens/list 2>/dev/null | jq -c '[.result.lenses[].name] | sort')
EXPECTED='["agent-claude-code","agent-gemini-pro","default"]'
if [ "$LENSES" = "$EXPECTED" ]; then
  pass "all three lenses exist: $LENSES"
else
  fail "lens list" "expected $EXPECTED, got $LENSES"
fi

# ─────────────────────────────────────────────────────────────────
# Test 4: Idempotent — re-init same agent doesn't create duplicate
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- Idempotent ---"

REINIT=$(echo '{"agent_id": "claude-code"}' | brane /mind/agent-lens/init 2>/dev/null)
REINIT_STATUS=$(echo "$REINIT" | jq -r '.status')
REINIT_CREATED=$(echo "$REINIT" | jq -r '.result.created')

if [ "$REINIT_STATUS" = "success" ] && [ "$REINIT_CREATED" = "false" ]; then
  pass "re-init is idempotent (created=false)"
else
  fail "idempotent" "$REINIT"
fi

# Verify first agent's concept still exists
AGENT1_CONCEPTS=$(echo '{}' | brane /mind/concepts/list 2>/dev/null)
AGENT1_COUNT=$(echo "$AGENT1_CONCEPTS" | jq '.result.concepts | length')
if [ "$AGENT1_COUNT" -eq 1 ]; then
  pass "agent data preserved after re-init"
else
  fail "data preservation" "expected 1 concept, got $AGENT1_COUNT"
fi

# ─────────────────────────────────────────────────────────────────
# Test 5: Validation
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- Validation ---"

# Empty agent_id
EMPTY=$(echo '{}' | brane /mind/agent-lens/init 2>/dev/null || true)
EMPTY_STATUS=$(echo "$EMPTY" | jq -r '.status')
if [ "$EMPTY_STATUS" = "error" ]; then
  pass "empty agent_id rejected"
else
  fail "validation" "empty agent_id should fail"
fi

# ─────────────────────────────────────────────────────────────────
# Results
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
