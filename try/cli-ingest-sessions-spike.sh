#!/usr/bin/env bash
#
# Whitebox spike: CLI Session Ingestion (#57)
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

echo "=== CLI Session Ingestion Spike ==="
echo ""

# Setup
brane init > /dev/null 2>&1

# Create fake session log
FAKE_DIR="$WORKSPACE/sessions"
mkdir -p "$FAKE_DIR"
FAKE_SESSION="$FAKE_DIR/test-session.jsonl"
cat > "$FAKE_SESSION" << 'JSONL'
{"type":"user","uuid":"u1","timestamp":"2026-03-27T10:00:00Z","sessionId":"spike-session","message":{"role":"user","content":"How does the auth middleware work?"},"cwd":"/tmp/test"}
{"type":"assistant","uuid":"a1","timestamp":"2026-03-27T10:00:05Z","sessionId":"spike-session","message":{"role":"assistant","content":[{"type":"text","text":"The auth middleware validates JWT tokens on each request using the refresh rotation pattern."}]},"cwd":"/tmp/test"}
{"type":"user","uuid":"u2","timestamp":"2026-03-27T10:01:00Z","sessionId":"spike-session","message":{"role":"user","content":"We decided to add rate limiting to the login endpoint"},"cwd":"/tmp/test"}
{"type":"assistant","uuid":"a2","timestamp":"2026-03-27T10:01:05Z","sessionId":"spike-session","message":{"role":"assistant","content":[{"type":"text","text":"Good call. I will add a sliding window rate limiter with 5 attempts per minute."}]},"cwd":"/tmp/test"}
JSONL

# ─────────────────────────────────────────────────────────────────
echo "--- dry run ---"

OUT=$(brane ingest-sessions "$FAKE_SESSION" -n 2>&1)
if echo "$OUT" | grep -q "dry run"; then
  pass "dry run prefix shown"
else
  fail "dry-run" "no dry run prefix: $OUT"
fi

if echo "$OUT" | grep -q "episodes"; then
  pass "dry run shows episode count"
else
  fail "dry-run" "no episode count"
fi

# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- actual ingestion ---"

OUT2=$(brane ingest-sessions "$FAKE_SESSION" 2>&1)
if echo "$OUT2" | grep -q "1 ingested"; then
  pass "ingested 1 session"
else
  fail "ingest" "unexpected: $OUT2"
fi

if echo "$OUT2" | grep -q "episodes"; then
  pass "shows episodes created"
else
  fail "episodes" "no episode info"
fi

# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- dedup ---"

OUT3=$(brane ingest-sessions "$FAKE_SESSION" 2>&1)
if echo "$OUT3" | grep -q "0 ingested"; then
  pass "dedup: 0 ingested on re-run"
else
  fail "dedup" "expected 0 ingested: $OUT3"
fi

if echo "$OUT3" | grep -q "skip"; then
  pass "dedup: shows skip reason"
else
  fail "dedup" "no skip shown"
fi

# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- directory mode ---"

# Create a second session
cat > "$FAKE_DIR/second-session.jsonl" << 'JSONL'
{"type":"user","uuid":"u1","timestamp":"2026-03-27T11:00:00Z","sessionId":"second-session","message":{"role":"user","content":"What testing framework do we use?"},"cwd":"/tmp/test"}
{"type":"assistant","uuid":"a1","timestamp":"2026-03-27T11:00:05Z","sessionId":"second-session","message":{"role":"assistant","content":[{"type":"text","text":"We use tc.ts, a language-agnostic JSON-in JSON-out test runner."}]},"cwd":"/tmp/test"}
JSONL

OUT4=$(brane ingest-sessions "$FAKE_DIR" 2>&1)
if echo "$OUT4" | grep -q "found 2"; then
  pass "directory mode finds 2 sessions"
else
  fail "dir" "unexpected: $OUT4"
fi

# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- json mode ---"

OUT5=$(brane ingest-sessions "$FAKE_DIR" -n -j 2>&1)
if echo "$OUT5" | jq -e '.status == "success"' > /dev/null 2>&1; then
  pass "JSON mode outputs valid result"
else
  fail "json" "invalid JSON: $OUT5"
fi

# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- no sessions ---"

EMPTY_DIR=$(mktemp -d)
OUT6=$(brane ingest-sessions "$EMPTY_DIR" 2>&1)
if echo "$OUT6" | grep -q "no session logs"; then
  pass "empty dir shows no sessions message"
else
  fail "empty" "unexpected: $OUT6"
fi
rmdir "$EMPTY_DIR"

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
