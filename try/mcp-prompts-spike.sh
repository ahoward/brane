#!/usr/bin/env bash
#
# Whitebox spike: MCP prompts (#42)
#
# Tests:
#   1. prompts/list returns all prompt definitions
#   2. prompts/get returns prompt content
#   3. Argument interpolation works
#   4. Unknown prompt returns error
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

echo "=== MCP Prompts Spike ==="
echo ""

# ─────────────────────────────────────────────────────────────────
# Setup: build binary for MCP testing
# ─────────────────────────────────────────────────────────────────
echo "--- Setup ---"

# Init workspace
(cd "$WORKSPACE" && BRANE_EMBED_MOCK=1 bun run "$BRANE_ROOT/src/cli.ts" /body/init > /dev/null 2>&1)
(cd "$WORKSPACE" && BRANE_EMBED_MOCK=1 bun run "$BRANE_ROOT/src/cli.ts" /state/init > /dev/null 2>&1)

# Build binary for MCP stdin testing
bun build "$BRANE_ROOT/src/cli.ts" --compile --outfile "$BRANE_ROOT/brane" > /dev/null 2>&1
BRANE_BIN="$BRANE_ROOT/brane"
pass "setup complete"

# ─────────────────────────────────────────────────────────────────
# Test 1: prompts/list via compiled binary
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- prompts/list ---"

INIT='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
NOTIF='{"jsonrpc":"2.0","method":"notifications/initialized"}'
PLIST='{"jsonrpc":"2.0","id":2,"method":"prompts/list"}'

RESPONSES=$(printf '%s\n%s\n%s\n' "$INIT" "$NOTIF" "$PLIST" \
  | (cd "$WORKSPACE" && BRANE_EMBED_MOCK=1 "$BRANE_BIN" mcp 2>/dev/null))

LIST_RESP=$(echo "$RESPONSES" | grep '"jsonrpc"' | sed -n '2p')
PROMPT_COUNT=$(echo "$LIST_RESP" | jq '.result.prompts | length' 2>/dev/null || echo "0")

if [ "$PROMPT_COUNT" -ge 5 ]; then
  pass "prompts/list returns $PROMPT_COUNT prompts"
else
  fail "prompts/list" "expected >= 5, got $PROMPT_COUNT. Response: $LIST_RESP"
fi

# Check specific prompts exist
for NAME in memory-protocol pre-task-recall post-task-remember codebase-analysis knowledge-audit; do
  HAS=$(echo "$LIST_RESP" | jq "[.result.prompts[].name] | map(select(. == \"$NAME\")) | length")
  if [ "$HAS" -eq 1 ]; then
    pass "prompt '$NAME' listed"
  else
    fail "prompt $NAME" "not found"
  fi
done

# ─────────────────────────────────────────────────────────────────
# Test 2: prompts/get - memory-protocol (no args)
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- prompts/get (memory-protocol) ---"

PGET='{"jsonrpc":"2.0","id":3,"method":"prompts/get","params":{"name":"memory-protocol"}}'
GET_RESP=$(printf '%s\n%s\n%s\n' "$INIT" "$NOTIF" "$PGET" \
  | (cd "$WORKSPACE" && BRANE_EMBED_MOCK=1 "$BRANE_BIN" mcp 2>/dev/null) \
  | grep '"jsonrpc"' | sed -n '2p')

MSG_COUNT=$(echo "$GET_RESP" | jq '.result.messages | length' 2>/dev/null || echo "0")
if [ "$MSG_COUNT" -ge 1 ]; then
  pass "memory-protocol has $MSG_COUNT message(s)"
else
  fail "memory-protocol" "no messages: $GET_RESP"
fi

HAS_REMEMBER=$(echo "$GET_RESP" | jq -r '.result.messages[0].content.text' | grep -c "remember" || true)
if [ "$HAS_REMEMBER" -ge 1 ]; then
  pass "memory-protocol mentions 'remember'"
else
  fail "memory-protocol content" "doesn't mention remember"
fi

# ─────────────────────────────────────────────────────────────────
# Test 3: prompts/get with arguments
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- prompts/get (pre-task-recall with args) ---"

PGET_ARGS='{"jsonrpc":"2.0","id":4,"method":"prompts/get","params":{"name":"pre-task-recall","arguments":{"task_description":"fix the auth middleware timeout bug"}}}'
ARGS_RESP=$(printf '%s\n%s\n%s\n' "$INIT" "$NOTIF" "$PGET_ARGS" \
  | (cd "$WORKSPACE" && BRANE_EMBED_MOCK=1 "$BRANE_BIN" mcp 2>/dev/null) \
  | grep '"jsonrpc"' | sed -n '2p')

ARGS_TEXT=$(echo "$ARGS_RESP" | jq -r '.result.messages[0].content.text' 2>/dev/null || echo "")
HAS_TASK=$(echo "$ARGS_TEXT" | grep -c "auth middleware timeout" || true)
if [ "$HAS_TASK" -ge 1 ]; then
  pass "pre-task-recall interpolates task_description"
else
  fail "interpolation" "task not found in text: $ARGS_TEXT"
fi

# ─────────────────────────────────────────────────────────────────
# Test 4: prompts/get for post-task-remember
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- prompts/get (post-task-remember) ---"

PGET_POST='{"jsonrpc":"2.0","id":5,"method":"prompts/get","params":{"name":"post-task-remember","arguments":{"task_description":"deploy v2","outcome":"rolled back due to DB migration"}}}'
POST_RESP=$(printf '%s\n%s\n%s\n' "$INIT" "$NOTIF" "$PGET_POST" \
  | (cd "$WORKSPACE" && BRANE_EMBED_MOCK=1 "$BRANE_BIN" mcp 2>/dev/null) \
  | grep '"jsonrpc"' | sed -n '2p')

POST_TEXT=$(echo "$POST_RESP" | jq -r '.result.messages[0].content.text' 2>/dev/null || echo "")
HAS_OUTCOME=$(echo "$POST_TEXT" | grep -c "rolled back" || true)
if [ "$HAS_OUTCOME" -ge 1 ]; then
  pass "post-task-remember interpolates outcome"
else
  fail "outcome interpolation" "$POST_TEXT"
fi

# ─────────────────────────────────────────────────────────────────
# Test 5: prompts/get for unknown prompt
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- Error handling ---"

PGET_BAD='{"jsonrpc":"2.0","id":6,"method":"prompts/get","params":{"name":"nonexistent"}}'
BAD_RESP=$(printf '%s\n%s\n%s\n' "$INIT" "$NOTIF" "$PGET_BAD" \
  | (cd "$WORKSPACE" && BRANE_EMBED_MOCK=1 "$BRANE_BIN" mcp 2>/dev/null) \
  | grep '"jsonrpc"' | sed -n '2p')

HAS_ERR=$(echo "$BAD_RESP" | jq 'has("error")' 2>/dev/null || echo "false")
if [ "$HAS_ERR" = "true" ]; then
  pass "unknown prompt returns error"
else
  fail "error handling" "$BAD_RESP"
fi

# ─────────────────────────────────────────────────────────────────
# Test 6: Capabilities advertise prompts
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- Capabilities ---"

if grep -q 'prompts: {}' "$BRANE_ROOT/src/mcp.ts"; then
  pass "prompts capability advertised"
else
  fail "capabilities" "prompts not in capabilities"
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
