#!/usr/bin/env bash
#
# Spike: verify memories.db audit trail works
#
set -euo pipefail

BRANE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BRANE="bun run $BRANE_ROOT/src/cli.ts"

PASS=0
FAIL=0
pass() { PASS=$((PASS + 1)); echo "  PASS: $1"; }
fail() { FAIL=$((FAIL + 1)); echo "  FAIL: $1 ($2)"; }

WORKSPACE=$(mktemp -d)
trap "rm -rf $WORKSPACE" EXIT
cd "$WORKSPACE"

echo "── Init ──"
BRANE_EMBED_MOCK=1 BRANE_LLM_MOCK=1 $BRANE init >/dev/null 2>&1

# Check memories.db was created
if [ -f "$WORKSPACE/.brane/memories.db" ]; then
  pass "memories.db created"
else
  fail "memories.db" "file not found"
  ls -la "$WORKSPACE/.brane/" 2>/dev/null || echo "(no .brane dir)"
fi

# Check schema
TABLES=$(sqlite3 "$WORKSPACE/.brane/memories.db" ".tables" 2>/dev/null)
if echo "$TABLES" | grep -q "memories"; then
  pass "memories table exists"
else
  fail "memories table" "not found: $TABLES"
fi

# Verify the memories module works directly via a quick bun script
echo "── Direct module test ──"
bun -e "
import { open_memories, record_memory, list_memories, tombstone_memory, get_memory, compact } from '$BRANE_ROOT/src/lib/memories.ts';
process.chdir('$WORKSPACE');

const db = open_memories();
if (!db) { console.log('FAIL: could not open'); process.exit(1); }

// Record
const m1 = record_memory(db, { what: 'test memory one', from_source: 'self', tags: ['test'], agent: 'spike' });
const m2 = record_memory(db, { what: 'test memory two', from_source: 'file://test.ts', tags: ['code'], agent: 'spike', graph_id: 42 });
console.log('id1=' + m1.id + ' id2=' + m2.id);

// List
const all = list_memories(db, { agent: 'spike' });
console.log('count=' + all.length);

// Get
const fetched = get_memory(db, m1.id);
console.log('get=' + (fetched ? fetched.what : 'null'));

// Tombstone
const ok = tombstone_memory(db, m1.id);
console.log('tombstoned=' + ok);

// List should exclude tombstoned
const alive = list_memories(db, { agent: 'spike' });
console.log('alive=' + alive.length);

// Compact
const removed = compact(db);
console.log('compacted=' + removed);

db.close();
" 2>&1 | tee /tmp/mem-test-out.txt

# Parse results
OUT=$(cat /tmp/mem-test-out.txt)
if echo "$OUT" | grep -q "^id1=m_"; then pass "record returns ID"; else fail "record" "$OUT"; fi
if echo "$OUT" | grep -q "count=2"; then pass "list returns 2"; else fail "list" "$OUT"; fi
if echo "$OUT" | grep -q "get=test memory one"; then pass "get by ID"; else fail "get" "$OUT"; fi
if echo "$OUT" | grep -q "tombstoned=true"; then pass "tombstone"; else fail "tombstone" "$OUT"; fi
if echo "$OUT" | grep -q "alive=1"; then pass "list excludes tombstoned"; else fail "alive" "$OUT"; fi
if echo "$OUT" | grep -q "compacted=1"; then pass "compact removes tombstoned"; else fail "compact" "$OUT"; fi

# Verify with sqlite3 directly
echo "── SQLite inspection ──"
ROW_COUNT=$(sqlite3 "$WORKSPACE/.brane/memories.db" "SELECT COUNT(*) FROM memories" 2>/dev/null)
if [ "$ROW_COUNT" = "1" ]; then
  pass "sqlite3 shows 1 row after compact"
else
  fail "sqlite3 count" "expected 1, got $ROW_COUNT"
fi

echo ""
echo "═══════════════════════════"
echo "  PASS: $PASS  FAIL: $FAIL"
echo "═══════════════════════════"

[ "$FAIL" -eq 0 ] && exit 0 || exit 1
