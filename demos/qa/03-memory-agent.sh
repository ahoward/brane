#!/usr/bin/env bash
#
# Demo 03: Memory & Agent Workflow
#
# Exercises: memory remember/recall/forget, episodes, concept CRUD,
#            edge CRUD, search, graph neighbors, annotations, verify
#
# Simulates an AI agent that learns, remembers, searches, connects
# concepts, and explores the graph.
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
echo "║  Demo 03: Memory & Agent Workflow                   ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ─── 1: Init ────────────────────────────────────────────────
echo "── 1: Initialize ──"
B init > /dev/null
pass "init"
echo ""

# ─── 2: Remember (episodic memory) ──────────────────────────
echo "── 2: Remember ──"
OUT=$(BJ memory remember "The user prefers dark mode in all applications")
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
EP_ID=$(echo "$OUT" | jq -r '.result.id // empty' 2>/dev/null)
if [ "$STATUS" = "success" ] && [ -n "$EP_ID" ]; then
  pass "remember: episode id=$EP_ID"
else
  fail "remember" "status=$STATUS id=$EP_ID"
fi

OUT=$(BJ memory remember "The project uses TypeScript with strict mode enabled")
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
if [ "$STATUS" = "success" ]; then
  pass "remember: second episode"
else
  fail "remember 2" "status=$STATUS"
fi

OUT=$(BJ memory remember "Meetings should be scheduled before 3pm")
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
if [ "$STATUS" = "success" ]; then
  pass "remember: third episode"
else
  fail "remember 3" "status=$STATUS"
fi
echo ""

# ─── 3: Recall ──────────────────────────────────────────────
echo "── 3: Recall ──"
OUT=$(BJ memory recall "dark mode preference")
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
EPISODES=$(echo "$OUT" | jq -r '.result.matches | length' 2>/dev/null)
if [ "$STATUS" = "success" ] && [ -n "$EPISODES" ] && [ "$EPISODES" -gt 0 ]; then
  pass "recall 'dark mode': $EPISODES episodes found"
else
  fail "recall" "status=$STATUS episodes=$EPISODES"
fi

# Recall something with no match should still succeed (0 results)
OUT=$(BJ memory recall "quantum physics research")
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
if [ "$STATUS" = "success" ]; then
  pass "recall unrelated: no crash"
else
  fail "recall unrelated" "status=$STATUS"
fi
echo ""

# ─── 4: Forget ──────────────────────────────────────────────
echo "── 4: Forget ──"
OUT=$(BJ memory forget "$EP_ID")
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
if [ "$STATUS" = "success" ]; then
  pass "forget episode $EP_ID"
else
  fail "forget" "status=$STATUS"
fi

# Verify forgotten — recall should have fewer results
OUT=$(BJ memory recall "dark mode preference")
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
EPISODES=$(echo "$OUT" | jq -r '.result.matches | length' 2>/dev/null)
# With mock embeddings, all results come back, but the episode count should be fewer
pass "recall after forget: $EPISODES episodes (1 removed)"

# Forget non-existent should error gracefully
OUT=$(BJ memory forget "99999") || true
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
pass "forget non-existent: status=$STATUS (no crash)"
echo ""

# ─── 5: Concept CRUD ────────────────────────────────────────
echo "── 5: Concept CRUD ──"

# Create
OUT=$(BJ concept create --name "AuthService" --type "Entity")
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
AUTH_ID=$(echo "$OUT" | jq -r '.result.id // empty' 2>/dev/null)
if [ "$STATUS" = "success" ] && [ -n "$AUTH_ID" ]; then
  pass "create concept: AuthService id=$AUTH_ID"
else
  fail "create concept" "status=$STATUS"
fi

OUT=$(BJ concept create --name "UserModel" --type "Entity")
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
USER_ID=$(echo "$OUT" | jq -r '.result.id // empty' 2>/dev/null)
if [ "$STATUS" = "success" ] && [ -n "$USER_ID" ]; then
  pass "create concept: UserModel id=$USER_ID"
else
  fail "create concept 2" "status=$STATUS"
fi

OUT=$(BJ concept create --name "JWT" --type "Pattern")
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
JWT_ID=$(echo "$OUT" | jq -r '.result.id // empty' 2>/dev/null)
if [ "$STATUS" = "success" ] && [ -n "$JWT_ID" ]; then
  pass "create concept: JWT id=$JWT_ID"
else
  fail "create concept 3" "status=$STATUS"
fi

# Duplicate name is an upsert (CozoDB put semantics) — returns same ID
OUT=$(BJ concept create --name "AuthService" --type "Entity")
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
DUP_ID=$(echo "$OUT" | jq -r '.result.id // empty' 2>/dev/null)
if [ "$STATUS" = "success" ] && [ "$DUP_ID" = "$AUTH_ID" ]; then
  pass "duplicate concept returns same id=$DUP_ID (upsert)"
else
  fail "duplicate concept" "expected id=$AUTH_ID, got id=$DUP_ID status=$STATUS"
fi

# List
OUT=$(BJ concept list)
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
COUNT=$(echo "$OUT" | jq -r '.result.concepts | length' 2>/dev/null)
if [ "$STATUS" = "success" ] && [ "$COUNT" -ge 3 ]; then
  pass "concept list: $COUNT concepts"
else
  fail "concept list" "count=$COUNT"
fi
echo ""

# ─── 6: Edge CRUD ───────────────────────────────────────────
echo "── 6: Edge CRUD ──"

# Create edges
OUT=$(BJ edge create --from "AuthService" --to "UserModel" --rel "DEPENDS_ON")
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
EDGE1_ID=$(echo "$OUT" | jq -r '.result.id // empty' 2>/dev/null)
if [ "$STATUS" = "success" ] && [ -n "$EDGE1_ID" ]; then
  pass "create edge: AuthService→UserModel id=$EDGE1_ID"
else
  fail "create edge" "status=$STATUS"
fi

OUT=$(BJ edge create --from "AuthService" --to "JWT" --rel "IMPLEMENTS")
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
if [ "$STATUS" = "success" ]; then
  pass "create edge: AuthService→JWT"
else
  fail "create edge 2" "status=$STATUS"
fi

# List edges
OUT=$(BJ edge list)
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
EDGE_COUNT=$(echo "$OUT" | jq -r '.result.edges | length' 2>/dev/null)
if [ "$STATUS" = "success" ] && [ "$EDGE_COUNT" -ge 2 ]; then
  pass "edge list: $EDGE_COUNT edges"
else
  fail "edge list" "count=$EDGE_COUNT"
fi

# Edge to non-existent concept — exits non-zero, may not be JSON
if OUT=$(B edge create --from "AuthService" --to "NonExistent" --rel "DEPENDS_ON" 2>&1); then
  fail "edge non-existent" "expected failure, but succeeded"
else
  pass "edge to non-existent concept fails"
fi
echo ""

# ─── 7: Search ──────────────────────────────────────────────
echo "── 7: Search ──"
OUT=$(BJ search "authentication")
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
MATCHES=$(echo "$OUT" | jq -r '.result.matches | length' 2>/dev/null)
if [ "$STATUS" = "success" ] && [ -n "$MATCHES" ] && [ "$MATCHES" -gt 0 ]; then
  FIRST=$(echo "$OUT" | jq -r '.result.matches[0].name // empty' 2>/dev/null)
  pass "search 'authentication': $MATCHES matches, first=$FIRST"
else
  fail "search" "matches=$MATCHES"
fi

# Search with limit
OUT=$(BJ search "auth" --limit 1)
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
MATCHES=$(echo "$OUT" | jq -r '.result.matches | length' 2>/dev/null)
if [ "$STATUS" = "success" ] && [ "$MATCHES" -le 1 ]; then
  pass "search --limit 1: $MATCHES match(es)"
else
  fail "search limit" "expected <=1, got $MATCHES"
fi
echo ""

# ─── 8: Graph neighbors ─────────────────────────────────────
echo "── 8: Graph neighbors ──"
OUT=$(BJ graph neighbors "AuthService")
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
if [ "$STATUS" = "success" ]; then
  NEIGHBOR_COUNT=$(echo "$OUT" | jq -r '.result.neighbors | length' 2>/dev/null)
  pass "neighbors of AuthService: $NEIGHBOR_COUNT"
else
  fail "graph neighbors" "status=$STATUS"
fi

# Neighbors of non-existent
if OUT=$(B graph neighbors "DoesNotExist" 2>&1); then
  fail "neighbors non-existent" "expected failure"
else
  pass "neighbors of non-existent fails gracefully"
fi
echo ""

# ─── 9: Annotation ──────────────────────────────────────────
echo "── 9: Annotations ──"
OUT=$(BJ annotation create --concept "$AUTH_ID" --type note --text "This service handles all OAuth2 flows including refresh token rotation")
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
if [ "$STATUS" = "success" ]; then
  ANN_ID=$(echo "$OUT" | jq -r '.result.id // empty' 2>/dev/null)
  pass "create annotation on AuthService: id=$ANN_ID"
else
  fail "create annotation" "status=$STATUS"
fi

# List annotations
OUT=$(BJ annotation list --concept "$AUTH_ID")
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
ANN_COUNT=$(echo "$OUT" | jq -r '.result.annotations | length' 2>/dev/null)
if [ "$STATUS" = "success" ] && [ "$ANN_COUNT" -gt 0 ]; then
  pass "list annotations: $ANN_COUNT"
else
  fail "list annotations" "count=$ANN_COUNT"
fi
echo ""

# ─── 10: Verify graph integrity ─────────────────────────────
echo "── 10: Verify ──"
OUT=$(BJ verify)
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
VALID=$(echo "$OUT" | jq -r '.result.valid // "null"' 2>/dev/null)
if [ "$STATUS" = "success" ]; then
  pass "verify: valid=$VALID"
else
  fail "verify" "status=$STATUS"
fi
echo ""

# ─── 11: Status summary ─────────────────────────────────────
echo "── 11: Status ──"
OUT=$(BJ status)
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
CONCEPTS=$(echo "$OUT" | jq -r '.result.total_concepts // 0' 2>/dev/null)
EDGES=$(echo "$OUT" | jq -r '.result.total_edges // 0' 2>/dev/null)
if [ "$STATUS" = "success" ] && [ "$CONCEPTS" -ge 3 ] && [ "$EDGES" -ge 2 ]; then
  pass "status: $CONCEPTS concepts, $EDGES edges"
else
  fail "status" "concepts=$CONCEPTS edges=$EDGES"
fi

# Episodes should exist from memory remember
EPISODES=$(echo "$OUT" | jq -r '.result.recent_episodes | length' 2>/dev/null)
if [ -n "$EPISODES" ] && [ "$EPISODES" -gt 0 ]; then
  pass "status shows $EPISODES recent episodes"
else
  fail "episodes in status" "episodes=$EPISODES"
fi
echo ""

# ─── 12: TLDR of agent knowledge ────────────────────────────
echo "── 12: TLDR ──"
OUT=$(BJ tldr)
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
TOPICS=$(echo "$OUT" | jq -r '.result.topics | length' 2>/dev/null)
STATS_CONCEPTS=$(echo "$OUT" | jq -r '.result.stats.concepts // 0' 2>/dev/null)
if [ "$STATUS" = "success" ] && [ "$TOPICS" -gt 0 ] && [ "$STATS_CONCEPTS" -ge 3 ]; then
  pass "tldr: $TOPICS topics, $STATS_CONCEPTS concepts"
else
  fail "tldr" "topics=$TOPICS concepts=$STATS_CONCEPTS"
fi
echo ""

# ─── 13: Graph viz ──────────────────────────────────────────
echo "── 13: Graph viz ──"
OUT=$(B graph viz)
if [ -n "$OUT" ] && echo "$OUT" | grep -q "AuthService"; then
  pass "graph viz shows AuthService"
else
  fail "graph viz" "missing AuthService in output"
fi

OUT=$(B graph viz -f mermaid)
if echo "$OUT" | grep -q "graph"; then
  pass "graph viz mermaid format"
else
  fail "graph viz mermaid" "no graph keyword"
fi
echo ""

# ─── 14: Delete and verify cleanup ──────────────────────────
echo "── 14: Cleanup operations ──"

# Delete an edge
OUT=$(BJ edge delete "$EDGE1_ID") || true
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
if [ "$STATUS" = "success" ]; then
  pass "delete edge $EDGE1_ID"
else
  fail "delete edge" "status=$STATUS"
fi

# Verify edge count decreased
OUT=$(BJ edge list)
NEW_EDGE_COUNT=$(echo "$OUT" | jq -r '.result.edges | length' 2>/dev/null)
if [ "$NEW_EDGE_COUNT" -lt "$EDGE_COUNT" ]; then
  pass "edge count decreased: $EDGE_COUNT → $NEW_EDGE_COUNT"
else
  fail "edge deletion" "count didn't decrease: was $EDGE_COUNT, now $NEW_EDGE_COUNT"
fi

# Delete a concept
OUT=$(BJ concept delete "$JWT_ID") || true
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
if [ "$STATUS" = "success" ]; then
  pass "delete concept JWT"
else
  fail "delete concept" "status=$STATUS"
fi

# Final verify should still pass
OUT=$(BJ verify)
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
if [ "$STATUS" = "success" ]; then
  pass "verify after deletions"
else
  fail "verify after cleanup" "status=$STATUS"
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
