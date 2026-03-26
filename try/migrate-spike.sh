#!/usr/bin/env bash
#
# migrate-spike.sh - whitebox spike for schema migrations
#
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BRANE="$PROJECT_DIR/bin/brane"

echo "=== schema migration spike ==="
echo ""

# Create temp workspace
TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT
cd "$TMPDIR"

# --- Test 1: No migration needed (current version) ---
echo "--- Test 1: no migration needed on current version ---"
"$BRANE" /body/init > /dev/null 2>&1
BRANE_EMBED_MOCK=1 "$BRANE" /mind/init > /dev/null 2>&1

# Create some data
BRANE_EMBED_MOCK=1 "$BRANE" /mind/concepts/create '{"name": "TestConcept", "type": "Entity"}' > /dev/null 2>&1

# Run a command — should NOT trigger migration
STDERR_OUT=$(BRANE_EMBED_MOCK=1 "$BRANE" /mind/concepts/list '{}' 2>&1 >/dev/null || true)
if echo "$STDERR_OUT" | grep -q "migrating"; then
  echo "FAIL: migration should NOT run on current version"
  echo "stderr: $STDERR_OUT"
else
  echo "PASS: no migration on current version"
fi

# Verify data still intact
RESULT=$(BRANE_EMBED_MOCK=1 "$BRANE" /mind/concepts/list '{}')
if echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['result']['total'] == 1" 2>/dev/null; then
  echo "PASS: data intact after no-migration"
else
  echo "FAIL: data not intact"
  echo "$RESULT"
fi
echo ""

# --- Test 2: Version reported in /mind/init ---
echo "--- Test 2: schema version in init result ---"
INIT_RESULT=$(BRANE_EMBED_MOCK=1 "$BRANE" /mind/init '{}')
if echo "$INIT_RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['result']['schema_version'] == '1.7.0'" 2>/dev/null; then
  echo "PASS: schema version is 1.7.0"
else
  echo "FAIL: unexpected schema version"
  echo "$INIT_RESULT"
fi
echo ""

# --- Test 3: No backup created when no migration needed ---
echo "--- Test 3: no backup when current ---"
BACKUP_COUNT=$(find .brane -name "mind.db.backup.*" 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -eq 0 ]; then
  echo "PASS: no backup files (no migration ran)"
else
  echo "FAIL: unexpected backup files found: $BACKUP_COUNT"
fi
echo ""

# --- Test 4: concepts/list still works (end-to-end through open_mind + migrate) ---
echo "--- Test 4: full handler flow through migrate ---"
RESULT=$(BRANE_EMBED_MOCK=1 "$BRANE" /mind/concepts/list '{}')
if echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['status'] == 'success'" 2>/dev/null; then
  echo "PASS: handler works through migrate() integration"
else
  echo "FAIL: handler broken"
  echo "$RESULT"
fi
echo ""

# --- Test 5: batch create still works ---
echo "--- Test 5: batch create through migrate ---"
RESULT=$(BRANE_EMBED_MOCK=1 "$BRANE" /mind/concepts/create-many '{"items": [{"name": "A", "type": "Entity"}, {"name": "B", "type": "Entity"}]}')
if echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); items=d['result']['items']; assert len(items)==2; assert items[0]['id']!=items[1]['id']" 2>/dev/null; then
  echo "PASS: batch create works with unique IDs"
else
  echo "FAIL: batch create broken"
  echo "$RESULT"
fi
echo ""

# --- Test 6: edge operations still work ---
echo "--- Test 6: edge create through migrate ---"
RESULT=$(BRANE_EMBED_MOCK=1 "$BRANE" /mind/edges/create '{"source": 1, "target": 2, "relation": "DEPENDS_ON"}')
if echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['status'] == 'success'" 2>/dev/null; then
  echo "PASS: edge create works through migrate"
else
  echo "FAIL: edge create broken"
  echo "$RESULT"
fi
echo ""

echo "=== spike complete ==="
