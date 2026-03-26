#!/usr/bin/env bash

#
# episodes-spike.sh — whitebox spike for episodic memory (#34)
#
# Tests: create, get, list (with filters), search, delete
# Uses real embeddings (no mocks)
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BRANE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

PASS=0
FAIL=0
TOTAL=0

pass() {
  PASS=$((PASS + 1))
  TOTAL=$((TOTAL + 1))
  echo "  ✓ $1"
}

fail() {
  FAIL=$((FAIL + 1))
  TOTAL=$((TOTAL + 1))
  echo "  ✗ $1"
  echo "    $2"
}

# Run brane CLI in the WORK directory
brane() {
  (cd "$WORK" && bun run "$BRANE_DIR/src/cli.ts" "$@")
}

check_status() {
  local label="$1"
  local output="$2"
  local expected="${3:-success}"
  local status
  status=$(echo "$output" | jq -r '.status // empty')
  if [ "$status" = "$expected" ]; then
    pass "$label"
  else
    fail "$label" "expected status=$expected, got: $(echo "$output" | head -c 200)"
  fi
}

check_field() {
  local label="$1"
  local output="$2"
  local jq_expr="$3"
  local expected="$4"
  local actual
  actual=$(echo "$output" | jq -r "$jq_expr // empty")
  if [ "$actual" = "$expected" ]; then
    pass "$label"
  else
    fail "$label" "expected $expected, got $actual"
  fi
}

check_field_exists() {
  local label="$1"
  local output="$2"
  local jq_expr="$3"
  local actual
  actual=$(echo "$output" | jq -r "$jq_expr // empty")
  if [ -n "$actual" ] && [ "$actual" != "null" ]; then
    pass "$label"
  else
    fail "$label" "field missing or null: $jq_expr"
  fi
}

# -------------------------------------------------------------------
echo "=== Setup ==="
# -------------------------------------------------------------------

WORK=$(mktemp -d)
echo "  workdir: $WORK"

# Init
brane /body/init > /dev/null 2>&1
INIT_OUT=$(brane /mind/init)
check_status "mind init" "$INIT_OUT"
check_field "schema version 1.8.0" "$INIT_OUT" '.result.schema_version' '1.8.0'

# -------------------------------------------------------------------
echo ""
echo "=== US1: Create + Get ==="
# -------------------------------------------------------------------

CREATE1=$(brane /mind/episodes/create '{
  "agent_id": "claude-code",
  "observation": "User prefers snake_case naming conventions",
  "context": "reviewing PR #42",
  "outcome": "applied snake_case to all new variables",
  "tags": ["preference", "style"]
}')
check_status "create episode (all fields)" "$CREATE1"
check_field "create returns agent_id" "$CREATE1" '.result.agent_id' 'claude-code'
check_field "create returns observation" "$CREATE1" '.result.observation' 'User prefers snake_case naming conventions'
check_field_exists "create returns id" "$CREATE1" '.result.id'
check_field_exists "create returns timestamp" "$CREATE1" '.result.timestamp'
EP1_ID=$(echo "$CREATE1" | jq -r '.result.id')

CREATE2=$(brane /mind/episodes/create '{
  "agent_id": "test-agent",
  "observation": "Database queries are slow when joining more than 3 tables"
}')
check_status "create episode (minimal)" "$CREATE2"
EP2_ID=$(echo "$CREATE2" | jq -r '.result.id')

CREATE3=$(brane /mind/episodes/create '{
  "agent_id": "claude-code",
  "observation": "Authentication tokens expire after 24 hours",
  "context": "debugging login failures",
  "tags": ["bug", "auth"]
}')
check_status "create episode (third)" "$CREATE3"
EP3_ID=$(echo "$CREATE3" | jq -r '.result.id')

CREATE_ERR=$(brane /mind/episodes/create '{"agent_id": "x"}')
check_status "create missing observation -> error" "$CREATE_ERR" "error"

CREATE_ERR2=$(brane /mind/episodes/create '{"observation": "x"}')
check_status "create missing agent_id -> error" "$CREATE_ERR2" "error"

GET1=$(brane /mind/episodes/get "{\"id\": $EP1_ID}")
check_status "get episode by id" "$GET1"
check_field "get returns correct observation" "$GET1" '.result.observation' 'User prefers snake_case naming conventions'
check_field "get returns context" "$GET1" '.result.context' 'reviewing PR #42'
check_field "get returns outcome" "$GET1" '.result.outcome' 'applied snake_case to all new variables'

TAGS=$(echo "$GET1" | jq -r '.result.tags | length')
if [ "$TAGS" = "2" ]; then
  pass "get returns tags as array (length 2)"
else
  fail "get returns tags as array" "expected length 2, got $TAGS"
fi

GET_ERR=$(brane /mind/episodes/get '{"id": 9999}')
check_status "get non-existent -> error" "$GET_ERR" "error"

# -------------------------------------------------------------------
echo ""
echo "=== US2: List + Filter ==="
# -------------------------------------------------------------------

LIST_ALL=$(brane /mind/episodes/list '{}')
check_status "list all episodes" "$LIST_ALL"
LIST_TOTAL=$(echo "$LIST_ALL" | jq -r '.result.total')
if [ "$LIST_TOTAL" -ge 3 ]; then
  pass "list returns >= 3 episodes"
else
  fail "list total" "expected >= 3, got $LIST_TOTAL"
fi

LIST_CLAUDE=$(brane /mind/episodes/list '{"agent_id": "claude-code"}')
check_status "list by agent_id" "$LIST_CLAUDE"
LIST_CLAUDE_N=$(echo "$LIST_CLAUDE" | jq -r '.result.total')
if [ "$LIST_CLAUDE_N" -ge 2 ]; then
  pass "list by agent_id returns >= 2"
else
  fail "list by agent_id count" "expected >= 2, got $LIST_CLAUDE_N"
fi

LIST_TAG=$(brane /mind/episodes/list '{"tag": "auth"}')
check_status "list by tag" "$LIST_TAG"
LIST_TAG_N=$(echo "$LIST_TAG" | jq -r '.result.total')
if [ "$LIST_TAG_N" -ge 1 ]; then
  pass "list by tag returns >= 1"
else
  fail "list by tag count" "expected >= 1, got $LIST_TAG_N"
fi

LIST_LIM=$(brane /mind/episodes/list '{"limit": 1}')
check_status "list with limit" "$LIST_LIM"
check_field "list with limit=1 returns 1" "$LIST_LIM" '.result.total' '1'

# -------------------------------------------------------------------
echo ""
echo "=== US3: Semantic Search ==="
# -------------------------------------------------------------------

SEARCH1=$(brane /mind/episodes/search '{"query": "naming conventions"}')
check_status "search naming conventions" "$SEARCH1"
SEARCH1_N=$(echo "$SEARCH1" | jq -r '.result.matches | length')
if [ "$SEARCH1_N" -ge 1 ]; then
  pass "search returns matches"
else
  fail "search matches" "expected >= 1, got $SEARCH1_N"
fi

SEARCH2=$(brane /mind/episodes/search '{"query": "database performance", "agent_id": "test-agent"}')
check_status "search with agent_id filter" "$SEARCH2"

SCORE=$(echo "$SEARCH1" | jq -r '.result.matches[0].score // empty')
if [ -n "$SCORE" ]; then
  pass "search results have scores"
else
  fail "search scores" "missing score field"
fi

SEARCH_ERR=$(brane /mind/episodes/search '{"limit": 5}')
check_status "search missing query -> error" "$SEARCH_ERR" "error"

# -------------------------------------------------------------------
echo ""
echo "=== US4: Delete ==="
# -------------------------------------------------------------------

DEL=$(brane /mind/episodes/delete "{\"id\": $EP2_ID}")
check_status "delete episode" "$DEL"
check_field "delete returns id" "$DEL" '.result.id' "$EP2_ID"

GET_DEL=$(brane /mind/episodes/get "{\"id\": $EP2_ID}")
check_status "get after delete -> error" "$GET_DEL" "error"

DEL_ERR=$(brane /mind/episodes/delete '{"id": 9999}')
check_status "delete non-existent -> error" "$DEL_ERR" "error"

DEL_ERR2=$(brane /mind/episodes/delete '{}')
check_status "delete missing id -> error" "$DEL_ERR2" "error"

# -------------------------------------------------------------------
echo ""
echo "=== Migration Test ==="
# -------------------------------------------------------------------

SAVE_WORK="$WORK"
WORK=$(mktemp -d)
brane /body/init > /dev/null 2>&1
MINIT=$(brane /mind/init)
check_field "fresh init creates v1.8.0" "$MINIT" '.result.schema_version' '1.8.0'

FRESH_EP=$(brane /mind/episodes/create '{"agent_id": "migrate-test", "observation": "migration works"}')
check_status "episodes work on fresh db" "$FRESH_EP"

rm -rf "$WORK"
WORK="$SAVE_WORK"

# -------------------------------------------------------------------
echo ""
echo "=== Results ==="
# -------------------------------------------------------------------

echo ""
echo "  $PASS passed, $FAIL failed, $TOTAL total"

rm -rf "$WORK"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi

echo ""
echo "  all tests passed!"
