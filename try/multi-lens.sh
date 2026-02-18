#!/usr/bin/env bash
#
# try/multi-lens.sh — whitebox spike for multi-lens feature
#
# Proves: init creates state.db, lens create/use/list/delete/migrate work,
# data is isolated between lenses, flat layout backward compat works.
#
# NO MOCKS. Real databases, real everything.
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BRANE="$SCRIPT_DIR/../bin/brane"

# Create temp workspace
WORKDIR=$(mktemp -d)
trap "rm -rf $WORKDIR" EXIT
cd "$WORKDIR"

pass() { echo "  PASS: $1"; }
fail() { echo "  FAIL: $1" >&2; exit 1; }

echo "=== multi-lens whitebox spike ==="
echo "workspace: $WORKDIR"
echo

# -----------------------------------------------
# Test 1: brane init creates state.db
# -----------------------------------------------
echo "--- test 1: brane init creates state.db ---"

$BRANE init
[[ -f .brane/body.db ]] || fail "body.db not created"
[[ -d .brane/mind.db ]] || fail "mind.db not created"
[[ -f .brane/state.db ]] || fail "state.db not created"
pass "brane init creates body.db + mind.db + state.db"

# -----------------------------------------------
# Test 2: brane init is idempotent
# -----------------------------------------------
echo "--- test 2: brane init idempotent ---"

$BRANE init
pass "second init succeeds"

# -----------------------------------------------
# Test 3: default lens is active
# -----------------------------------------------
echo "--- test 3: default lens active ---"

LIST=$($BRANE lens list --json)
ACTIVE=$(echo "$LIST" | jq -r '.result.lenses[] | select(.active == true) | .name')
[[ "$ACTIVE" == "default" ]] || fail "expected active=default, got=$ACTIVE"
pass "default lens is active"

# -----------------------------------------------
# Test 4: create a named lens
# -----------------------------------------------
echo "--- test 4: create lens 'security' ---"

$BRANE lens create security
[[ -f .brane/lens/security/body.db ]] || fail "security body.db not created"
[[ -d .brane/lens/security/mind.db ]] || fail "security mind.db not created"
pass "lens security created with body.db + mind.db"

# -----------------------------------------------
# Test 5: list shows both lenses
# -----------------------------------------------
echo "--- test 5: list shows both lenses ---"

LIST=$($BRANE lens list --json)
COUNT=$(echo "$LIST" | jq '.result.lenses | length')
[[ "$COUNT" == "2" ]] || fail "expected 2 lenses, got=$COUNT"
pass "list shows 2 lenses"

# -----------------------------------------------
# Test 6: switch to security lens
# -----------------------------------------------
echo "--- test 6: switch to security lens ---"

$BRANE lens use security
LIST=$($BRANE lens list --json)
ACTIVE=$(echo "$LIST" | jq -r '.result.lenses[] | select(.active == true) | .name')
[[ "$ACTIVE" == "security" ]] || fail "expected active=security, got=$ACTIVE"
pass "switched to security lens"

# -----------------------------------------------
# Test 7: create concepts in security lens
# -----------------------------------------------
echo "--- test 7: data isolation — create concepts in security lens ---"

echo '{"items": [{"name": "SecAuth", "type": "Entity"}, {"name": "SecToken", "type": "Entity"}]}' | $BRANE /mind/concepts/create-many > /dev/null

SEC_CONCEPTS=$($BRANE /mind/concepts/list '{}' | jq '.result.total')
[[ "$SEC_CONCEPTS" == "2" ]] || fail "expected 2 concepts in security, got=$SEC_CONCEPTS"
pass "2 concepts created in security lens"

# -----------------------------------------------
# Test 8: switch back to default, verify isolation
# -----------------------------------------------
echo "--- test 8: switch back to default, verify isolation ---"

$BRANE lens use default

# Default should have 0 concepts (empty init)
DEF_CONCEPTS=$($BRANE /mind/concepts/list '{}' | jq '.result.total')
[[ "$DEF_CONCEPTS" == "0" ]] || fail "expected 0 concepts in default, got=$DEF_CONCEPTS"
pass "default lens has 0 concepts (isolation confirmed)"

# -----------------------------------------------
# Test 9: switch back to security, data still there
# -----------------------------------------------
echo "--- test 9: security lens data persisted ---"

$BRANE lens use security
SEC_CONCEPTS=$($BRANE /mind/concepts/list '{}' | jq '.result.total')
[[ "$SEC_CONCEPTS" == "2" ]] || fail "expected 2 concepts in security, got=$SEC_CONCEPTS"
pass "security lens data persisted across switches"

# -----------------------------------------------
# Test 10: delete non-active lens
# -----------------------------------------------
echo "--- test 10: create and delete a lens ---"

$BRANE lens create temp-lens
$BRANE lens delete temp-lens
[[ ! -d .brane/lens/temp-lens ]] || fail "temp-lens directory still exists"
pass "lens delete removes directory"

# -----------------------------------------------
# Test 11: cannot delete default
# -----------------------------------------------
echo "--- test 11: cannot delete default lens ---"

DELETE_RESULT=$($BRANE /lens/delete '{"name": "default"}' 2>&1 || true)
echo "$DELETE_RESULT" | jq -e '.errors.name[0].code == "is_default"' > /dev/null || fail "expected is_default error"
pass "cannot delete default lens"

# -----------------------------------------------
# Test 12: cannot delete active lens
# -----------------------------------------------
echo "--- test 12: cannot delete active lens ---"

DELETE_RESULT=$($BRANE /lens/delete '{"name": "security"}' 2>&1 || true)
echo "$DELETE_RESULT" | jq -e '.errors.name[0].code == "is_active"' > /dev/null || fail "expected is_active error"
pass "cannot delete active lens"

# -----------------------------------------------
# Test 13: invalid lens names rejected
# -----------------------------------------------
echo "--- test 13: invalid lens names rejected ---"

CREATE_RESULT=$($BRANE /lens/create '{"name": ".."}' 2>&1 || true)
echo "$CREATE_RESULT" | jq -e '.errors.name[0].code == "invalid"' > /dev/null || fail "expected invalid error for .."
pass "invalid lens name '..' rejected"

CREATE_RESULT=$($BRANE /lens/create '{"name": "create"}' 2>&1 || true)
echo "$CREATE_RESULT" | jq -e '.errors.name[0].code == "invalid"' > /dev/null || fail "expected invalid error for reserved name"
pass "reserved lens name 'create' rejected"

# -----------------------------------------------
# Test 14: flat layout backward compat
# -----------------------------------------------
echo "--- test 14: flat layout backward compat ---"

# Create a fresh workspace with flat layout (no state.db)
cd $(mktemp -d)
mkdir -p .brane
sqlite3 .brane/body.db "PRAGMA journal_mode=WAL; CREATE TABLE files (id INTEGER PRIMARY KEY, url TEXT NOT NULL UNIQUE, hash TEXT NOT NULL, size INTEGER NOT NULL, mtime INTEGER NOT NULL);"
# Create mind.db via brane (needs body.db first)
echo '{}' | $BRANE /mind/init > /dev/null 2>&1

# Remove state.db if it was created
rm -f .brane/state.db

# Verify mind operations work without state.db
RESULT=$(echo '{"items": [{"name": "FlatTest", "type": "Entity"}]}' | $BRANE /mind/concepts/create-many)
echo "$RESULT" | jq -e '.status == "success"' > /dev/null || fail "flat layout concept creation failed"
pass "flat layout works without state.db"

# -----------------------------------------------
# Test 15: lens migrate
# -----------------------------------------------
echo "--- test 15: lens migrate ---"

# Still in flat layout workspace
$BRANE /state/init '{}' > /dev/null 2>&1
$BRANE /lens/migrate '{}'
[[ -f .brane/lens/default/body.db ]] || fail "body.db not migrated"
[[ -d .brane/lens/default/mind.db ]] || fail "mind.db not migrated"
[[ ! -f .brane/body.db ]] || fail "flat body.db still exists after migration"
[[ ! -d .brane/mind.db ]] || fail "flat mind.db still exists after migration"
pass "lens migrate moved files to .brane/lens/default/"

# Verify data survived migration
RESULT=$($BRANE /mind/concepts/list '{}')
echo "$RESULT" | jq -e '.status == "success"' > /dev/null || fail "concepts list failed after migration"
MIGRATED_COUNT=$(echo "$RESULT" | jq '.result.total')
[[ "$MIGRATED_COUNT" == "1" ]] || fail "expected 1 concept after migration, got=$MIGRATED_COUNT"
pass "data survived migration"

echo
echo "=== ALL TESTS PASSED ==="
