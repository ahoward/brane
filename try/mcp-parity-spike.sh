#!/usr/bin/env bash
#
# Spike: verify MCP tool definitions load and CLI consolidate/decay commands work
#
set -euo pipefail

cd "$(dirname "$0")/.."
BRANE="bun run src/cli.ts"
export BRANE_EMBED_MOCK=1 BRANE_LLM_MOCK=1

PASS=0
FAIL=0
pass() { PASS=$((PASS + 1)); echo "  PASS: $1"; }
fail() { FAIL=$((FAIL + 1)); echo "  FAIL: $1 ($2)"; }

TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT
export BRANE_ROOT="$TMPDIR"

echo "── Init ──"
$BRANE init >/dev/null 2>&1
pass "init"

echo "── Create test data ──"
OUT=$($BRANE concept create --name "TestConcept" --type "Entity" --json 2>/dev/null)
ID=$(echo "$OUT" | jq -r '.result.id')
if [ "$ID" != "null" ] && [ -n "$ID" ]; then
  pass "concept create id=$ID"
else
  fail "concept create" "$OUT"
fi

$BRANE memory remember "test observation one" --agent test-agent --json >/dev/null 2>&1
$BRANE memory remember "test observation two" --agent test-agent --json >/dev/null 2>&1
pass "episodes created"

echo "── CLI consolidate (dry-run) ──"
OUT=$($BRANE consolidate --agent test-agent --dry-run --json 2>/dev/null)
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
if [ "$STATUS" = "success" ]; then
  pass "consolidate dry-run"
else
  fail "consolidate" "status=$STATUS"
fi

echo "── CLI decay (dry-run) ──"
OUT=$($BRANE decay --agent test-agent --dry-run --json 2>/dev/null)
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
if [ "$STATUS" = "success" ]; then
  pass "decay dry-run"
else
  fail "decay" "status=$STATUS"
fi

echo "── CLI consolidate (text output) ──"
OUT=$($BRANE consolidate --agent test-agent --dry-run 2>&1)
if echo "$OUT" | grep -qi "cluster\|no episode"; then
  pass "consolidate text output"
else
  fail "consolidate text" "$OUT"
fi

echo "── CLI decay (text output) ──"
OUT=$($BRANE decay --agent test-agent --dry-run 2>&1)
if echo "$OUT" | grep -qi "score\|no episodes"; then
  pass "decay text output"
else
  fail "decay text" "$OUT"
fi

echo "── MCP tools/list check ──"
# Send MCP initialize + tools/list via JSON-RPC to verify new tools are listed
INIT='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test-spike"}}}'
NOTIF='{"jsonrpc":"2.0","method":"notifications/initialized"}'
LIST='{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'

MCP_OUT=$(echo -e "${INIT}\n${NOTIF}\n${LIST}" | BRANE_ROOT="$TMPDIR" BRANE_EMBED_MOCK=1 BRANE_LLM_MOCK=1 timeout 15 bun run src/cli.ts mcp 2>/dev/null || true)

# Check for new tool names in the output
for TOOL in concepts_get concepts_update concepts_delete edges_get edges_update edges_delete annotations_create annotations_list provenance_create rules_create rules_list prune lens_create lens_list; do
  if echo "$MCP_OUT" | grep -q "\"$TOOL\""; then
    pass "MCP tool: $TOOL"
  else
    fail "MCP tool missing" "$TOOL"
  fi
done

echo ""
echo "═══════════════════════════"
echo "  PASS: $PASS  FAIL: $FAIL"
echo "═══════════════════════════"

[ "$FAIL" -eq 0 ] && exit 0 || exit 1
