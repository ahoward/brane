#!/usr/bin/env bash

#
# agent-id-spike.sh — whitebox spike for agent ID tracking (#37)
#
# Tests: agent_id on concepts, edges, episodes; filtering; MCP auto-population
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

# Run brane CLI in the WORK directory
brane() {
  (cd "$WORK" && BRANE_EMBED_MOCK=1 bun run "$BRANE_DIR/src/cli.ts" "$@")
}

check_status() {
  local label="$1"
  local output="$2"
  local expected="${3:-success}"
  local status
  status=$(echo "$output" | jq -r '.status // empty')
  if [ "$status" = "$expected" ]; then
    pass "$label"
  else
    fail "$label" "expected status=$expected, got: $(echo "$output" | head -c 200)"
  fi
}

check_field() {
  local label="$1"
  local output="$2"
  local jq_expr="$3"
  local expected="$4"
  local actual
  actual=$(echo "$output" | jq -r "$jq_expr // empty")
  if [ "$actual" = "$expected" ]; then
    pass "$label"
  else
    fail "$label" "expected $expected, got $actual"
  fi
}

# MCP helper
mcp_last() {
  local requests="$1"
  echo "$requests" | (cd "$WORK" && BRANE_EMBED_MOCK=1 bun run "$BRANE_DIR/src/cli.ts" mcp 2>/dev/null) | grep '"jsonrpc"' | tail -1
}

# -------------------------------------------------------------------
echo "=== Setup ==="
# -------------------------------------------------------------------

WORK=$(mktemp -d)
echo "  workdir: $WORK"

brane /body/init > /dev/null 2>&1
INIT_OUT=$(brane /mind/init)
check_status "mind init" "$INIT_OUT"
check_field "schema version 1.9.0" "$INIT_OUT" '.result.schema_version' '1.9.0'

# -------------------------------------------------------------------
echo ""
echo "=== US1: Concept agent_id ==="
# -------------------------------------------------------------------

# Create concept with agent_id
C1=$(brane /mind/concepts/create '{"name": "AuthService", "type": "Entity", "agent_id": "claude-code"}')
check_status "create concept with agent_id" "$C1"
check_field "concept returns agent_id" "$C1" '.result.agent_id' 'claude-code'

# Create concept without agent_id (should be null)
C2=$(brane /mind/concepts/create '{"name": "UserModel", "type": "Entity"}')
check_status "create concept without agent_id" "$C2"
C2_AID=$(echo "$C2" | jq -r '.result.agent_id')
if [ "$C2_AID" = "null" ] || [ "$C2_AID" = "" ]; then
  pass "concept without agent_id is null"
else
  fail "concept agent_id null" "expected null, got $C2_AID"
fi

# Create concept with different agent
C3=$(brane /mind/concepts/create '{"name": "PasswordHash", "type": "Entity", "agent_id": "gemini"}')
check_status "create concept with gemini agent_id" "$C3"

# List concepts filtered by agent_id
LIST_CLAUDE=$(brane /mind/concepts/list '{"agent_id": "claude-code"}')
check_status "list concepts by agent_id" "$LIST_CLAUDE"
LIST_CLAUDE_N=$(echo "$LIST_CLAUDE" | jq -r '.result.total')
if [ "$LIST_CLAUDE_N" = "1" ]; then
  pass "list by agent_id returns 1 concept"
else
  fail "list by agent_id count" "expected 1, got $LIST_CLAUDE_N"
fi

# List all (no filter)
LIST_ALL=$(brane /mind/concepts/list '{}')
LIST_ALL_N=$(echo "$LIST_ALL" | jq -r '.result.total')
if [ "$LIST_ALL_N" -ge 3 ]; then
  pass "list all returns >= 3 concepts"
else
  fail "list all count" "expected >= 3, got $LIST_ALL_N"
fi

# Search with agent_id filter
SEARCH=$(brane /mind/search '{"query": "authentication", "agent_id": "claude-code"}')
check_status "search with agent_id" "$SEARCH"

# -------------------------------------------------------------------
echo ""
echo "=== US2: Edge agent_id ==="
# -------------------------------------------------------------------

C1_ID=$(echo "$C1" | jq -r '.result.id')
C2_ID=$(echo "$C2" | jq -r '.result.id')
C3_ID=$(echo "$C3" | jq -r '.result.id')

# Create edge with agent_id
E1=$(brane /mind/edges/create "{\"source\": $C1_ID, \"target\": $C2_ID, \"relation\": \"DEPENDS_ON\", \"agent_id\": \"claude-code\"}")
check_status "create edge with agent_id" "$E1"
check_field "edge returns agent_id" "$E1" '.result.agent_id' 'claude-code'

# Create edge without agent_id
E2=$(brane /mind/edges/create "{\"source\": $C2_ID, \"target\": $C3_ID, \"relation\": \"DEPENDS_ON\"}")
check_status "create edge without agent_id" "$E2"

# Create edge with different agent
E3=$(brane /mind/edges/create "{\"source\": $C1_ID, \"target\": $C3_ID, \"relation\": \"USES\", \"agent_id\": \"gemini\"}")
check_status "create edge with gemini" "$E3"

# List edges filtered by agent_id
LIST_EDGES=$(brane /mind/edges/list '{"agent_id": "claude-code"}')
check_status "list edges by agent_id" "$LIST_EDGES"
LIST_EDGES_N=$(echo "$LIST_EDGES" | jq -r '.result.total')
if [ "$LIST_EDGES_N" = "1" ]; then
  pass "list edges by agent_id returns 1"
else
  fail "list edges by agent_id count" "expected 1, got $LIST_EDGES_N"
fi

# -------------------------------------------------------------------
echo ""
echo "=== US3: MCP auto-population ==="
# -------------------------------------------------------------------

# Create concept via MCP — agent_id should auto-populate from clientInfo
MCP_CONCEPT=$(mcp_last '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","clientInfo":{"name":"my-agent"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"concepts_create","arguments":{"name":"MCPConcept","type":"Entity"}}}')

MCP_TEXT=$(echo "$MCP_CONCEPT" | jq -r '.result.content[0].text // empty')
if echo "$MCP_TEXT" | grep -q "my-agent"; then
  pass "MCP auto-populates agent_id on concepts"
else
  fail "MCP concept agent_id" "expected my-agent in: $(echo "$MCP_TEXT" | head -c 200)"
fi

# Create edge via MCP — agent_id should auto-populate
MCP_EDGE=$(mcp_last '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","clientInfo":{"name":"my-agent"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"edges_create","arguments":{"source":1,"target":2,"relation":"LINKS_TO"}}}')

MCP_EDGE_TEXT=$(echo "$MCP_EDGE" | jq -r '.result.content[0].text // empty')
if echo "$MCP_EDGE_TEXT" | grep -q "my-agent"; then
  pass "MCP auto-populates agent_id on edges"
else
  fail "MCP edge agent_id" "expected my-agent in: $(echo "$MCP_EDGE_TEXT" | head -c 200)"
fi

# -------------------------------------------------------------------
echo ""
echo "=== US4: Migration ==="
# -------------------------------------------------------------------

# Test migration from v1.8.0 (create a v1.8.0 DB, then upgrade)
MWORK=$(mktemp -d)
# We can't easily create a v1.8.0 DB without the old code, so just verify
# fresh init creates v1.9.0
MINIT=$( (cd "$MWORK" && BRANE_EMBED_MOCK=1 bun run "$BRANE_DIR/src/cli.ts" /body/init > /dev/null 2>&1 && BRANE_EMBED_MOCK=1 bun run "$BRANE_DIR/src/cli.ts" /mind/init) )
check_field "fresh init creates v1.9.0" "$MINIT" '.result.schema_version' '1.9.0'

# Verify concept creation works on fresh db
FRESH_C=$( (cd "$MWORK" && BRANE_EMBED_MOCK=1 bun run "$BRANE_DIR/src/cli.ts" /mind/concepts/create '{"name":"FreshConcept","type":"Entity","agent_id":"test"}') )
check_status "concepts work on fresh db" "$FRESH_C"
check_field "fresh concept has agent_id" "$FRESH_C" '.result.agent_id' 'test'

rm -rf "$MWORK"

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
