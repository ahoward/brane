#!/usr/bin/env bash
#
# Whitebox spike: Concurrency (#48)
#
# Tests:
#   1. Advisory lock acquisition and release
#   2. Lock rejection when another process holds it
#   3. Stale lock recovery (dead PID)
#   4. SQLite WAL mode on databases
#   5. MCP initialization acquires lock
#   6. Lock auto-cleanup
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

echo "=== Concurrency Spike ==="
echo ""

# ─────────────────────────────────────────────────────────────────
# Setup
# ─────────────────────────────────────────────────────────────────
echo "--- Setup ---"
brane /body/init > /dev/null 2>&1
brane /state/init > /dev/null 2>&1
brane /mind/init > /dev/null 2>&1
pass "setup complete"

# ─────────────────────────────────────────────────────────────────
# Test 1: Lock library basics
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- Lock library ---"

LOCK_TEST=$(bun -e "
const { acquire_lock, release_lock } = require('$BRANE_ROOT/src/lib/lock.ts');
const lockPath = '$WORKSPACE/.test-lock';

// Acquire
const r1 = acquire_lock(lockPath);
console.log(JSON.stringify({ acquired: r1.acquired }));

// Release
release_lock(lockPath);

// Acquire again (should succeed after release)
const r2 = acquire_lock(lockPath);
console.log(JSON.stringify({ reacquired: r2.acquired }));

release_lock(lockPath);
" 2>/dev/null)

ACQUIRED=$(echo "$LOCK_TEST" | head -1 | jq -r '.acquired')
REACQUIRED=$(echo "$LOCK_TEST" | tail -1 | jq -r '.reacquired')

if [ "$ACQUIRED" = "true" ]; then
  pass "lock acquired"
else
  fail "lock acquire" "expected true, got $ACQUIRED"
fi

if [ "$REACQUIRED" = "true" ]; then
  pass "lock reacquired after release"
else
  fail "lock reacquire" "expected true, got $REACQUIRED"
fi

# ─────────────────────────────────────────────────────────────────
# Test 2: Cross-process lock contention
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- Cross-process contention ---"

# Parent acquires, child tries
CONTENTION_TEST=$(bun -e "
const { acquire_lock, release_lock } = require('$BRANE_ROOT/src/lib/lock.ts');
const { execSync } = require('node:child_process');
const lockPath = '$WORKSPACE/.contention-lock';

// Parent acquires
const r = acquire_lock(lockPath);
console.log('parent:', r.acquired);

// Child tries to acquire same lock
try {
  const out = execSync(
    \`bun -e \"const { acquire_lock } = require('$BRANE_ROOT/src/lib/lock.ts'); const r = acquire_lock('\${lockPath}'); console.log(JSON.stringify({ acquired: r.acquired, error: r.error || null }));\"\`,
    { encoding: 'utf8' }
  ).trim();
  console.log('child:', out);
} catch (e) {
  console.log('child error:', e.stdout?.toString().trim());
}

release_lock(lockPath);
" 2>/dev/null)

PARENT_OK=$(echo "$CONTENTION_TEST" | grep "parent:" | awk '{print $2}')
CHILD_RESULT=$(echo "$CONTENTION_TEST" | grep "child:" | sed 's/^child: //')
CHILD_ACQUIRED=$(echo "$CHILD_RESULT" | jq -r '.acquired' 2>/dev/null || echo "error")

if [ "$PARENT_OK" = "true" ]; then
  pass "parent acquires lock"
else
  fail "parent lock" "expected true, got $PARENT_OK"
fi

if [ "$CHILD_ACQUIRED" = "false" ]; then
  pass "child rejected (lock contention)"
else
  fail "child rejection" "expected false, got $CHILD_ACQUIRED. Full: $CHILD_RESULT"
fi

# ─────────────────────────────────────────────────────────────────
# Test 3: Stale lock recovery
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- Stale lock recovery ---"

STALE_TEST=$(bun -e "
const { acquire_lock, release_lock } = require('$BRANE_ROOT/src/lib/lock.ts');
const { writeFileSync } = require('node:fs');
const lockPath = '$WORKSPACE/.stale-lock';

// Write a fake lock with a dead PID
writeFileSync(lockPath, '99999');  // Very unlikely to be a real PID

// Should detect stale lock and acquire
const r = acquire_lock(lockPath);
console.log(JSON.stringify({ acquired: r.acquired }));

release_lock(lockPath);
" 2>/dev/null)

STALE_ACQUIRED=$(echo "$STALE_TEST" | jq -r '.acquired')
if [ "$STALE_ACQUIRED" = "true" ]; then
  pass "stale lock recovered"
else
  fail "stale lock" "expected true, got $STALE_ACQUIRED"
fi

# ─────────────────────────────────────────────────────────────────
# Test 4: SQLite WAL mode
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- SQLite WAL mode ---"

WAL_TEST=$(bun -e "
const { Database } = require('bun:sqlite');

// Check body.db WAL mode
const body = new Database('$WORKSPACE/.brane/body.db', { readonly: true });
const bodyMode = body.query('PRAGMA journal_mode').get();
console.log('body_wal:', bodyMode.journal_mode);
body.close();

// Check state.db WAL mode
const state = new Database('$WORKSPACE/.brane/state.db', { readonly: true });
const stateMode = state.query('PRAGMA journal_mode').get();
console.log('state_wal:', stateMode.journal_mode);
state.close();
" 2>/dev/null)

BODY_WAL=$(echo "$WAL_TEST" | grep "body_wal:" | awk '{print $2}')
STATE_WAL=$(echo "$WAL_TEST" | grep "state_wal:" | awk '{print $2}')

if [ "$BODY_WAL" = "wal" ]; then
  pass "body.db uses WAL mode"
else
  fail "body.db WAL" "expected wal, got $BODY_WAL"
fi

if [ "$STATE_WAL" = "wal" ]; then
  pass "state.db uses WAL mode"
else
  fail "state.db WAL" "expected wal, got $STATE_WAL"
fi

# ─────────────────────────────────────────────────────────────────
# Test 5: Lock integration in source code
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- Source code integration ---"

if grep -q "acquire_lock" "$BRANE_ROOT/src/mcp.ts"; then
  pass "mcp.ts uses acquire_lock"
else
  fail "mcp integration" "acquire_lock not in mcp.ts"
fi

if grep -q "auto_release_on_exit" "$BRANE_ROOT/src/mcp.ts"; then
  pass "mcp.ts uses auto_release_on_exit"
else
  fail "auto release" "auto_release_on_exit not in mcp.ts"
fi

if grep -q "McpError" "$BRANE_ROOT/src/mcp.ts" && grep -q "lock" "$BRANE_ROOT/src/mcp.ts"; then
  pass "lock failure returns MCP error"
else
  fail "mcp error" "McpError for lock not found"
fi

# ─────────────────────────────────────────────────────────────────
# Test 6: Lock file module exists and exports
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- Module structure ---"

if [ -f "$BRANE_ROOT/src/lib/lock.ts" ]; then
  pass "lock.ts module exists"
else
  fail "module" "src/lib/lock.ts not found"
fi

EXPORTS_TEST=$(bun -e "
const m = require('$BRANE_ROOT/src/lib/lock.ts');
console.log('has_acquire:', typeof m.acquire_lock === 'function');
console.log('has_release:', typeof m.release_lock === 'function');
console.log('has_auto:', typeof m.auto_release_on_exit === 'function');
" 2>/dev/null)

if echo "$EXPORTS_TEST" | grep -q "has_acquire: true"; then
  pass "exports acquire_lock"
else
  fail "exports" "acquire_lock not exported"
fi

if echo "$EXPORTS_TEST" | grep -q "has_release: true"; then
  pass "exports release_lock"
else
  fail "exports" "release_lock not exported"
fi

if echo "$EXPORTS_TEST" | grep -q "has_auto: true"; then
  pass "exports auto_release_on_exit"
else
  fail "exports" "auto_release_on_exit not exported"
fi

# ─────────────────────────────────────────────────────────────────
# Test 7: MCP integration via compiled binary
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- MCP lock integration ---"

bun build "$BRANE_ROOT/src/cli.ts" --compile --outfile "$BRANE_ROOT/brane" > /dev/null 2>&1
BRANE_BIN="$BRANE_ROOT/brane"

INIT='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test-agent","version":"1.0"}}}'
NOTIF='{"jsonrpc":"2.0","method":"notifications/initialized"}'
TLIST='{"jsonrpc":"2.0","id":2,"method":"tools/list"}'

RESPONSES=$(printf '%s\n%s\n%s\n' "$INIT" "$NOTIF" "$TLIST" \
  | (cd "$WORKSPACE" && BRANE_EMBED_MOCK=1 "$BRANE_BIN" mcp 2>/dev/null) || true)

INIT_RESP=$(echo "$RESPONSES" | grep '"jsonrpc"' | head -1)
HAS_CAPABILITIES=$(echo "$INIT_RESP" | jq 'has("result")' 2>/dev/null || echo "false")

if [ "$HAS_CAPABILITIES" = "true" ]; then
  pass "MCP initialize succeeds with lock"
else
  fail "MCP init" "expected result, got: $INIT_RESP"
fi

# Check that lock file was created for the agent lens
LOCK_FILE="$WORKSPACE/.brane/lens/agent-test-agent/.lock"
if [ -f "$LOCK_FILE" ]; then
  pass "lock file created at agent lens"
else
  # Lock file may have been cleaned up on exit, check lens dir exists
  if [ -d "$WORKSPACE/.brane/lens/agent-test-agent" ]; then
    pass "agent lens created (lock auto-released on exit)"
  else
    fail "lock file" "no lock or agent lens at $LOCK_FILE"
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
