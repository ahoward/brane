#!/usr/bin/env bash
#
# mcp-spike.sh - whitebox spike for brane MCP server
#
# Tests the full JSON-RPC 2.0 flow: initialize → tools/list → tools/call
#

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=== brane MCP spike ==="
echo ""

# Create a temp workspace
TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT
cd "$TMPDIR"

# Initialize brane in the temp dir
echo "--- initializing brane workspace in $TMPDIR ---"
BRANE="$PROJECT_DIR/bin/brane"

"$BRANE" /body/init > /dev/null 2>&1
BRANE_EMBED_MOCK=1 "$BRANE" /mind/init > /dev/null 2>&1

# Create a test concept so we have data to search
echo "--- creating test concepts ---"
BRANE_EMBED_MOCK=1 "$BRANE" /mind/concepts/create '{"name": "AuthService", "type": "Entity"}' > /dev/null 2>&1
BRANE_EMBED_MOCK=1 "$BRANE" /mind/concepts/create '{"name": "TokenExpiry", "type": "Caveat"}' > /dev/null 2>&1
BRANE_EMBED_MOCK=1 "$BRANE" /mind/edges/create '{"source": 1, "target": 2, "relation": "DEPENDS_ON"}' > /dev/null 2>&1

# Build JSON-RPC messages
INIT='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"clientInfo":{"name":"spike-test","version":"1.0"}}}'
NOTIF='{"jsonrpc":"2.0","method":"notifications/initialized"}'
TOOLS_LIST='{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
CALL_SUMMARY='{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"graph_summary","arguments":{}}}'
CALL_SEARCH='{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"search","arguments":{"query":"authentication","limit":5}}}'
CALL_VIZ='{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"graph_viz","arguments":{"format":"mermaid","limit":10}}}'
CALL_NEIGHBORS='{"jsonrpc":"2.0","id":6,"method":"tools/call","params":{"name":"graph_neighbors","arguments":{"id":1}}}'
CALL_CONCEPTS='{"jsonrpc":"2.0","id":7,"method":"tools/call","params":{"name":"concepts_list","arguments":{}}}'
CALL_UNKNOWN='{"jsonrpc":"2.0","id":8,"method":"tools/call","params":{"name":"nonexistent","arguments":{}}}'
CALL_MISSING='{"jsonrpc":"2.0","id":9,"method":"tools/call","params":{"name":"search","arguments":{}}}'
PING='{"jsonrpc":"2.0","id":10,"method":"ping"}'

# Send all messages through MCP server
echo "--- sending JSON-RPC messages ---"
RESPONSES=$(printf '%s\n%s\n%s\n%s\n%s\n%s\n%s\n%s\n%s\n%s\n%s\n' \
  "$INIT" "$NOTIF" "$TOOLS_LIST" "$CALL_SUMMARY" "$CALL_SEARCH" "$CALL_VIZ" \
  "$CALL_NEIGHBORS" "$CALL_CONCEPTS" "$CALL_UNKNOWN" "$CALL_MISSING" "$PING" \
  | BRANE_EMBED_MOCK=1 "$BRANE" mcp 2>/dev/null)

echo ""
echo "=== RESPONSES ==="
echo ""

# Parse each response
IFS=$'\n'
i=0
LABELS=("initialize" "tools/list" "graph_summary" "search" "graph_viz" "graph_neighbors" "concepts_list" "unknown_tool" "missing_param" "ping")
for line in $RESPONSES; do
  if [ -n "$line" ]; then
    label="${LABELS[$i]:-response_$i}"
    echo "--- $label ---"
    echo "$line" | python3 -m json.tool 2>/dev/null || echo "$line"
    echo ""
    i=$((i + 1))
  fi
done

echo "=== $i responses received ==="

# Basic validation
INIT_RESP=$(echo "$RESPONSES" | head -1)
if echo "$INIT_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['result']['protocolVersion']=='2024-11-05'" 2>/dev/null; then
  echo "PASS: initialize returned correct protocol version"
else
  echo "FAIL: initialize response unexpected"
  echo "$INIT_RESP"
fi

TOOLS_RESP=$(echo "$RESPONSES" | sed -n '2p')
TOOL_COUNT=$(echo "$TOOLS_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d['result']['tools']))" 2>/dev/null)
if [ "$TOOL_COUNT" = "11" ]; then
  echo "PASS: tools/list returned 11 tools"
else
  echo "FAIL: expected 11 tools, got $TOOL_COUNT"
fi

SUMMARY_RESP=$(echo "$RESPONSES" | sed -n '3p')
if echo "$SUMMARY_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); c=json.loads(d['result']['content'][0]['text']); assert c['status']=='success'" 2>/dev/null; then
  echo "PASS: graph_summary returned success"
else
  echo "FAIL: graph_summary unexpected"
fi

UNKNOWN_RESP=$(echo "$RESPONSES" | sed -n '8p')
if echo "$UNKNOWN_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['result']['isError']==True" 2>/dev/null; then
  echo "PASS: unknown tool returned isError=true"
else
  echo "FAIL: unknown tool should error"
fi

MISSING_RESP=$(echo "$RESPONSES" | sed -n '9p')
if echo "$MISSING_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['result']['isError']==True" 2>/dev/null; then
  echo "PASS: missing required param returned isError=true"
else
  echo "FAIL: missing param should error"
fi

echo ""
echo "=== spike complete ==="
