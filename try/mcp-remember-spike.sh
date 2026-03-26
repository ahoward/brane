#!/usr/bin/env bash

#
# mcp-remember-spike.sh — whitebox spike for MCP remember/recall/forget (#35)
#
# Tests the high-level agent memory tools via MCP JSON-RPC protocol.
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BRANE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

PASS=0
FAIL=0
TOTAL=0

pass() {
  PASS=$((PASS + 1))
  TOTAL=$((TOTAL + 1))
  echo "  ✓ $1"
}

fail() {
  FAIL=$((FAIL + 1))
  TOTAL=$((TOTAL + 1))
  echo "  ✗ $1"
  echo "    $2"
}

# Send a JSON-RPC request to the MCP server and capture the response
mcp_call() {
  local request="$1"
  echo "$request" | (cd "$WORK" && BRANE_EMBED_MOCK=1 bun run "$BRANE_DIR/src/cli.ts" mcp 2>/dev/null) | head -1
}

# Send multiple JSON-RPC requests (newline-separated) and get responses
mcp_session() {
  local requests="$1"
  echo "$requests" | (cd "$WORK" && BRANE_EMBED_MOCK=1 bun run "$BRANE_DIR/src/cli.ts" mcp 2>/dev/null)
}

# -------------------------------------------------------------------
echo "=== Setup ==="
# -------------------------------------------------------------------

WORK=$(mktemp -d)
echo "  workdir: $WORK"

# Init brane in workdir
cd "$BRANE_DIR"
(cd "$WORK" && BRANE_EMBED_MOCK=1 bun run "$BRANE_DIR/src/cli.ts" /body/init) > /dev/null 2>&1
(cd "$WORK" && BRANE_EMBED_MOCK=1 bun run "$BRANE_DIR/src/cli.ts" /mind/init) > /dev/null 2>&1

# -------------------------------------------------------------------
echo ""
echo "=== MCP Initialize ==="
# -------------------------------------------------------------------

# Initialize + notification in one session
INIT_RESP=$(mcp_session '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","clientInfo":{"name":"claude-code","version":"1.0.0"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}')

INIT_STATUS=$(echo "$INIT_RESP" | head -1 | jq -r '.result.serverInfo.name // empty')
if [ "$INIT_STATUS" = "brane" ]; then
  pass "MCP initialize"
else
  fail "MCP initialize" "got: $(echo "$INIT_RESP" | head -1 | head -c 200)"
fi

# -------------------------------------------------------------------
echo ""
echo "=== Remember ==="
# -------------------------------------------------------------------

# Remember something
REMEMBER_RESP=$(mcp_session '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","clientInfo":{"name":"claude-code"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"remember","arguments":{"observation":"User prefers dark mode in all editors","context":"setting up workspace","tags":["preference","ui"]}}}')

REMEMBER_TEXT=$(echo "$REMEMBER_RESP" | tail -1 | jq -r '.result.content[0].text // empty')
if echo "$REMEMBER_TEXT" | grep -q "Remembered"; then
  pass "remember returns confirmation"
else
  fail "remember" "expected 'Remembered' in: $REMEMBER_TEXT"
fi

# Remember a second thing
REMEMBER2_RESP=$(mcp_session '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","clientInfo":{"name":"claude-code"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"remember","arguments":{"observation":"Running tests with --parallel causes flaky failures","context":"debugging CI","outcome":"switched to sequential","tags":["bug","testing"]}}}')

REMEMBER2_TEXT=$(echo "$REMEMBER2_RESP" | tail -1 | jq -r '.result.content[0].text // empty')
if echo "$REMEMBER2_TEXT" | grep -q "Remembered"; then
  pass "remember second memory"
else
  fail "remember second" "$REMEMBER2_TEXT"
fi

# Remember with missing observation -> error
REMEMBER_ERR=$(mcp_session '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","clientInfo":{"name":"test"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"remember","arguments":{}}}')

REMEMBER_ERR_FLAG=$(echo "$REMEMBER_ERR" | tail -1 | jq -r '.result.isError // empty')
if [ "$REMEMBER_ERR_FLAG" = "true" ]; then
  pass "remember missing observation -> error"
else
  fail "remember error" "expected isError=true"
fi

# -------------------------------------------------------------------
echo ""
echo "=== Recall ==="
# -------------------------------------------------------------------

# Recall memories about dark mode
RECALL_RESP=$(mcp_session '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","clientInfo":{"name":"claude-code"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"recall","arguments":{"query":"editor preferences dark mode"}}}')

RECALL_TEXT=$(echo "$RECALL_RESP" | tail -1 | jq -r '.result.content[0].text // empty')
if echo "$RECALL_TEXT" | grep -q "relevant memories"; then
  pass "recall returns memories"
else
  fail "recall" "expected 'relevant memories' in: $(echo "$RECALL_TEXT" | head -c 200)"
fi

if echo "$RECALL_TEXT" | grep -q "dark mode"; then
  pass "recall finds dark mode memory"
else
  fail "recall content" "expected 'dark mode' in results"
fi

# Recall with tag filter
RECALL_TAG=$(mcp_session '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","clientInfo":{"name":"claude-code"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"recall","arguments":{"query":"testing","tag":"bug"}}}')

RECALL_TAG_TEXT=$(echo "$RECALL_TAG" | tail -1 | jq -r '.result.content[0].text // empty')
if echo "$RECALL_TAG_TEXT" | grep -q "flaky\|parallel"; then
  pass "recall with tag filter works"
else
  fail "recall tag filter" "expected testing memory in: $(echo "$RECALL_TAG_TEXT" | head -c 200)"
fi

# Recall with missing query -> error
RECALL_ERR=$(mcp_session '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","clientInfo":{"name":"test"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"recall","arguments":{}}}')

RECALL_ERR_FLAG=$(echo "$RECALL_ERR" | tail -1 | jq -r '.result.isError // empty')
if [ "$RECALL_ERR_FLAG" = "true" ]; then
  pass "recall missing query -> error"
else
  fail "recall error" "expected isError=true"
fi

# -------------------------------------------------------------------
echo ""
echo "=== Forget ==="
# -------------------------------------------------------------------

# Forget first memory (id=1)
FORGET_RESP=$(mcp_session '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","clientInfo":{"name":"claude-code"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"forget","arguments":{"id":1}}}')

FORGET_TEXT=$(echo "$FORGET_RESP" | tail -1 | jq -r '.result.content[0].text // empty')
if echo "$FORGET_TEXT" | grep -q "Forgot"; then
  pass "forget returns confirmation"
else
  fail "forget" "expected 'Forgot' in: $FORGET_TEXT"
fi

# Forget non-existent -> error
FORGET_ERR=$(mcp_session '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","clientInfo":{"name":"test"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"forget","arguments":{"id":9999}}}')

FORGET_ERR_FLAG=$(echo "$FORGET_ERR" | tail -1 | jq -r '.result.isError // empty')
if [ "$FORGET_ERR_FLAG" = "true" ]; then
  pass "forget non-existent -> error"
else
  fail "forget error" "expected isError=true"
fi

# -------------------------------------------------------------------
echo ""
echo "=== Tools List ==="
# -------------------------------------------------------------------

# Verify remember/recall/forget appear in tools list
TOOLS_RESP=$(mcp_session '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","clientInfo":{"name":"test"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"tools/list"}')

TOOLS_LIST=$(echo "$TOOLS_RESP" | tail -1 | jq -r '.result.tools[].name' 2>/dev/null | tr '\n' ' ')
for tool in remember recall forget; do
  if echo "$TOOLS_LIST" | grep -q "$tool"; then
    pass "$tool in tools list"
  else
    fail "$tool in tools list" "not found in: $TOOLS_LIST"
  fi
done

# -------------------------------------------------------------------
echo ""
echo "=== Agent ID Auto-Population ==="
# -------------------------------------------------------------------

# Create a memory and verify agent_id was set from client info
EP_RESP=$(mcp_session '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","clientInfo":{"name":"my-custom-agent"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"remember","arguments":{"observation":"agent id test"}}}')

# Verify via episodes_list that agent_id is "my-custom-agent"
EPISODES_RESP=$(mcp_session '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","clientInfo":{"name":"test"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"episodes_list","arguments":{"agent_id":"my-custom-agent"}}}')

EP_LIST_TEXT=$(echo "$EPISODES_RESP" | tail -1 | jq -r '.result.content[0].text // empty')
if echo "$EP_LIST_TEXT" | grep -q "my-custom-agent"; then
  pass "agent_id auto-populated from MCP client info"
else
  fail "agent_id auto-population" "expected 'my-custom-agent' in: $(echo "$EP_LIST_TEXT" | head -c 200)"
fi

# -------------------------------------------------------------------
echo ""
echo "=== Results ==="
# -------------------------------------------------------------------

echo ""
echo "  $PASS passed, $FAIL failed, $TOTAL total"

rm -rf "$WORK"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi

echo ""
echo "  all tests passed!"
