#!/usr/bin/env bash
#
# Demo 02: Lens Workflow
#
# Exercises: multi-lens, active lens prompts, rebuild, prune, lens deletion
#
# A user creates two lenses (security, performance), uses lens prompts
# to shape extraction, switches between lenses, rebuilds, prunes.
#
set -euo pipefail

BRANE_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BRANE="bun run $BRANE_ROOT/src/cli.ts"

PASS=0
FAIL=0
TOTAL=0
ISSUES=()

pass() { PASS=$((PASS + 1)); TOTAL=$((TOTAL + 1)); echo "  ✅  $1"; }
fail() {
  FAIL=$((FAIL + 1)); TOTAL=$((TOTAL + 1)); echo "  ❌  $1: $2"
  ISSUES+=("$1: $2")
}

WORKSPACE=$(mktemp -d)
trap "rm -rf $WORKSPACE" EXIT
cd "$WORKSPACE"

B() { BRANE_EMBED_MOCK=1 BRANE_LLM_MOCK=1 $BRANE "$@" 2>&1; }
BJ() { BRANE_EMBED_MOCK=1 BRANE_LLM_MOCK=1 $BRANE "$@" --json 2>&1; }

echo "╔══════════════════════════════════════════════════════╗"
echo "║  Demo 02: Lens Workflow                             ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ─── 1: Init ────────────────────────────────────────────────
echo "── 1: Initialize ──"
B init > /dev/null
pass "init"
echo ""

# ─── 2: Create lenses ───────────────────────────────────────
echo "── 2: Create lenses ──"
OUT=$(BJ lens create security -d "Security-focused analysis")
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
if [ "$STATUS" = "success" ]; then
  pass "create lens: security"
else
  fail "create lens security" "status=$STATUS"
fi

OUT=$(BJ lens create performance -d "Performance-focused analysis")
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
if [ "$STATUS" = "success" ]; then
  pass "create lens: performance"
else
  fail "create lens performance" "status=$STATUS"
fi

# Create with prompt inline
OUT=$(BJ lens create ux-lens -p "Focus on user experience, accessibility, and usability issues")
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
if [ "$STATUS" = "success" ]; then
  pass "create lens with --prompt"
else
  fail "create lens with prompt" "status=$STATUS"
fi

# List lenses
OUT=$(BJ lens list)
COUNT=$(echo "$OUT" | jq -r '.result.lenses | length' 2>/dev/null)
if [ "$COUNT" -ge 4 ] 2>/dev/null; then
  pass "lens list: $COUNT lenses (default + 3 created)"
else
  fail "lens list" "expected >=4, got $COUNT"
fi

# Duplicate lens should error gracefully
OUT=$(BJ lens create security -d "dup") || true
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
if [ "$STATUS" = "error" ]; then
  pass "duplicate lens returns error (no crash)"
else
  fail "duplicate lens" "expected error, got $STATUS"
fi
echo ""

# ─── 3: Switch lens ─────────────────────────────────────────
echo "── 3: Switch active lens ──"
OUT=$(BJ lens use security)
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
if [ "$STATUS" = "success" ]; then
  pass "switch to security lens"
else
  fail "lens use security" "status=$STATUS"
fi

# Verify active lens in status
OUT=$(BJ status)
LENS=$(echo "$OUT" | jq -r '.result.lens // empty' 2>/dev/null)
if [ "$LENS" = "security" ]; then
  pass "status confirms lens=security"
else
  fail "active lens" "expected 'security', got '$LENS'"
fi
echo ""

# ─── 4: Lens prompts ────────────────────────────────────────
echo "── 4: Lens prompts (cognitive filters) ──"

# Set a prompt
OUT=$(BJ lens prompt security-focus --set "Focus on authentication, authorization, input validation, and injection vulnerabilities.")
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
if [ "$STATUS" = "success" ]; then
  pass "set lens prompt"
else
  fail "set lens prompt" "status=$STATUS"
fi

# Get the prompt back
OUT=$(BJ lens prompt security-focus)
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
PROMPT_TEXT=$(echo "$OUT" | jq -r '.result.prompt // empty' 2>/dev/null)
if [ "$STATUS" = "success" ] && [ -n "$PROMPT_TEXT" ]; then
  pass "get lens prompt: ${#PROMPT_TEXT} chars"
else
  fail "get lens prompt" "status=$STATUS prompt_len=${#PROMPT_TEXT}"
fi

# Activate it
OUT=$(BJ lens on security-focus)
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
if [ "$STATUS" = "success" ]; then
  pass "activate lens prompt (lens on)"
else
  fail "activate lens prompt" "status=$STATUS"
fi
echo ""

# ─── 5: Digest through active lens ──────────────────────────
echo "── 5: Digest through lens ──"
cat > "$WORKSPACE/webapp.md" << 'SEED'
# Web Application Security Notes

Our Express.js application uses JWT tokens for authentication.
The tokens are stored in localStorage (not httpOnly cookies).
User input is sanitized with a custom regex before database queries.
Password hashing uses bcrypt with a work factor of 10.
The API has no rate limiting on the login endpoint.
CORS is configured with Access-Control-Allow-Origin: *.
SEED

OUT=$(BJ digest "$WORKSPACE/webapp.md")
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
CONCEPTS=$(echo "$OUT" | jq -r '.result.concepts_created // 0' 2>/dev/null)
DIGESTED=$(echo "$OUT" | jq -r '.result.sources_digested // 0' 2>/dev/null)
if [ "$STATUS" = "success" ] && [ "$DIGESTED" -gt 0 ]; then
  pass "digest through security lens: $CONCEPTS concepts"
else
  fail "digest through lens" "status=$STATUS digested=$DIGESTED"
fi

# Storm in lens context
OUT=$(BJ storm "web application vulnerabilities")
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
if [ "$STATUS" = "success" ]; then
  pass "storm through security lens"
else
  fail "storm through lens" "status=$STATUS"
fi

# Verify knowledge was created in security lens
OUT=$(BJ status)
CONCEPTS=$(echo "$OUT" | jq -r '.result.total_concepts // 0' 2>/dev/null)
if [ "$CONCEPTS" -gt 0 ]; then
  pass "security lens has $CONCEPTS concepts"
else
  fail "security lens concepts" "expected >0"
fi
echo ""

# ─── 6: Switch lens and verify isolation ─────────────────────
echo "── 6: Lens isolation ──"
OUT=$(BJ lens use performance)
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
if [ "$STATUS" = "success" ]; then
  pass "switch to performance lens"
else
  fail "lens use performance" "status=$STATUS"
fi

# Performance lens should have no concepts yet
OUT=$(BJ status)
CONCEPTS=$(echo "$OUT" | jq -r '.result.total_concepts // 0' 2>/dev/null)
LENS=$(echo "$OUT" | jq -r '.result.lens // empty' 2>/dev/null)
if [ "$LENS" = "performance" ] && [ "$CONCEPTS" = "0" ]; then
  pass "performance lens is empty (isolated from security)"
else
  fail "lens isolation" "lens=$LENS concepts=$CONCEPTS (expected 0)"
fi

# Digest different material into performance lens
cat > "$WORKSPACE/perf-notes.md" << 'SEED'
# Performance Optimization

Database queries use N+1 pattern — each user triggers 3 additional queries.
The application loads all records into memory before pagination.
No caching layer exists between the API and the database.
Static assets are not compressed or served from a CDN.
SEED

OUT=$(BJ digest "$WORKSPACE/perf-notes.md")
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
if [ "$STATUS" = "success" ]; then
  pass "digest in performance lens"
else
  fail "digest in performance lens" "status=$STATUS"
fi

# Verify performance lens now has concepts
OUT=$(BJ status)
CONCEPTS=$(echo "$OUT" | jq -r '.result.total_concepts // 0' 2>/dev/null)
if [ "$CONCEPTS" -gt 0 ]; then
  pass "performance lens: $CONCEPTS concepts"
else
  fail "performance lens content" "expected >0 concepts"
fi
echo ""

# ─── 7: Lens prompt lifecycle ───────────────────────────────
echo "── 7: Deactivate lens prompt ──"
B lens use security > /dev/null 2>&1

OUT=$(BJ lens off security-focus)
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
if [ "$STATUS" = "success" ]; then
  pass "deactivate lens prompt (lens off)"
else
  fail "deactivate prompt" "status=$STATUS"
fi

# Verify deactivated
OUT=$(BJ lens prompt security-focus)
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
ACTIVE=$(echo "$OUT" | jq '.result.active' 2>/dev/null)
if [ "$STATUS" = "success" ] && [ "$ACTIVE" = "false" ]; then
  pass "prompt shows active=false"
elif [ "$STATUS" = "error" ]; then
  fail "prompt deactivation" "status=error — prompt not found after lens switch? $(echo "$OUT" | jq -r '.errors' 2>/dev/null)"
else
  fail "prompt deactivation" "status=$STATUS active=$ACTIVE raw=$(echo "$OUT" | head -3)"
fi
echo ""

# ─── 8: Rebuild ─────────────────────────────────────────────
echo "── 8: Rebuild ──"

# Dry run first
OUT=$(BJ rebuild --dry-run)
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
if [ "$STATUS" = "success" ]; then
  pass "rebuild --dry-run"
else
  fail "rebuild dry-run" "status=$STATUS"
fi

OUT=$(BJ rebuild)
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
if [ "$STATUS" = "success" ]; then
  REBUILT=$(echo "$OUT" | jq -r '.result.sources_rebuilt // .result.sources_digested // 0' 2>/dev/null)
  pass "rebuild: $REBUILT sources"
else
  fail "rebuild" "status=$STATUS"
fi
echo ""

# ─── 9: Prune ───────────────────────────────────────────────
echo "── 9: Prune ──"
OUT=$(BJ prune --dry-run)
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
if [ "$STATUS" = "success" ]; then
  pass "prune --dry-run"
else
  fail "prune dry-run" "status=$STATUS"
fi

OUT=$(BJ prune)
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
if [ "$STATUS" = "success" ]; then
  pass "prune"
else
  fail "prune" "status=$STATUS"
fi
echo ""

# ─── 10: Lens export/show ───────────────────────────────────
echo "── 10: Lens info ──"
OUT=$(B lens show)
if [ -n "$OUT" ]; then
  pass "lens show has output"
else
  fail "lens show" "empty output"
fi

OUT=$(B lens export)
if [ -n "$OUT" ]; then
  pass "lens export has output"
else
  fail "lens export" "empty output"
fi

OUT=$(BJ lens stats)
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
if [ "$STATUS" = "success" ]; then
  pass "lens stats"
else
  fail "lens stats" "status=$STATUS"
fi
echo ""

# ─── 11: Delete lens ────────────────────────────────────────
echo "── 11: Lens deletion ──"
B lens use default > /dev/null 2>&1

OUT=$(BJ lens delete performance)
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
if [ "$STATUS" = "success" ]; then
  pass "delete performance lens"
else
  fail "delete lens" "status=$STATUS"
fi

# Verify gone from list
OUT=$(BJ lens list)
NAMES=$(echo "$OUT" | jq -r '.result.lenses[].name' 2>/dev/null | tr '\n' ' ')
if echo "$NAMES" | grep -qv "performance"; then
  pass "performance removed from lens list"
else
  fail "lens cleanup" "still in: $NAMES"
fi

# Can't use deleted lens
OUT=$(BJ lens use performance) || true
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
if [ "$STATUS" = "error" ]; then
  pass "using deleted lens returns error"
else
  fail "deleted lens use" "expected error, got $STATUS"
fi

# Can't delete default lens
OUT=$(BJ lens delete default) || true
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
if [ "$STATUS" = "error" ]; then
  pass "cannot delete default lens"
else
  fail "delete default" "expected error, got $STATUS"
fi
echo ""

# ─── 12: Verify after all operations ────────────────────────
echo "── 12: Final verify ──"
B lens use default > /dev/null 2>&1
OUT=$(BJ verify)
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
if [ "$STATUS" = "success" ]; then
  pass "verify passes after full workflow"
else
  fail "final verify" "status=$STATUS"
fi
echo ""

# ─── Results ────────────────────────────────────────────────
echo "╔══════════════════════════════════════════════════════╗"
echo "  Results: $PASS/$TOTAL passed, $FAIL failed"
if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "  Issues:"
  for issue in "${ISSUES[@]}"; do
    echo "    - $issue"
  done
fi
echo "╚══════════════════════════════════════════════════════╝"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
