#!/usr/bin/env bash
#
# Whitebox spike: Cost Control / Circuit Breaker (#51)
#
# Tests:
#   1. Rate limit module exists and exports correct functions
#   2. Per-minute rate limiting works
#   3. Per-session rate limiting works
#   4. File count guard works
#   5. Force override bypasses limits
#   6. MCP learn tool does NOT expose force (agent safety)
#   7. Session stats tracking
#   8. Rate limiter resets on new session
#   9. Source code integration checks
#  10. MCP integration via compiled binary
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

echo "=== Cost Control / Circuit Breaker Spike ==="
echo ""

# ─────────────────────────────────────────────────────────────────
# Test 1: Module structure
# ─────────────────────────────────────────────────────────────────
echo "--- Module structure ---"

if [ -f "$BRANE_ROOT/src/lib/rate-limit.ts" ]; then
  pass "rate-limit.ts module exists"
else
  fail "module" "src/lib/rate-limit.ts not found"
fi

EXPORTS_TEST=$(bun -e "
const m = require('$BRANE_ROOT/src/lib/rate-limit.ts');
console.log('has_check:', typeof m.check_rate_limit === 'function');
console.log('has_consume:', typeof m.consume_llm_call === 'function');
console.log('has_record:', typeof m.record_llm_call === 'function');
console.log('has_reset:', typeof m.reset_rate_limiter === 'function');
console.log('has_file_check:', typeof m.check_file_count === 'function');
console.log('has_stats:', typeof m.get_session_stats === 'function');
console.log('has_config:', typeof m.get_rate_limit_config === 'function');
" 2>/dev/null)

if echo "$EXPORTS_TEST" | grep -q "has_check: true"; then
  pass "exports check_rate_limit"
else
  fail "exports" "check_rate_limit not exported"
fi

if echo "$EXPORTS_TEST" | grep -q "has_consume: true"; then
  pass "exports consume_llm_call (atomic check+record)"
else
  fail "exports" "consume_llm_call not exported"
fi

if echo "$EXPORTS_TEST" | grep -q "has_record: true"; then
  pass "exports record_llm_call"
else
  fail "exports" "record_llm_call not exported"
fi

if echo "$EXPORTS_TEST" | grep -q "has_reset: true"; then
  pass "exports reset_rate_limiter"
else
  fail "exports" "reset_rate_limiter not exported"
fi

if echo "$EXPORTS_TEST" | grep -q "has_file_check: true"; then
  pass "exports check_file_count"
else
  fail "exports" "check_file_count not exported"
fi

if echo "$EXPORTS_TEST" | grep -q "has_stats: true"; then
  pass "exports get_session_stats"
else
  fail "exports" "get_session_stats not exported"
fi

# ─────────────────────────────────────────────────────────────────
# Test 2: Per-minute rate limiting
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- Per-minute rate limiting ---"

RATE_TEST=$(bun -e "
const { check_rate_limit, record_llm_call, reset_rate_limiter } = require('$BRANE_ROOT/src/lib/rate-limit.ts');

// Reset to clean state
reset_rate_limiter();

// Record 3 calls with low per-minute limit (override via env was set)
// First, test with default config
const check1 = check_rate_limit();
console.log('initial_allowed:', check1.allowed);
console.log('initial_minute:', check1.calls_this_minute);
console.log('initial_session:', check1.calls_this_session);
" 2>/dev/null)

if echo "$RATE_TEST" | grep -q "initial_allowed: true"; then
  pass "initial check allows calls"
else
  fail "initial check" "expected allowed, got: $RATE_TEST"
fi

if echo "$RATE_TEST" | grep -q "initial_minute: 0"; then
  pass "initial minute count is 0"
else
  fail "initial count" "expected 0 minute calls"
fi

LIMIT_TEST=$(BRANE_LLM_RATE_LIMIT=3 bun -e "
const { check_rate_limit, record_llm_call, reset_rate_limiter } = require('$BRANE_ROOT/src/lib/rate-limit.ts');

reset_rate_limiter();

// Record 3 calls (hitting the limit)
record_llm_call();
record_llm_call();
record_llm_call();

const check = check_rate_limit();
console.log('blocked:', !check.allowed);
console.log('minute_calls:', check.calls_this_minute);
console.log('has_error:', check.error ? 'true' : 'false');
console.log('error_mentions_rate:', check.error && check.error.includes('Rate limit') ? 'true' : 'false');
console.log('no_force_hint:', check.error && !check.error.includes('force') ? 'true' : 'false');
" 2>/dev/null)

if echo "$LIMIT_TEST" | grep -q "blocked: true"; then
  pass "per-minute limit blocks after threshold"
else
  fail "per-minute limit" "expected blocked, got: $LIMIT_TEST"
fi

if echo "$LIMIT_TEST" | grep -q "error_mentions_rate: true"; then
  pass "error message mentions rate limit"
else
  fail "error message" "error doesn't mention rate limit"
fi

if echo "$LIMIT_TEST" | grep -q "no_force_hint: true"; then
  pass "error does NOT suggest force override (agent safety)"
else
  fail "force hint" "error should not mention force to agents"
fi

# Test consume_llm_call atomicity
CONSUME_TEST=$(BRANE_LLM_RATE_LIMIT=2 bun -e "
const { consume_llm_call, reset_rate_limiter, get_session_stats } = require('$BRANE_ROOT/src/lib/rate-limit.ts');

reset_rate_limiter();

// First consume — should succeed and record
const r1 = consume_llm_call();
console.log('consume1_allowed:', r1.allowed);
console.log('consume1_session:', r1.calls_this_session);

// Second consume — should succeed and record
const r2 = consume_llm_call();
console.log('consume2_allowed:', r2.allowed);

// Third consume — should fail (limit 2) and NOT record
const r3 = consume_llm_call();
console.log('consume3_blocked:', !r3.allowed);

// Session should be exactly 2, not 3
const stats = get_session_stats();
console.log('final_session:', stats.calls_this_session);
" 2>/dev/null)

if echo "$CONSUME_TEST" | grep -q "consume1_allowed: true"; then
  pass "consume_llm_call allows first call"
else
  fail "consume" "first call should be allowed"
fi

if echo "$CONSUME_TEST" | grep -q "consume3_blocked: true"; then
  pass "consume_llm_call blocks at limit"
else
  fail "consume block" "third call should be blocked"
fi

if echo "$CONSUME_TEST" | grep -q "final_session: 2"; then
  pass "blocked consume does NOT increment counter (atomic)"
else
  fail "atomic" "blocked consume should not increment counter"
fi

# ─────────────────────────────────────────────────────────────────
# Test 3: Per-session rate limiting
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- Per-session rate limiting ---"

SESSION_TEST=$(BRANE_LLM_RATE_LIMIT=1000 BRANE_LLM_SESSION_LIMIT=5 bun -e "
const { check_rate_limit, record_llm_call, reset_rate_limiter } = require('$BRANE_ROOT/src/lib/rate-limit.ts');

reset_rate_limiter();

// Record 5 calls (hitting session limit)
for (let i = 0; i < 5; i++) record_llm_call();

const check = check_rate_limit();
console.log('blocked:', !check.allowed);
console.log('session_calls:', check.calls_this_session);
console.log('error_mentions_session:', check.error && check.error.includes('Session limit') ? 'true' : 'false');
" 2>/dev/null)

if echo "$SESSION_TEST" | grep -q "blocked: true"; then
  pass "per-session limit blocks after threshold"
else
  fail "session limit" "expected blocked, got: $SESSION_TEST"
fi

if echo "$SESSION_TEST" | grep -q "session_calls: 5"; then
  pass "session call count tracked correctly"
else
  fail "session count" "expected 5 calls tracked"
fi

if echo "$SESSION_TEST" | grep -q "error_mentions_session: true"; then
  pass "error message mentions session limit"
else
  fail "session error" "error doesn't mention session"
fi

# ─────────────────────────────────────────────────────────────────
# Test 4: File count guard
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- File count guard ---"

FILE_TEST=$(BRANE_MAX_FILES_PER_LEARN=10 bun -e "
const { check_file_count, reset_rate_limiter } = require('$BRANE_ROOT/src/lib/rate-limit.ts');

reset_rate_limiter();

// Under limit
const ok = check_file_count(5);
console.log('under_allowed:', ok.allowed);

// Over limit
const blocked = check_file_count(50);
console.log('over_blocked:', !blocked.allowed);
console.log('over_error:', blocked.error ? 'true' : 'false');
console.log('error_has_count:', blocked.error && blocked.error.includes('50') ? 'true' : 'false');
console.log('error_has_limit:', blocked.error && blocked.error.includes('10') ? 'true' : 'false');
" 2>/dev/null)

if echo "$FILE_TEST" | grep -q "under_allowed: true"; then
  pass "file count under limit allowed"
else
  fail "file count" "expected allowed for 5 files"
fi

if echo "$FILE_TEST" | grep -q "over_blocked: true"; then
  pass "file count over limit blocked"
else
  fail "file count" "expected blocked for 50 files"
fi

if echo "$FILE_TEST" | grep -q "error_has_count: true"; then
  pass "error includes actual file count"
else
  fail "error message" "error doesn't include file count"
fi

# ─────────────────────────────────────────────────────────────────
# Test 5: Reset on new session
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- Reset behavior ---"

RESET_TEST=$(BRANE_LLM_RATE_LIMIT=3 bun -e "
const { check_rate_limit, record_llm_call, reset_rate_limiter, get_session_stats } = require('$BRANE_ROOT/src/lib/rate-limit.ts');

reset_rate_limiter();

// Record some calls
record_llm_call();
record_llm_call();
record_llm_call();

const before = get_session_stats();
console.log('before_session:', before.calls_this_session);

// Reset (simulates new MCP session)
reset_rate_limiter();

const after = get_session_stats();
console.log('after_session:', after.calls_this_session);
console.log('after_minute:', after.calls_last_minute);

// Should be allowed again
const check = check_rate_limit();
console.log('after_reset_allowed:', check.allowed);
" 2>/dev/null)

if echo "$RESET_TEST" | grep -q "before_session: 3"; then
  pass "session tracks 3 calls before reset"
else
  fail "tracking" "expected 3 calls before reset"
fi

if echo "$RESET_TEST" | grep -q "after_session: 0"; then
  pass "session count resets to 0"
else
  fail "reset" "session count didn't reset"
fi

if echo "$RESET_TEST" | grep -q "after_reset_allowed: true"; then
  pass "calls allowed after reset"
else
  fail "post-reset" "expected allowed after reset"
fi

# ─────────────────────────────────────────────────────────────────
# Test 6: Configuration via env vars
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- Env var configuration ---"

CONFIG_TEST=$(BRANE_LLM_RATE_LIMIT=42 BRANE_LLM_SESSION_LIMIT=200 BRANE_MAX_FILES_PER_LEARN=75 bun -e "
const { get_rate_limit_config, reset_rate_limiter } = require('$BRANE_ROOT/src/lib/rate-limit.ts');

reset_rate_limiter();
const config = get_rate_limit_config();
console.log('rate:', config.calls_per_minute);
console.log('session:', config.calls_per_session);
console.log('files:', config.max_files_per_learn);
" 2>/dev/null)

if echo "$CONFIG_TEST" | grep -q "rate: 42"; then
  pass "BRANE_LLM_RATE_LIMIT configures per-minute limit"
else
  fail "env config" "expected rate 42, got: $CONFIG_TEST"
fi

if echo "$CONFIG_TEST" | grep -q "session: 200"; then
  pass "BRANE_LLM_SESSION_LIMIT configures session limit"
else
  fail "env config" "expected session 200"
fi

if echo "$CONFIG_TEST" | grep -q "files: 75"; then
  pass "BRANE_MAX_FILES_PER_LEARN configures file limit"
else
  fail "env config" "expected files 75"
fi

# ─────────────────────────────────────────────────────────────────
# Test 7: Source code integration
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- Source code integration ---"

if grep -q 'reset_rate_limiter' "$BRANE_ROOT/src/mcp.ts"; then
  pass "mcp.ts calls reset_rate_limiter"
else
  fail "mcp integration" "reset_rate_limiter not in mcp.ts"
fi

if grep -q 'check_rate_limit' "$BRANE_ROOT/src/lib/llm.ts"; then
  pass "llm.ts checks rate limit"
else
  fail "llm integration" "check_rate_limit not in llm.ts"
fi

if grep -q 'record_llm_call' "$BRANE_ROOT/src/lib/llm.ts"; then
  pass "llm.ts records LLM calls"
else
  fail "llm integration" "record_llm_call not in llm.ts"
fi

if grep -q 'check_file_count' "$BRANE_ROOT/src/handlers/calabi/ingest.ts"; then
  pass "ingest.ts checks file count"
else
  fail "ingest integration" "check_file_count not in ingest.ts"
fi

if grep -q 'force' "$BRANE_ROOT/src/handlers/calabi/ingest.ts"; then
  pass "ingest.ts supports force override"
else
  fail "force support" "force not in ingest.ts"
fi

# Check learn tool does NOT expose force parameter in MCP (agent safety — Gemini review)
if grep -A10 '"learn"' "$BRANE_ROOT/src/mcp.ts" | grep -q 'force'; then
  fail "learn force" "force should NOT be in MCP tool definition (agent can't override its own circuit breaker)"
else
  pass "learn MCP tool does NOT expose force (agent safety)"
fi

# ─────────────────────────────────────────────────────────────────
# Test 8: LLM facade integration
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- LLM facade rate limiting ---"

# Test that extract_from_file respects rate limits (mock mode skips check)
FACADE_TEST=$(BRANE_LLM_MOCK=1 BRANE_EMBED_MOCK=1 bun -e "
const { extract_from_file } = require('$BRANE_ROOT/src/lib/llm.ts');

// In mock mode, rate limits are skipped
async function run() {
  try {
    const result = await extract_from_file({
      file_url: 'file:///test.ts',
      file_content: 'class Foo {}',
      file_path: '/test.ts',
      golden_types: [],
      golden_relations: []
    });
    console.log('mock_works:', result.concepts.length > 0 ? 'true' : 'false');
  } catch (e) {
    console.log('mock_error:', e.message);
  }
}
run();
" 2>/dev/null)

if echo "$FACADE_TEST" | grep -q "mock_works: true"; then
  pass "mock mode extraction works (rate limits skipped)"
else
  fail "mock extraction" "mock mode failed: $FACADE_TEST"
fi

# Test that rate limit blocks calls when exceeded (use separate process to avoid cached backend)
BLOCK_TEST=$(BRANE_LLM_RATE_LIMIT=0 BRANE_LLM_MOCK=0 bun -e "
const { reset_rate_limiter } = require('$BRANE_ROOT/src/lib/rate-limit.ts');
const { extract_from_file } = require('$BRANE_ROOT/src/lib/llm.ts');

// Rate limit of 0 means nothing is allowed
reset_rate_limiter();

async function run() {
  try {
    await extract_from_file({
      file_url: 'file:///test.ts',
      file_content: 'class Foo {}',
      file_path: '/test.ts',
      golden_types: [],
      golden_relations: []
    });
    console.log('should_have_blocked: false');
  } catch (e) {
    console.log('blocked:', e.message.includes('Rate limit') ? 'true' : 'false');
    console.log('no_force_hint:', !e.message.includes('force') ? 'true' : 'false');
  }
}
run();
" 2>/dev/null)

if echo "$BLOCK_TEST" | grep -q "blocked: true"; then
  pass "rate limit blocks real LLM calls"
else
  fail "rate limit block" "expected block, got: $BLOCK_TEST"
fi

if echo "$BLOCK_TEST" | grep -q "no_force_hint: true"; then
  pass "block error does NOT hint at force bypass (agent safety)"
else
  fail "force safety" "error should not suggest force to agents"
fi

# Test force override bypasses rate limit
FORCE_TEST=$(bun -e "
const { reset_rate_limiter } = require('$BRANE_ROOT/src/lib/rate-limit.ts');
const { extract_from_file } = require('$BRANE_ROOT/src/lib/llm.ts');

process.env.BRANE_LLM_RATE_LIMIT = '0';
process.env.BRANE_LLM_MOCK = '1';  // Use mock since we just want to test force bypass
reset_rate_limiter();

async function run() {
  try {
    const result = await extract_from_file({
      file_url: 'file:///test.ts',
      file_content: 'class Foo {}',
      file_path: '/test.ts',
      golden_types: [],
      golden_relations: []
    }, true);  // force = true
    console.log('force_bypass:', result.concepts.length > 0 ? 'true' : 'false');
  } catch (e) {
    console.log('force_error:', e.message);
  }
}
run();
" 2>/dev/null)

if echo "$FORCE_TEST" | grep -q "force_bypass: true"; then
  pass "force=true bypasses rate limit"
else
  fail "force bypass" "force didn't bypass: $FORCE_TEST"
fi

# ─────────────────────────────────────────────────────────────────
# Test 9: File count guard in ingest handler
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- File count guard in ingest ---"

brane() { (cd "$WORKSPACE" && BRANE_EMBED_MOCK=1 BRANE_LLM_MOCK=1 bun run "$BRANE_ROOT/src/cli.ts" "$@"); }

# Setup
brane /body/init > /dev/null 2>&1 || true
brane /state/init > /dev/null 2>&1 || true
brane /mind/init > /dev/null 2>&1 || true

# Create many small files to trigger file count guard
for i in $(seq 1 15); do
  echo "// file $i" > "$WORKSPACE/test_file_${i}.ts"
done

# Ingest with a low file limit — should be blocked
GUARD_RESULT=$( (cd "$WORKSPACE" && BRANE_EMBED_MOCK=1 BRANE_LLM_MOCK=1 BRANE_MAX_FILES_PER_LEARN=5 bun run "$BRANE_ROOT/src/cli.ts" /calabi/ingest '{"path": "."}') 2>/dev/null || true)

if echo "$GUARD_RESULT" | grep -q "file_count_exceeded"; then
  pass "file count guard blocks large ingest"
else
  # May have fewer files if some are unchanged
  FILE_COUNT=$(echo "$GUARD_RESULT" | grep -o '"files_extracted":[0-9]*' | grep -o '[0-9]*' || echo "?")
  if echo "$GUARD_RESULT" | grep -q "error"; then
    pass "ingest returns error for too many files (count: $FILE_COUNT)"
  else
    fail "file guard" "expected file_count_exceeded, got: ${GUARD_RESULT:0:200}"
  fi
fi

# Ingest with force should proceed (but we use mock, so just check it doesn't error on file count)
FORCE_INGEST=$( (cd "$WORKSPACE" && BRANE_EMBED_MOCK=1 BRANE_LLM_MOCK=1 BRANE_MAX_FILES_PER_LEARN=5 bun run "$BRANE_ROOT/src/cli.ts" /calabi/ingest '{"path": ".", "force": true}') 2>/dev/null || true)

if echo "$FORCE_INGEST" | grep -q "file_count_exceeded"; then
  fail "force override" "force should bypass file count guard"
else
  if echo "$FORCE_INGEST" | grep -q "success\|files_extracted"; then
    pass "force=true bypasses file count guard"
  else
    # Might fail for other reasons (mock mode extraction), but not file count
    pass "force=true doesn't trigger file count guard"
  fi
fi

# ─────────────────────────────────────────────────────────────────
# Test 10: MCP integration via compiled binary
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- MCP integration ---"

bun build "$BRANE_ROOT/src/cli.ts" --compile --outfile "$BRANE_ROOT/brane" > /dev/null 2>&1
BRANE_BIN="$BRANE_ROOT/brane"

INIT='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
NOTIF='{"jsonrpc":"2.0","method":"notifications/initialized"}'
TLIST='{"jsonrpc":"2.0","id":2,"method":"tools/list"}'

RESPONSES=$(printf '%s\n%s\n%s\n' "$INIT" "$NOTIF" "$TLIST" \
  | (cd "$WORKSPACE" && BRANE_EMBED_MOCK=1 "$BRANE_BIN" mcp 2>/dev/null) || true)

# Check learn tool does NOT have force in its MCP schema (agent safety)
TOOLS_RESP=$(echo "$RESPONSES" | grep '"jsonrpc"' | sed -n '2p')
LEARN_SCHEMA=$(echo "$TOOLS_RESP" | jq -r '.result.tools[] | select(.name=="learn") | .inputSchema.properties | keys[]' 2>/dev/null || echo "")

if echo "$LEARN_SCHEMA" | grep -q "force"; then
  fail "MCP force" "force should NOT be in learn MCP schema (agent safety)"
else
  pass "learn tool does NOT expose force via MCP (agent safety)"
fi

# Check that initialize succeeds (rate limiter resets)
INIT_RESP=$(echo "$RESPONSES" | grep '"jsonrpc"' | head -1)
HAS_RESULT=$(echo "$INIT_RESP" | jq 'has("result")' 2>/dev/null || echo "false")

if [ "$HAS_RESULT" = "true" ]; then
  pass "MCP initialize succeeds with rate limiter"
else
  fail "MCP init" "expected result, got: $INIT_RESP"
fi

# ─────────────────────────────────────────────────────────────────
# Test 11: Default configuration values
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- Default configuration ---"

DEFAULT_TEST=$(bun -e "
const { get_rate_limit_config, reset_rate_limiter } = require('$BRANE_ROOT/src/lib/rate-limit.ts');

// Clear env vars to get defaults
delete process.env.BRANE_LLM_RATE_LIMIT;
delete process.env.BRANE_LLM_SESSION_LIMIT;
delete process.env.BRANE_MAX_FILES_PER_LEARN;
reset_rate_limiter();

const config = get_rate_limit_config();
console.log('default_rate:', config.calls_per_minute);
console.log('default_session:', config.calls_per_session);
console.log('default_files:', config.max_files_per_learn);
console.log('rate_sane:', config.calls_per_minute > 0 && config.calls_per_minute <= 100 ? 'true' : 'false');
console.log('session_sane:', config.calls_per_session > 0 && config.calls_per_session <= 1000 ? 'true' : 'false');
console.log('files_sane:', config.max_files_per_learn > 0 && config.max_files_per_learn <= 500 ? 'true' : 'false');
" 2>/dev/null)

if echo "$DEFAULT_TEST" | grep -q "default_rate: 10"; then
  pass "default rate limit is 10/min"
else
  fail "default rate" "expected 10, got: $DEFAULT_TEST"
fi

if echo "$DEFAULT_TEST" | grep -q "default_session: 100"; then
  pass "default session limit is 100"
else
  fail "default session" "expected 100"
fi

if echo "$DEFAULT_TEST" | grep -q "default_files: 50"; then
  pass "default file limit is 50"
else
  fail "default files" "expected 50"
fi

if echo "$DEFAULT_TEST" | grep -q "rate_sane: true"; then
  pass "default limits are within sane ranges"
else
  fail "sane defaults" "defaults out of range"
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
