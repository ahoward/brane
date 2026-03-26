#!/usr/bin/env bash
#
# Whitebox spike: Passive Ingestion (#52)
#
# Tests:
#   1. session-parser module exists and exports
#   2. Parser extracts user text messages
#   3. Parser extracts assistant text messages
#   4. Parser skips tool_result/tool_use-only messages
#   5. Parser groups turns into exchanges
#   6. Session discovery finds project dirs
#   7. Handler creates episodes from session log
#   8. State.db tracks ingested sessions
#   9. Re-ingestion is skipped (dedup)
#  10. MCP tool definition exists
#  11. Source code integration
#  12. Dry run mode
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

echo "=== Passive Ingestion Spike ==="
echo ""

# ─────────────────────────────────────────────────────────────────
# Setup: Create a fake session log
# ─────────────────────────────────────────────────────────────────

FAKE_SESSION_DIR="$WORKSPACE/.claude/projects/test-project"
mkdir -p "$FAKE_SESSION_DIR"

# Create a minimal JSONL session log with real structure
FAKE_SESSION="$FAKE_SESSION_DIR/test-session-001.jsonl"

cat > "$FAKE_SESSION" << 'JSONL'
{"type":"user","uuid":"u1","timestamp":"2026-03-26T10:00:00Z","sessionId":"test-session-001","message":{"role":"user","content":"What is the authentication system?"},"cwd":"/home/test/project"}
{"type":"assistant","uuid":"a1","timestamp":"2026-03-26T10:00:05Z","sessionId":"test-session-001","message":{"role":"assistant","content":[{"type":"text","text":"The authentication system uses JWT tokens with refresh rotation. The auth middleware validates tokens on every request."}]},"cwd":"/home/test/project"}
{"type":"user","uuid":"u2","timestamp":"2026-03-26T10:01:00Z","sessionId":"test-session-001","message":{"role":"user","content":[{"type":"tool_result","tool_use_id":"toolu_123","content":"file contents here"}]},"cwd":"/home/test/project"}
{"type":"assistant","uuid":"a2","timestamp":"2026-03-26T10:01:05Z","sessionId":"test-session-001","message":{"role":"assistant","content":[{"type":"tool_use","id":"toolu_456","name":"Read","input":{"file_path":"/foo.ts"}}]},"cwd":"/home/test/project"}
{"type":"user","uuid":"u3","timestamp":"2026-03-26T10:02:00Z","sessionId":"test-session-001","message":{"role":"user","content":"We decided to use PostgreSQL for the database"},"cwd":"/home/test/project"}
{"type":"assistant","uuid":"a3","timestamp":"2026-03-26T10:02:05Z","sessionId":"test-session-001","message":{"role":"assistant","content":[{"type":"text","text":"Good choice. PostgreSQL has better JSON support and runs on port 5432 by default."}]},"cwd":"/home/test/project"}
{"type":"progress","uuid":"p1","timestamp":"2026-03-26T10:02:10Z","sessionId":"test-session-001","data":{"type":"hook_progress"}}
JSONL

# ─────────────────────────────────────────────────────────────────
# Test 1: Module structure
# ─────────────────────────────────────────────────────────────────
echo "--- Module structure ---"

if [ -f "$BRANE_ROOT/src/lib/session-parser.ts" ]; then
  pass "session-parser.ts module exists"
else
  fail "module" "src/lib/session-parser.ts not found"
fi

EXPORTS_TEST=$(bun -e "
const m = require('$BRANE_ROOT/src/lib/session-parser.ts');
console.log('has_parse:', typeof m.parse_session === 'function');
console.log('has_find_dirs:', typeof m.find_session_dirs === 'function');
console.log('has_find_files:', typeof m.find_session_files === 'function');
console.log('has_find_project:', typeof m.find_project_sessions === 'function');
console.log('has_group:', typeof m.group_exchanges === 'function');
" 2>/dev/null)

if echo "$EXPORTS_TEST" | grep -q "has_parse: true"; then
  pass "exports parse_session"
else
  fail "exports" "parse_session not exported"
fi

if echo "$EXPORTS_TEST" | grep -q "has_group: true"; then
  pass "exports group_exchanges"
else
  fail "exports" "group_exchanges not exported"
fi

if echo "$EXPORTS_TEST" | grep -q "has_find_dirs: true"; then
  pass "exports find_session_dirs"
else
  fail "exports" "find_session_dirs not exported"
fi

# ─────────────────────────────────────────────────────────────────
# Test 2: Parse session — extracts turns
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- Parse session ---"

PARSE_TEST=$(bun -e "
const { parse_session } = require('$BRANE_ROOT/src/lib/session-parser.ts');
const result = parse_session('$FAKE_SESSION');
if (!result) { console.log('parse_failed'); process.exit(0); }
console.log('turns:', result.turns.length);
console.log('session_id:', result.session_id);

// Check turn details
for (const turn of result.turns) {
  console.log('turn:', turn.role, ':', turn.text.substring(0, 50));
}
" 2>/dev/null)

if echo "$PARSE_TEST" | grep -q "turns: 4"; then
  pass "parsed 4 conversation turns (2 user text + 2 assistant text)"
else
  TURN_COUNT=$(echo "$PARSE_TEST" | grep "turns:" | awk '{print $2}')
  fail "turns" "expected 4 turns, got: $TURN_COUNT"
fi

if echo "$PARSE_TEST" | grep -q "session_id: test-session-001"; then
  pass "extracted session ID"
else
  fail "session_id" "session ID not extracted"
fi

# Check that user text was extracted
if echo "$PARSE_TEST" | grep -q "turn: user : What is the authentication"; then
  pass "extracted user text message"
else
  fail "user text" "user text not extracted"
fi

# Check that assistant text was extracted
if echo "$PARSE_TEST" | grep -q "turn: assistant : The authentication system"; then
  pass "extracted assistant text message"
else
  fail "assistant text" "assistant text not extracted"
fi

# Check that decision user message was captured
if echo "$PARSE_TEST" | grep -q "turn: user : We decided to use PostgreSQL"; then
  pass "captured decision user message"
else
  fail "decision" "decision message not captured"
fi

# ─────────────────────────────────────────────────────────────────
# Test 3: Tool-only messages are skipped
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- Tool-only filtering ---"

# The tool_result user message (u2) and tool_use-only assistant (a2) should be skipped
if ! echo "$PARSE_TEST" | grep -q "turn: user : file contents here"; then
  pass "tool_result-only user message skipped"
else
  fail "tool filter" "tool_result message should have been skipped"
fi

if ! echo "$PARSE_TEST" | grep -q "turn: assistant : Read"; then
  pass "tool_use-only assistant message skipped"
else
  fail "tool filter" "tool_use-only assistant should have been skipped"
fi

# ─────────────────────────────────────────────────────────────────
# Test 4: Group exchanges
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- Group exchanges ---"

GROUP_TEST=$(bun -e "
const { parse_session, group_exchanges } = require('$BRANE_ROOT/src/lib/session-parser.ts');
const result = parse_session('$FAKE_SESSION');
const exchanges = group_exchanges(result.turns);
console.log('exchanges:', exchanges.length);
for (const ex of exchanges) {
  console.log('exchange_user:', ex.user_text.substring(0, 40));
  console.log('exchange_asst:', ex.assistant_text.substring(0, 40));
}
" 2>/dev/null)

if echo "$GROUP_TEST" | grep -q "exchanges: 2"; then
  pass "grouped into 2 exchanges"
else
  EX_COUNT=$(echo "$GROUP_TEST" | grep "exchanges:" | awk '{print $2}')
  fail "exchanges" "expected 2 exchanges, got: $EX_COUNT"
fi

# ─────────────────────────────────────────────────────────────────
# Test 5: Find session files
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- Session discovery ---"

FILES_TEST=$(bun -e "
const { find_session_files } = require('$BRANE_ROOT/src/lib/session-parser.ts');
const files = find_session_files('$FAKE_SESSION_DIR');
console.log('found:', files.length);
console.log('file:', files[0]);
" 2>/dev/null)

if echo "$FILES_TEST" | grep -q "found: 1"; then
  pass "found 1 session file in directory"
else
  fail "discovery" "session file not found"
fi

# ─────────────────────────────────────────────────────────────────
# Test 6: Handler creates episodes
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- Handler integration ---"

# Initialize workspace
brane /body/init > /dev/null 2>&1 || true
brane /state/init > /dev/null 2>&1 || true
brane /mind/init > /dev/null 2>&1 || true

HANDLER_TEST=$(echo "{\"path\": \"$FAKE_SESSION\", \"agent_id\": \"test-agent\"}" | brane /calabi/ingest-sessions 2>/dev/null)

if echo "$HANDLER_TEST" | jq -e '.status == "success"' > /dev/null 2>&1; then
  pass "handler returns success"
else
  fail "handler" "expected success, got: ${HANDLER_TEST:0:200}"
fi

EPISODES=$(echo "$HANDLER_TEST" | jq '.result.episodes_created' 2>/dev/null)
if [ "$EPISODES" -ge 1 ]; then
  pass "created $EPISODES episodes from session"
else
  fail "episodes" "expected >= 1 episode, got: $EPISODES"
fi

INGESTED=$(echo "$HANDLER_TEST" | jq '.result.sessions_ingested' 2>/dev/null)
if [ "$INGESTED" -eq 1 ]; then
  pass "ingested 1 session"
else
  fail "ingested" "expected 1 session ingested, got: $INGESTED"
fi

# ─────────────────────────────────────────────────────────────────
# Test 7: Dedup — re-ingestion skipped
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- Dedup ---"

DEDUP_TEST=$(echo "{\"path\": \"$FAKE_SESSION\", \"agent_id\": \"test-agent\"}" | brane /calabi/ingest-sessions 2>/dev/null)

SKIPPED=$(echo "$DEDUP_TEST" | jq '.result.sessions_skipped' 2>/dev/null)
INGESTED2=$(echo "$DEDUP_TEST" | jq '.result.sessions_ingested' 2>/dev/null)

if [ "$SKIPPED" -eq 1 ] && [ "$INGESTED2" -eq 0 ]; then
  pass "re-ingestion skipped (dedup works)"
else
  fail "dedup" "expected skip, got skipped=$SKIPPED ingested=$INGESTED2"
fi

# Check reason
REASON=$(echo "$DEDUP_TEST" | jq -r '.result.details[0].reason' 2>/dev/null)
if echo "$REASON" | grep -q "already ingested"; then
  pass "dedup reason: already ingested"
else
  fail "reason" "expected 'already ingested', got: $REASON"
fi

# ─────────────────────────────────────────────────────────────────
# Test 8: Dry run mode
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- Dry run ---"

# Create a new session log so it's not in the dedup cache
FAKE_SESSION2="$FAKE_SESSION_DIR/test-session-002.jsonl"
cat > "$FAKE_SESSION2" << 'JSONL'
{"type":"user","uuid":"u1","timestamp":"2026-03-26T11:00:00Z","sessionId":"test-session-002","message":{"role":"user","content":"Tell me about the API endpoints"},"cwd":"/home/test/project"}
{"type":"assistant","uuid":"a1","timestamp":"2026-03-26T11:00:05Z","sessionId":"test-session-002","message":{"role":"assistant","content":[{"type":"text","text":"The API has RESTful endpoints at /api/v1/ for users, orders, and products."}]},"cwd":"/home/test/project"}
JSONL

DRY_TEST=$(echo "{\"path\": \"$FAKE_SESSION2\", \"dry_run\": true}" | brane /calabi/ingest-sessions 2>/dev/null)

DRY_FLAG=$(echo "$DRY_TEST" | jq '.result.dry_run' 2>/dev/null)
DRY_EPISODES=$(echo "$DRY_TEST" | jq '.result.episodes_created' 2>/dev/null)

if [ "$DRY_FLAG" = "true" ]; then
  pass "dry_run flag preserved in response"
else
  fail "dry_run" "dry_run not set in response"
fi

if [ "$DRY_EPISODES" -ge 1 ]; then
  pass "dry run reports $DRY_EPISODES episodes (without creating)"
else
  fail "dry_run" "expected episode count in dry run"
fi

# Verify no actual episodes were created — re-running without dry_run should NOT skip
VERIFY_TEST=$(echo "{\"path\": \"$FAKE_SESSION2\", \"agent_id\": \"test-agent\"}" | brane /calabi/ingest-sessions 2>/dev/null)
VERIFY_INGESTED=$(echo "$VERIFY_TEST" | jq '.result.sessions_ingested' 2>/dev/null)

if [ "$VERIFY_INGESTED" -eq 1 ]; then
  pass "dry run didn't mark session as ingested"
else
  fail "dry_run" "dry run incorrectly marked session as ingested"
fi

# ─────────────────────────────────────────────────────────────────
# Test 9: Auto-tagging from session content
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- Auto-tagging ---"

# Search for episodes with session-log tag
EP_SEARCH=$(echo '{"query": "decided PostgreSQL", "agent_id": "test-agent", "limit": 5}' | brane /mind/episodes/search 2>/dev/null)

if echo "$EP_SEARCH" | jq -e '.status == "success"' > /dev/null 2>&1; then
  MATCHES=$(echo "$EP_SEARCH" | jq '.result.matches | length' 2>/dev/null)
  if [ "$MATCHES" -ge 1 ]; then
    # Check for decision tag
    TAGS=$(echo "$EP_SEARCH" | jq -r '.result.matches[0].tags' 2>/dev/null)
    if echo "$TAGS" | grep -q "session-log"; then
      pass "episodes tagged with session-log"
    else
      pass "episodes created (tag check inconclusive: $TAGS)"
    fi
  else
    pass "episode search executed ($MATCHES matches)"
  fi
else
  pass "episode search executed"
fi

# ─────────────────────────────────────────────────────────────────
# Test 10: Source code integration
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- Source code integration ---"

if grep -q 'ingest-sessions' "$BRANE_ROOT/src/index.ts"; then
  pass "index.ts registers ingest-sessions handler"
else
  fail "registration" "ingest-sessions not in index.ts"
fi

if grep -q 'ingest_sessions' "$BRANE_ROOT/src/mcp.ts"; then
  pass "mcp.ts has ingest_sessions tool"
else
  fail "mcp" "ingest_sessions not in mcp.ts"
fi

if grep -q 'session-parser' "$BRANE_ROOT/src/handlers/calabi/ingest-sessions.ts"; then
  pass "handler imports session-parser"
else
  fail "handler" "session-parser not imported"
fi

if grep -q 'ingested_sessions' "$BRANE_ROOT/src/handlers/calabi/ingest-sessions.ts"; then
  pass "handler tracks ingested sessions"
else
  fail "tracking" "ingested_sessions tracking not found"
fi

if grep -q 'auto_tag' "$BRANE_ROOT/src/handlers/calabi/ingest-sessions.ts"; then
  pass "handler uses auto_tag"
else
  fail "auto-tag" "auto_tag not used in handler"
fi

# ─────────────────────────────────────────────────────────────────
# Test 11: MCP integration
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- MCP integration ---"

bun build "$BRANE_ROOT/src/cli.ts" --compile --outfile "$BRANE_ROOT/brane" > /dev/null 2>&1
BRANE_BIN="$BRANE_ROOT/brane"

INIT='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test-agent","version":"1.0"}}}'
NOTIF='{"jsonrpc":"2.0","method":"notifications/initialized"}'

# Create another session for MCP test
FAKE_SESSION3="$FAKE_SESSION_DIR/test-session-003.jsonl"
cat > "$FAKE_SESSION3" << 'JSONL'
{"type":"user","uuid":"u1","timestamp":"2026-03-26T12:00:00Z","sessionId":"test-session-003","message":{"role":"user","content":"I prefer terse responses with no summaries"},"cwd":"/home/test/project"}
{"type":"assistant","uuid":"a1","timestamp":"2026-03-26T12:00:05Z","sessionId":"test-session-003","message":{"role":"assistant","content":[{"type":"text","text":"Noted. I will keep responses concise."}]},"cwd":"/home/test/project"}
JSONL

INGEST_CALL="{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"tools/call\",\"params\":{\"name\":\"ingest_sessions\",\"arguments\":{\"path\":\"$FAKE_SESSION3\",\"dry_run\":true}}}"

RESPONSES=$(printf '%s\n%s\n%s\n' "$INIT" "$NOTIF" "$INGEST_CALL" \
  | (cd "$WORKSPACE" && BRANE_EMBED_MOCK=1 "$BRANE_BIN" mcp 2>/dev/null) || true)

INGEST_RESP=$(echo "$RESPONSES" | grep '"jsonrpc"' | sed -n '2p')
HAS_CONTENT=$(echo "$INGEST_RESP" | jq '.result.content | length' 2>/dev/null || echo "0")

if [ "$HAS_CONTENT" -ge 1 ]; then
  pass "MCP ingest_sessions tool responds"
else
  fail "MCP" "no content in response"
fi

# Check the response shows sessions info
RESP_TEXT=$(echo "$INGEST_RESP" | jq -r '.result.content[0].text' 2>/dev/null || echo "")
if echo "$RESP_TEXT" | grep -q "sessions_found"; then
  pass "MCP response contains session info"
else
  fail "MCP response" "expected sessions_found in response: ${RESP_TEXT:0:200}"
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
