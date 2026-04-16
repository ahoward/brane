#!/usr/bin/env bash
#
# Spike: verify MCP 3-verb facade (#103)
#
# Tests:
#   1. Default mode returns only 3 tools (remember, recall, forget)
#   2. Full mode returns all tools
#   3. remember dual-writes to graph + memories.db
#   4. forget dual-deletes from graph + tombstones in memories.db
#
set -euo pipefail

BRANE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BRANE="bun run $BRANE_ROOT/src/cli.ts"

PASS=0
FAIL=0
pass() { PASS=$((PASS + 1)); echo "  PASS: $1"; }
fail() { FAIL=$((FAIL + 1)); echo "  FAIL: $1 ($2)"; }

WORKSPACE=$(mktemp -d)
trap "rm -rf $WORKSPACE" EXIT
cd "$WORKSPACE"

echo "── Init ──"
BRANE_EMBED_MOCK=1 BRANE_LLM_MOCK=1 $BRANE init >/dev/null 2>&1

echo "── MCP tools/list (default = simple mode) ──"
# Send initialize + tools/list to MCP server
TOOLS_RESULT=$(echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"spike-test"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' | BRANE_EMBED_MOCK=1 BRANE_LLM_MOCK=1 $BRANE mcp 2>/dev/null | grep '"id":2')

# Count tools in response
TOOL_COUNT=$(echo "$TOOLS_RESULT" | bun -e "
const line = await Bun.stdin.text();
const resp = JSON.parse(line);
console.log(resp.result.tools.length);
")

if [ "$TOOL_COUNT" = "3" ]; then
  pass "default mode returns 3 tools"
else
  fail "default mode tool count" "expected 3, got $TOOL_COUNT"
fi

# Check tool names
TOOL_NAMES=$(echo "$TOOLS_RESULT" | bun -e "
const line = await Bun.stdin.text();
const resp = JSON.parse(line);
console.log(resp.result.tools.map(t => t.name).sort().join(','));
")

if [ "$TOOL_NAMES" = "forget,recall,remember" ]; then
  pass "default mode has remember,recall,forget"
else
  fail "default mode tool names" "$TOOL_NAMES"
fi

echo "── MCP tools/list (full mode) ──"
FULL_TOOLS_RESULT=$(echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"spike-test"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' | BRANE_EMBED_MOCK=1 BRANE_LLM_MOCK=1 BRANE_MCP_MODE=full $BRANE mcp 2>/dev/null | grep '"id":2')

FULL_TOOL_COUNT=$(echo "$FULL_TOOLS_RESULT" | bun -e "
const line = await Bun.stdin.text();
const resp = JSON.parse(line);
console.log(resp.result.tools.length);
")

if [ "$FULL_TOOL_COUNT" -gt "3" ]; then
  pass "full mode returns >3 tools ($FULL_TOOL_COUNT)"
else
  fail "full mode tool count" "expected >3, got $FULL_TOOL_COUNT"
fi

echo "── MCP remember (dual-write) ──"
REMEMBER_RESULT=$(echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"spike-test"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"remember","arguments":{"observation":"test memory from spike","context":"running spike test","tags":["fact"]}}}' | BRANE_EMBED_MOCK=1 BRANE_LLM_MOCK=1 $BRANE mcp 2>/dev/null | grep '"id":2')

if echo "$REMEMBER_RESULT" | grep -q "Remembered"; then
  pass "remember returns success"
else
  fail "remember" "$REMEMBER_RESULT"
fi

if echo "$REMEMBER_RESULT" | grep -q "audit=m_"; then
  pass "remember dual-writes to memories.db"
else
  fail "remember dual-write" "no audit= in: $REMEMBER_RESULT"
fi

# Verify memories.db has the row
AUDIT_COUNT=$(sqlite3 "$WORKSPACE/.brane/memories.db" "SELECT COUNT(*) FROM memories WHERE agent='spike-test' AND tombstoned=0" 2>/dev/null)
if [ "$AUDIT_COUNT" = "1" ]; then
  pass "memories.db has 1 audit row"
else
  fail "memories.db audit row" "expected 1, got $AUDIT_COUNT"
fi

echo "── MCP forget (dual-delete) ──"
# Extract the episode ID from the remember result
EP_ID=$(echo "$REMEMBER_RESULT" | bun -e "
const line = await Bun.stdin.text();
const resp = JSON.parse(line);
const text = resp.result.content[0].text;
const match = text.match(/id=(\d+)/);
console.log(match ? match[1] : 'none');
")

if [ "$EP_ID" != "none" ] && [ -n "$EP_ID" ]; then
  FORGET_RESULT=$(echo "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"initialize\",\"params\":{\"protocolVersion\":\"2024-11-05\",\"capabilities\":{},\"clientInfo\":{\"name\":\"spike-test\"}}}
{\"jsonrpc\":\"2.0\",\"method\":\"notifications/initialized\"}
{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"tools/call\",\"params\":{\"name\":\"forget\",\"arguments\":{\"id\":$EP_ID}}}" | BRANE_EMBED_MOCK=1 BRANE_LLM_MOCK=1 $BRANE mcp 2>/dev/null | grep '"id":2')

  if echo "$FORGET_RESULT" | grep -q "Forgot memory"; then
    pass "forget returns success"
  else
    fail "forget" "$FORGET_RESULT"
  fi

  if echo "$FORGET_RESULT" | grep -q "tombstoned"; then
    pass "forget tombstones in memories.db"
  else
    fail "forget tombstone" "$FORGET_RESULT"
  fi

  # Verify memories.db row is tombstoned
  TOMBSTONED=$(sqlite3 "$WORKSPACE/.brane/memories.db" "SELECT tombstoned FROM memories WHERE agent='spike-test'" 2>/dev/null)
  if [ "$TOMBSTONED" = "1" ]; then
    pass "memories.db row is tombstoned"
  else
    fail "memories.db tombstone" "expected 1, got $TOMBSTONED"
  fi
else
  fail "forget" "could not extract episode ID from remember result"
fi

echo ""
echo "═══════════════════════════"
echo "  PASS: $PASS  FAIL: $FAIL"
echo "═══════════════════════════"

[ "$FAIL" -eq 0 ] && exit 0 || exit 1
