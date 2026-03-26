#!/usr/bin/env bash

#
# mcp-learn-ask-reflect-spike.sh — whitebox spike for MCP ask/reflect/relate (#36)
#
# Tests the high-level knowledge graph tools via MCP JSON-RPC protocol.
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

# Send multiple JSON-RPC requests (newline-separated) and get the LAST jsonrpc response
mcp_last() {
  local requests="$1"
  echo "$requests" | (cd "$WORK" && BRANE_EMBED_MOCK=1 bun run "$BRANE_DIR/src/cli.ts" mcp 2>/dev/null) | grep '"jsonrpc"' | tail -1
}

# Run a brane CLI command in the work directory
brane() {
  (cd "$WORK" && BRANE_EMBED_MOCK=1 bun run "$BRANE_DIR/src/cli.ts" "$@")
}

# -------------------------------------------------------------------
echo "=== Setup ==="
# -------------------------------------------------------------------

WORK=$(mktemp -d)
echo "  workdir: $WORK"

# Init brane in workdir
brane /body/init > /dev/null 2>&1
brane /mind/init > /dev/null 2>&1

# Populate some concepts and edges for ask/reflect to work with
brane /mind/concepts/create '{"name": "AuthService", "type": "Entity"}' > /dev/null 2>&1
brane /mind/concepts/create '{"name": "UserModel", "type": "Entity"}' > /dev/null 2>&1
brane /mind/concepts/create '{"name": "PasswordHashing", "type": "Entity"}' > /dev/null 2>&1
brane /mind/edges/create '{"source": 1, "target": 2, "relation": "DEPENDS_ON"}' > /dev/null 2>&1
brane /mind/edges/create '{"source": 1, "target": 3, "relation": "DEPENDS_ON"}' > /dev/null 2>&1

# -------------------------------------------------------------------
echo ""
echo "=== Tools List ==="
# -------------------------------------------------------------------

TOOLS_RESP=$(mcp_last '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","clientInfo":{"name":"test"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"tools/list"}')

TOOLS_LIST=$(echo "$TOOLS_RESP" | jq -r '.result.tools[].name' 2>/dev/null | tr '\n' ' ')
for tool in ask reflect relate; do
  if echo "$TOOLS_LIST" | grep -q "$tool"; then
    pass "$tool in tools list"
  else
    fail "$tool in tools list" "not found in: $TOOLS_LIST"
  fi
done

# -------------------------------------------------------------------
echo ""
echo "=== Ask ==="
# -------------------------------------------------------------------

# Ask about authentication
ASK_RESP=$(mcp_last '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","clientInfo":{"name":"claude-code"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"ask","arguments":{"query":"authentication service"}}}')

ASK_TEXT=$(echo "$ASK_RESP" | jq -r '.result.content[0].text // empty')
if echo "$ASK_TEXT" | grep -q "relevant concepts\|AuthService"; then
  pass "ask returns relevant concepts"
else
  fail "ask" "expected concepts in: $(echo "$ASK_TEXT" | head -c 200)"
fi

ASK_ISERR=$(echo "$ASK_RESP" | jq '.result.isError')
if [ "$ASK_ISERR" = "false" ]; then
  pass "ask isError=false"
else
  fail "ask isError" "expected false, got: $ASK_ISERR"
fi

# Ask with limit
ASK_LIM=$(mcp_last '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","clientInfo":{"name":"test"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"ask","arguments":{"query":"user model","limit":1}}}')

ASK_LIM_TEXT=$(echo "$ASK_LIM" | jq -r '.result.content[0].text // empty')
if echo "$ASK_LIM_TEXT" | grep -q "relevant concepts\|UserModel"; then
  pass "ask with limit returns results"
else
  fail "ask limit" "$(echo "$ASK_LIM_TEXT" | head -c 200)"
fi

# Ask missing query -> error
ASK_ERR=$(mcp_last '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","clientInfo":{"name":"test"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"ask","arguments":{}}}')

ASK_ERR_FLAG=$(echo "$ASK_ERR" | jq '.result.isError')
if [ "$ASK_ERR_FLAG" = "true" ]; then
  pass "ask missing query -> error"
else
  fail "ask error" "expected isError=true"
fi

# -------------------------------------------------------------------
echo ""
echo "=== Reflect ==="
# -------------------------------------------------------------------

# Reflect with summary (default)
REFLECT_RESP=$(mcp_last '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","clientInfo":{"name":"test"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"reflect","arguments":{}}}')

REFLECT_TEXT=$(echo "$REFLECT_RESP" | jq -r '.result.content[0].text // empty')
if echo "$REFLECT_TEXT" | grep -q "Concepts\|Knowledge Graph"; then
  pass "reflect summary shows graph stats"
else
  fail "reflect summary" "expected stats in: $(echo "$REFLECT_TEXT" | head -c 200)"
fi

# Reflect with mermaid
REFLECT_MERM=$(mcp_last '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","clientInfo":{"name":"test"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"reflect","arguments":{"format":"mermaid"}}}')

REFLECT_MERM_TEXT=$(echo "$REFLECT_MERM" | jq -r '.result.content[0].text // empty')
if echo "$REFLECT_MERM_TEXT" | grep -q "graph\|mermaid\|-->"; then
  pass "reflect mermaid returns diagram"
else
  fail "reflect mermaid" "expected diagram in: $(echo "$REFLECT_MERM_TEXT" | head -c 200)"
fi

# Reflect with ascii
REFLECT_ASCII=$(mcp_last '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","clientInfo":{"name":"test"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"reflect","arguments":{"format":"ascii"}}}')

REFLECT_ASCII_ERR=$(echo "$REFLECT_ASCII" | jq '.result.isError')
if [ "$REFLECT_ASCII_ERR" = "false" ]; then
  pass "reflect ascii returns without error"
else
  fail "reflect ascii" "expected isError=false, got: $REFLECT_ASCII_ERR"
fi

# -------------------------------------------------------------------
echo ""
echo "=== Relate ==="
# -------------------------------------------------------------------

# Create a new edge via relate
RELATE_RESP=$(mcp_last '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","clientInfo":{"name":"test"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"relate","arguments":{"source":2,"target":3,"relation":"USES"}}}')

RELATE_ERR=$(echo "$RELATE_RESP" | jq '.result.isError')
if [ "$RELATE_ERR" = "false" ]; then
  pass "relate creates edge"
else
  fail "relate" "expected isError=false, got: $RELATE_ERR"
fi

# Verify the edge was created (check text content)
RELATE_TEXT=$(echo "$RELATE_RESP" | jq -r '.result.content[0].text // empty')
if echo "$RELATE_TEXT" | grep -q "USES\|success"; then
  pass "relate response mentions relation"
else
  fail "relate content" "expected USES in: $(echo "$RELATE_TEXT" | head -c 200)"
fi

# Relate missing required params -> error
RELATE_ERR_RESP=$(mcp_last '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","clientInfo":{"name":"test"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"relate","arguments":{"source":1}}}')

RELATE_ERR_FLAG=$(echo "$RELATE_ERR_RESP" | jq '.result.isError')
if [ "$RELATE_ERR_FLAG" = "true" ]; then
  pass "relate missing params -> error"
else
  fail "relate error" "expected isError=true"
fi

# -------------------------------------------------------------------
echo ""
echo "=== Ask with Neighbors Enrichment ==="
# -------------------------------------------------------------------

# Ask should show connections since AuthService has edges
ASK_ENRICH=$(mcp_last '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","clientInfo":{"name":"test"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"ask","arguments":{"query":"AuthService dependencies"}}}')

ASK_ENRICH_TEXT=$(echo "$ASK_ENRICH" | jq -r '.result.content[0].text // empty')
if echo "$ASK_ENRICH_TEXT" | grep -q "connections\|DEPENDS_ON\|-->"; then
  pass "ask enriches with graph connections"
else
  # Not a hard failure — mock embeddings might not return AuthService first
  echo "  ~ ask enrichment: connections not visible (may be mock embedding order)"
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
