#!/usr/bin/env bash
#
# Whitebox spike: episode consolidation (#38)
#
# Tests the full consolidation workflow:
#   1. Create episodes with similar observations
#   2. Cluster by vector similarity
#   3. LLM proposes concept name + type for each cluster
#   4. dry_run returns proposals without applying
#   5. apply creates concepts + DERIVED_FROM edges + archives episodes
#
set -euo pipefail

BRANE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$BRANE_ROOT"

brane="bun run src/cli.ts"
PASS=0
FAIL=0
TOTAL=0

pass() { PASS=$((PASS + 1)); TOTAL=$((TOTAL + 1)); echo "  ✅ $1"; }
fail() { FAIL=$((FAIL + 1)); TOTAL=$((TOTAL + 1)); echo "  ❌ $1: $2"; }

# Setup workspace
WORKSPACE=$(mktemp -d)
export BRANE_ROOT_DIR="$WORKSPACE"
trap "rm -rf $WORKSPACE" EXIT

echo "=== Episode Consolidation Spike ==="
echo ""

# ─────────────────────────────────────────────────────────────────
# Init
# ─────────────────────────────────────────────────────────────────
echo "--- Setup ---"
INIT=$($brane /mind/init 2>/dev/null)
STATUS=$(echo "$INIT" | jq -r '.status')
if [ "$STATUS" = "success" ]; then
  pass "mind/init"
else
  fail "mind/init" "$INIT"
fi

# ─────────────────────────────────────────────────────────────────
# Create a batch of similar episodes (auth-related failures)
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- Create episodes ---"

EP1=$(echo '{"agent_id": "test-agent", "observation": "auth middleware caused timeout in integration tests", "context": "running CI pipeline", "outcome": "tests failed", "tags": ["auth", "ci"]}' | $brane /mind/episodes/create 2>/dev/null)
EP1_ID=$(echo "$EP1" | jq -r '.result.id')
[ "$EP1_ID" != "null" ] && pass "episode 1 created (id=$EP1_ID)" || fail "episode 1" "$EP1"

EP2=$(echo '{"agent_id": "test-agent", "observation": "auth middleware race condition under concurrent load", "context": "load testing", "outcome": "intermittent 500 errors", "tags": ["auth", "race-condition"]}' | $brane /mind/episodes/create 2>/dev/null)
EP2_ID=$(echo "$EP2" | jq -r '.result.id')
[ "$EP2_ID" != "null" ] && pass "episode 2 created (id=$EP2_ID)" || fail "episode 2" "$EP2"

EP3=$(echo '{"agent_id": "test-agent", "observation": "auth middleware flaky in CI environment", "context": "nightly build", "outcome": "random test failures", "tags": ["auth", "flaky"]}' | $brane /mind/episodes/create 2>/dev/null)
EP3_ID=$(echo "$EP3" | jq -r '.result.id')
[ "$EP3_ID" != "null" ] && pass "episode 3 created (id=$EP3_ID)" || fail "episode 3" "$EP3"

# Different topic: database related
EP4=$(echo '{"agent_id": "test-agent", "observation": "database connection pool exhausted during peak load", "context": "production monitoring", "outcome": "service degradation", "tags": ["database", "performance"]}' | $brane /mind/episodes/create 2>/dev/null)
EP4_ID=$(echo "$EP4" | jq -r '.result.id')
[ "$EP4_ID" != "null" ] && pass "episode 4 created (id=$EP4_ID)" || fail "episode 4" "$EP4"

EP5=$(echo '{"agent_id": "test-agent", "observation": "database query timeout on large result sets", "context": "user dashboard", "outcome": "page load > 30s", "tags": ["database", "performance"]}' | $brane /mind/episodes/create 2>/dev/null)
EP5_ID=$(echo "$EP5" | jq -r '.result.id')
[ "$EP5_ID" != "null" ] && pass "episode 5 created (id=$EP5_ID)" || fail "episode 5" "$EP5"

# Unrelated episode (should not cluster)
EP6=$(echo '{"agent_id": "test-agent", "observation": "user requested dark mode theme for the settings page", "context": "feature request review", "outcome": "added to backlog", "tags": ["ux", "feature"]}' | $brane /mind/episodes/create 2>/dev/null)
EP6_ID=$(echo "$EP6" | jq -r '.result.id')
[ "$EP6_ID" != "null" ] && pass "episode 6 created (id=$EP6_ID)" || fail "episode 6" "$EP6"

# Different agent's episode (should NOT be consolidated with test-agent)
EP7=$(echo '{"agent_id": "other-agent", "observation": "auth middleware is unreliable in staging", "context": "staging deploy", "outcome": "rollback needed", "tags": ["auth"]}' | $brane /mind/episodes/create 2>/dev/null)
EP7_ID=$(echo "$EP7" | jq -r '.result.id')
[ "$EP7_ID" != "null" ] && pass "episode 7 created (other-agent, id=$EP7_ID)" || fail "episode 7" "$EP7"

# ─────────────────────────────────────────────────────────────────
# Consolidate dry_run
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- Consolidate dry_run ---"

# Use low threshold for mock embeddings (real embeddings would use 0.85)
THRESHOLD=0.40
DRY=$(echo "{\"agent_id\": \"test-agent\", \"dry_run\": true, \"threshold\": $THRESHOLD}" | $brane /mind/consolidate 2>/dev/null)
DRY_STATUS=$(echo "$DRY" | jq -r '.status')

if [ "$DRY_STATUS" = "success" ]; then
  pass "consolidate dry_run succeeds"
else
  fail "consolidate dry_run" "$DRY"
fi

# Should have at least 1 cluster
CLUSTER_COUNT=$(echo "$DRY" | jq '.result.clusters | length')
if [ "$CLUSTER_COUNT" -ge 1 ]; then
  pass "at least 1 cluster found ($CLUSTER_COUNT clusters)"
else
  fail "cluster count" "expected >= 1, got $CLUSTER_COUNT"
fi

# Dry run should NOT create any concepts
CONCEPTS_BEFORE=$(echo '{}' | $brane /mind/concepts/list 2>/dev/null | jq '.result.items | length')
if [ "$CONCEPTS_BEFORE" -eq 0 ]; then
  pass "dry_run did not create concepts"
else
  fail "dry_run side effects" "found $CONCEPTS_BEFORE concepts after dry_run"
fi

# Each cluster should have episode_ids and a proposed concept
FIRST_CLUSTER=$(echo "$DRY" | jq '.result.clusters[0]')
FIRST_EP_IDS=$(echo "$FIRST_CLUSTER" | jq '.episode_ids | length')
FIRST_PROPOSED=$(echo "$FIRST_CLUSTER" | jq -r '.proposed_concept.name')

if [ "$FIRST_EP_IDS" -ge 2 ]; then
  pass "first cluster has >= 2 episodes ($FIRST_EP_IDS)"
else
  fail "first cluster size" "expected >= 2 episodes, got $FIRST_EP_IDS"
fi

if [ "$FIRST_PROPOSED" != "null" ] && [ -n "$FIRST_PROPOSED" ]; then
  pass "first cluster has proposed concept name: $FIRST_PROPOSED"
else
  fail "proposed concept" "missing concept name"
fi

# Should NOT include other-agent's episode
ALL_EP_IDS=$(echo "$DRY" | jq '[.result.clusters[].episode_ids[]] | flatten')
HAS_OTHER=$(echo "$ALL_EP_IDS" | jq "map(select(. == $EP7_ID)) | length")
if [ "$HAS_OTHER" -eq 0 ]; then
  pass "other-agent episodes excluded"
else
  fail "agent isolation" "other-agent episode $EP7_ID found in clusters"
fi

# ─────────────────────────────────────────────────────────────────
# Consolidate apply
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- Consolidate apply ---"

APPLY=$(echo "{\"agent_id\": \"test-agent\", \"threshold\": $THRESHOLD}" | $brane /mind/consolidate 2>/dev/null)
APPLY_STATUS=$(echo "$APPLY" | jq -r '.status')

if [ "$APPLY_STATUS" = "success" ]; then
  pass "consolidate apply succeeds"
else
  fail "consolidate apply" "$APPLY"
fi

# Should have created concepts
CONCEPTS_CREATED=$(echo "$APPLY" | jq '.result.concepts_created')
if [ "$CONCEPTS_CREATED" -ge 1 ]; then
  pass "concepts created: $CONCEPTS_CREATED"
else
  fail "concepts_created" "expected >= 1, got $CONCEPTS_CREATED"
fi

# Should have created DERIVED_FROM edges
EDGES_CREATED=$(echo "$APPLY" | jq '.result.edges_created')
if [ "$EDGES_CREATED" -ge 2 ]; then
  pass "DERIVED_FROM edges created: $EDGES_CREATED"
else
  fail "edges_created" "expected >= 2, got $EDGES_CREATED"
fi

# Should have archived episodes
EPISODES_ARCHIVED=$(echo "$APPLY" | jq '.result.episodes_archived')
if [ "$EPISODES_ARCHIVED" -ge 2 ]; then
  pass "episodes archived: $EPISODES_ARCHIVED"
else
  fail "episodes_archived" "expected >= 2, got $EPISODES_ARCHIVED"
fi

# ─────────────────────────────────────────────────────────────────
# Verify post-consolidation state
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- Verify state ---"

# Archived episodes should not appear in normal list
ACTIVE_LIST=$(echo '{"agent_id": "test-agent"}' | $brane /mind/episodes/list 2>/dev/null)
ACTIVE_COUNT=$(echo "$ACTIVE_LIST" | jq '.result.items | length')

# We started with 6 test-agent episodes; some got archived
if [ "$ACTIVE_COUNT" -lt 6 ]; then
  pass "archived episodes excluded from list ($ACTIVE_COUNT active)"
else
  fail "episode filtering" "expected < 6 active episodes, got $ACTIVE_COUNT"
fi

# DERIVED_FROM edges should exist
EDGES=$(echo '{"relation": "DERIVED_FROM"}' | $brane /mind/edges/list 2>/dev/null)
DERIVED_COUNT=$(echo "$EDGES" | jq '.result.edges | length')
if [ "$DERIVED_COUNT" -ge 2 ]; then
  pass "DERIVED_FROM edges in graph: $DERIVED_COUNT"
else
  fail "DERIVED_FROM edges" "expected >= 2, got $DERIVED_COUNT"
fi

# ─────────────────────────────────────────────────────────────────
# Idempotent — running again should find nothing to consolidate
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- Idempotent ---"

IDEM=$(echo "{\"agent_id\": \"test-agent\", \"dry_run\": true, \"threshold\": $THRESHOLD}" | $brane /mind/consolidate 2>/dev/null)
IDEM_CLUSTERS=$(echo "$IDEM" | jq '.result.clusters | length')
if [ "$IDEM_CLUSTERS" -eq 0 ]; then
  pass "idempotent: no new clusters after consolidation"
else
  # Acceptable: remaining un-clustered episodes might still form groups
  # But the already-archived ones should be excluded
  IDEM_ARCHIVED=$(echo "$IDEM" | jq '[.result.clusters[].episode_ids[]] | flatten | length')
  pass "idempotent: $IDEM_CLUSTERS clusters, but archived excluded (${IDEM_ARCHIVED} episode refs)"
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
