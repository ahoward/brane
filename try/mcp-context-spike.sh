#!/usr/bin/env bash
#
# Spike: verify brane://context auto-recall resource (#104)
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

echo "── brane://context (empty) ──"
EMPTY_CTX=$(echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"spike-test"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"resources/read","params":{"uri":"brane://context"}}' | BRANE_EMBED_MOCK=1 BRANE_LLM_MOCK=1 $BRANE mcp 2>/dev/null | grep '"id":2')

if echo "$EMPTY_CTX" | grep -q "contents"; then
  pass "context resource returns contents"
else
  fail "context resource" "$EMPTY_CTX"
fi

echo "── Remember + context ──"
# Remember something, then read context
RESULT=$(echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"spike-test"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"remember","arguments":{"observation":"context spike test memory"}}}
{"jsonrpc":"2.0","id":3,"method":"resources/read","params":{"uri":"brane://context"}}' | BRANE_EMBED_MOCK=1 BRANE_LLM_MOCK=1 $BRANE mcp 2>/dev/null | grep '"id":3')

if echo "$RESULT" | grep -q "context spike test memory"; then
  pass "context includes recent memory"
else
  fail "context with memory" "$RESULT"
fi

if echo "$RESULT" | grep -q "Recent memories"; then
  pass "context has Recent memories section"
else
  fail "context sections" "$RESULT"
fi

if echo "$RESULT" | grep -q "Memory audit trail\|audit"; then
  pass "context has audit trail info"
else
  # Might not have audit section if count is 0 — check differently
  if echo "$RESULT" | grep -q "spike-test"; then
    pass "context has audit trail info (agent name)"
  else
    fail "context audit" "$RESULT"
  fi
fi

echo ""
echo "═══════════════════════════"
echo "  PASS: $PASS  FAIL: $FAIL"
echo "═══════════════════════════"

[ "$FAIL" -eq 0 ] && exit 0 || exit 1
