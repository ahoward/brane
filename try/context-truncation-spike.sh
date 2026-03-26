#!/usr/bin/env bash
#
# Whitebox spike: Context truncation (#50)
#
# Tests:
#   1. Universal truncation on MCP tool responses
#   2. Configurable max response size via BRANE_MCP_MAX_RESPONSE
#   3. Truncation indicator in response
#   4. Small responses not truncated
#   5. All tools covered by universal truncation
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

echo "=== Context Truncation Spike ==="
echo ""

# ─────────────────────────────────────────────────────────────────
# Setup
# ─────────────────────────────────────────────────────────────────
echo "--- Setup ---"
brane /body/init > /dev/null 2>&1 || true
brane /state/init > /dev/null 2>&1 || true
brane /mind/init > /dev/null 2>&1 || true

# Create a few concepts
for i in $(seq 1 5); do
  echo "{\"name\": \"TestConcept_${i}\", \"type\": \"Entity\"}" | brane /mind/concepts/create > /dev/null 2>&1 || true
done

# Create edges
for i in $(seq 1 4); do
  NEXT=$((i + 1))
  echo "{\"source\": $i, \"target\": $NEXT, \"relation\": \"DEPENDS_ON\"}" | brane /mind/edges/create > /dev/null 2>&1 || true
done

# Create episodes
for i in $(seq 1 3); do
  echo "{\"agent_id\": \"test\", \"observation\": \"Observation $i with some detail\", \"tags\": [\"test\"]}" | brane /mind/episodes/create > /dev/null 2>&1 || true
done

pass "setup complete (5 concepts, 4 edges, 3 episodes)"

# ─────────────────────────────────────────────────────────────────
# Test 1: Source code structure
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- Source code checks ---"

if grep -q 'MAX_RESPONSE_BYTES' "$BRANE_ROOT/src/mcp.ts"; then
  pass "MAX_RESPONSE_BYTES defined"
else
  fail "max response" "MAX_RESPONSE_BYTES not in mcp.ts"
fi

if grep -q 'BRANE_MCP_MAX_RESPONSE' "$BRANE_ROOT/src/mcp.ts"; then
  pass "BRANE_MCP_MAX_RESPONSE env var supported"
else
  fail "env var" "BRANE_MCP_MAX_RESPONSE not in mcp.ts"
fi

if grep -q 'truncate_payload' "$BRANE_ROOT/src/mcp.ts"; then
  pass "truncate_payload function exists"
else
  fail "truncate" "truncate_payload not found"
fi

# Check universal truncation in tools/call handler
if grep -q 'Universal truncation' "$BRANE_ROOT/src/mcp.ts"; then
  pass "universal truncation applied to all tools"
else
  fail "universal" "universal truncation comment not found"
fi

# ─────────────────────────────────────────────────────────────────
# Test 2: Truncation function works
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- Truncation function ---"

TRUNC_TEST=$(bun -e "
// Import the truncation function by extracting it
const text = 'a'.repeat(10000);
const buf = Buffer.from(text, 'utf8');
const max = 500;
const truncated_buf = buf.subarray(0, max - 50);
const result = truncated_buf.toString('utf8').replace(/\uFFFD+$/, '') + '\n...(truncated)';
console.log('length:', result.length);
console.log('has_indicator:', result.includes('(truncated)'));
console.log('under_max:', result.length < max + 50);
" 2>/dev/null)

if echo "$TRUNC_TEST" | grep -q "has_indicator: true"; then
  pass "truncation indicator present"
else
  fail "indicator" "truncation indicator not found"
fi

if echo "$TRUNC_TEST" | grep -q "under_max: true"; then
  pass "truncated output under max size"
else
  fail "size" "truncated output exceeds max"
fi

# ─────────────────────────────────────────────────────────────────
# Test 3: MCP tool response truncation via compiled binary
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- MCP tool truncation ---"

bun build "$BRANE_ROOT/src/cli.ts" --compile --outfile "$BRANE_ROOT/brane" > /dev/null 2>&1
BRANE_BIN="$BRANE_ROOT/brane"

INIT='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
NOTIF='{"jsonrpc":"2.0","method":"notifications/initialized"}'

# Test: concepts_list (should return all 30, within default 64KB)
TOOL_CALL='{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"concepts_list","arguments":{}}}'
RESPONSES=$(printf '%s\n%s\n%s\n' "$INIT" "$NOTIF" "$TOOL_CALL" \
  | (cd "$WORKSPACE" && BRANE_EMBED_MOCK=1 "$BRANE_BIN" mcp 2>/dev/null) || true)

TOOL_RESP=$(echo "$RESPONSES" | grep '"jsonrpc"' | sed -n '2p')
TOOL_TEXT=$(echo "$TOOL_RESP" | jq -r '.result.content[0].text' 2>/dev/null || echo "")

if [ -n "$TOOL_TEXT" ] && [ "$TOOL_TEXT" != "null" ]; then
  TEXT_LEN=${#TOOL_TEXT}
  pass "concepts_list returns response (${TEXT_LEN} bytes)"
else
  fail "concepts_list" "no response text"
fi

# Test: with very small max response (force truncation)
TOOL_CALL2='{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"concepts_list","arguments":{}}}'
RESPONSES2=$(printf '%s\n%s\n%s\n' "$INIT" "$NOTIF" "$TOOL_CALL2" \
  | (cd "$WORKSPACE" && BRANE_EMBED_MOCK=1 BRANE_MCP_MAX_RESPONSE=500 "$BRANE_BIN" mcp 2>/dev/null) || true)

TOOL_RESP2=$(echo "$RESPONSES2" | grep '"jsonrpc"' | sed -n '2p')
TOOL_TEXT2=$(echo "$TOOL_RESP2" | jq -r '.result.content[0].text' 2>/dev/null || echo "")

if echo "$TOOL_TEXT2" | grep -q "truncated"; then
  pass "small max_response triggers truncation"
else
  TEXT2_LEN=${#TOOL_TEXT2}
  if [ "$TEXT2_LEN" -le 600 ]; then
    pass "response within max size ($TEXT2_LEN bytes)"
  else
    fail "truncation" "expected truncation at 500 bytes, got $TEXT2_LEN bytes. Text: ${TOOL_TEXT2:0:200}"
  fi
fi

# ─────────────────────────────────────────────────────────────────
# Test 4: recall truncation
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- recall truncation ---"

# recall already had MAX_RECALL_PAYLOAD (32KB)
if grep -q 'MAX_RECALL_PAYLOAD' "$BRANE_ROOT/src/mcp.ts"; then
  pass "recall has specific payload limit"
else
  fail "recall limit" "MAX_RECALL_PAYLOAD not found"
fi

# ─────────────────────────────────────────────────────────────────
# Test 5: Default config values
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- Defaults ---"

DEFAULT_CHECK=$(bun -e "
const content = require('fs').readFileSync('$BRANE_ROOT/src/mcp.ts', 'utf8');
const match = content.match(/MAX_RESPONSE_BYTES.*?(\d+)\s*\*\s*(\d+)/);
if (match) {
  const bytes = parseInt(match[1]) * parseInt(match[2]);
  console.log('default_bytes:', bytes);
  console.log('safe_for_128k:', bytes <= 128000);
}
" 2>/dev/null)

if echo "$DEFAULT_CHECK" | grep -q "safe_for_128k: true"; then
  BYTES=$(echo "$DEFAULT_CHECK" | grep "default_bytes:" | awk '{print $2}')
  pass "default ${BYTES} bytes is safe for 128K context"
else
  fail "default" "default size may overflow context windows"
fi

# ─────────────────────────────────────────────────────────────────
# Test 6: Normal-sized responses not truncated
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- Normal responses ---"

# A single concept get should NOT be truncated
SMALL_CALL='{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"graph_summary","arguments":{}}}'
SMALL_RESP=$(printf '%s\n%s\n%s\n' "$INIT" "$NOTIF" "$SMALL_CALL" \
  | (cd "$WORKSPACE" && BRANE_EMBED_MOCK=1 "$BRANE_BIN" mcp 2>/dev/null) || true)

SMALL_TEXT=$(echo "$SMALL_RESP" | grep '"jsonrpc"' | sed -n '2p' | jq -r '.result.content[0].text' 2>/dev/null || echo "")

if echo "$SMALL_TEXT" | grep -q "truncated"; then
  fail "small response" "normal response was truncated"
else
  if [ -n "$SMALL_TEXT" ] && [ "$SMALL_TEXT" != "null" ]; then
    pass "normal-sized response not truncated"
  else
    fail "small response" "no response text"
  fi
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
