#!/usr/bin/env bash
#
# Demo 01: Research Workflow
#
# Exercises: init → digest (file + stdin) → status → ask → storm → enhance →
#            tldr → search → graph → error handling → idempotency → subdir
#
# A user researching "event-driven architecture" digests material,
# asks questions, brainstorms, refines, and gets a summary.
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
echo "║  Demo 01: Research Workflow                         ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ─── 1: Init ────────────────────────────────────────────────
echo "── 1: Initialize ──"
OUT=$(B init)
if [ $? -eq 0 ] && echo "$OUT" | grep -q "body.db"; then
  pass "init creates .brane"
else
  fail "init" "no body.db created"
  echo "FATAL: aborting"; exit 1
fi

# Double init should not error
OUT=$(B init 2>&1) || true
if echo "$OUT" | grep -qi "error\|fail\|crash"; then
  fail "double init" "errors on re-init"
else
  pass "double init is safe"
fi
echo ""

# ─── 2: Digest file ─────────────────────────────────────────
echo "── 2: Digest a seed file ──"
cat > "$WORKSPACE/eda-notes.md" << 'SEED'
# Event-Driven Architecture Notes

Event-driven architecture (EDA) is a software design pattern where the flow
of the program is determined by events — messages signaling that something
has happened. Key components:

- **Event Producers** generate events (user actions, sensor outputs, messages)
- **Event Routers** (brokers) filter and push events to consumers
- **Event Consumers** react to events and execute business logic

Common patterns:
1. Pub/Sub — publishers emit events; subscribers receive matching events
2. Event Sourcing — store state changes as a sequence of events
3. CQRS — separate read and write models, connected by events

Trade-offs:
- (+) Loose coupling between services
- (+) Natural scalability — add consumers without changing producers
- (-) Eventual consistency — no immediate read-after-write guarantee
- (-) Debugging complexity — tracing event chains across services
- (-) Event schema evolution is hard to get right
SEED

OUT=$(BJ digest "$WORKSPACE/eda-notes.md")
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
CONCEPTS=$(echo "$OUT" | jq -r '.result.concepts_created // 0' 2>/dev/null)
DIGESTED=$(echo "$OUT" | jq -r '.result.sources_digested // 0' 2>/dev/null)
if [ "$STATUS" = "success" ] && [ "$DIGESTED" -gt 0 ]; then
  pass "digest file: $CONCEPTS concepts from $DIGESTED sources"
else
  fail "digest file" "status=$STATUS digested=$DIGESTED concepts=$CONCEPTS"
fi

# Idempotency: re-digest same file should skip
OUT=$(BJ digest "$WORKSPACE/eda-notes.md")
SKIPPED=$(echo "$OUT" | jq -r '.result.sources_skipped // 0' 2>/dev/null)
if [ "$SKIPPED" -gt 0 ]; then
  pass "re-digest same file is skipped"
else
  fail "idempotency" "expected skip on unchanged file, got skipped=$SKIPPED"
fi
echo ""

# ─── 3: Digest stdin ────────────────────────────────────────
echo "── 3: Digest from stdin ──"
OUT=$(echo "Apache Kafka is the most popular event streaming platform. It provides durable, high-throughput, fault-tolerant pub/sub messaging. Kafka uses topics partitioned across brokers for horizontal scalability. Key concepts: producers, consumers, consumer groups, topics, partitions, offsets." | BJ digest -)
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
DIGESTED=$(echo "$OUT" | jq -r '.result.sources_digested // 0' 2>/dev/null)
if [ "$STATUS" = "success" ] && [ "$DIGESTED" -gt 0 ]; then
  pass "digest stdin: $DIGESTED sources"
else
  fail "digest stdin" "status=$STATUS digested=$DIGESTED"
fi
echo ""

# ─── 4: Error handling ──────────────────────────────────────
echo "── 4: Error handling ──"
OUT=$(BJ digest "/nonexistent/path/foo.md") || true
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
if [ "$STATUS" = "error" ] || echo "$OUT" | grep -qi "not found\|error\|no such"; then
  pass "digest missing file returns error"
else
  fail "error: missing file" "expected error, got status=$STATUS"
fi

OUT=$(echo "" | BJ digest -) || true
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
DIGESTED=$(echo "$OUT" | jq -r '.result.sources_digested // 0' 2>/dev/null)
# Empty stdin should either error or digest 0
if [ "$STATUS" = "error" ] || [ "$DIGESTED" = "0" ]; then
  pass "empty stdin handled gracefully"
else
  fail "error: empty stdin" "status=$STATUS digested=$DIGESTED"
fi
echo ""

# ─── 5: Status ──────────────────────────────────────────────
echo "── 5: Status ──"
OUT=$(BJ status)
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
CONCEPTS=$(echo "$OUT" | jq -r '.result.total_concepts // 0' 2>/dev/null)
EDGES=$(echo "$OUT" | jq -r '.result.total_edges // 0' 2>/dev/null)
if [ "$STATUS" = "success" ] && [ "$CONCEPTS" -gt 0 ]; then
  pass "status: $CONCEPTS concepts, $EDGES edges"
else
  fail "status" "expected concepts>0, got $CONCEPTS"
fi
echo ""

# ─── 6: Ask ─────────────────────────────────────────────────
echo "── 6: Ask a question ──"
OUT=$(BJ ask "What are the trade-offs of event-driven architecture?")
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
ANSWER=$(echo "$OUT" | jq -r '.result.answer // empty' 2>/dev/null)
CONTEXT_USED=$(echo "$OUT" | jq -r '.result.context_concepts // 0' 2>/dev/null)
if [ "$STATUS" = "success" ] && [ -n "$ANSWER" ] && [ "${#ANSWER}" -gt 10 ]; then
  pass "ask: answer ${#ANSWER} chars, context=$CONTEXT_USED concepts"
else
  fail "ask" "status=$STATUS answer_len=${#ANSWER}"
fi
echo ""

# ─── 7: Storm ───────────────────────────────────────────────
echo "── 7: Storm ──"
BEFORE_CONCEPTS=$(BJ status | jq -r '.result.total_concepts // 0' 2>/dev/null)
OUT=$(BJ storm "event-driven microservices")
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
NEW_CONCEPTS=$(echo "$OUT" | jq -r '.result.concepts_created // 0' 2>/dev/null)
NEW_EDGES=$(echo "$OUT" | jq -r '.result.edges_created // 0' 2>/dev/null)
if [ "$STATUS" = "success" ]; then
  pass "storm: +$NEW_CONCEPTS concepts, +$NEW_EDGES edges"
else
  fail "storm" "status=$STATUS"
fi
echo ""

# ─── 8: Enhance ─────────────────────────────────────────────
echo "── 8: Enhance ──"
OUT=$(BJ enhance)
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
MERGES=$(echo "$OUT" | jq -r '.result.merges_applied // 0' 2>/dev/null)
E_EDGES=$(echo "$OUT" | jq -r '.result.edges_created // 0' 2>/dev/null)
E_EPISODES=$(echo "$OUT" | jq -r '.result.episodes_created // 0' 2>/dev/null)
if [ "$STATUS" = "success" ]; then
  pass "enhance: $MERGES merges, $E_EDGES edges, $E_EPISODES observations"
else
  fail "enhance" "status=$STATUS"
fi
echo ""

# ─── 9: TLDR ────────────────────────────────────────────────
echo "── 9: TLDR ──"
OUT=$(BJ tldr)
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
TOPICS=$(echo "$OUT" | jq -r '.result.topics | length' 2>/dev/null)
T_CONCEPTS=$(echo "$OUT" | jq -r '.result.stats.concepts // 0' 2>/dev/null)
if [ "$STATUS" = "success" ] && [ "$TOPICS" -gt 0 ]; then
  pass "tldr: $TOPICS topics, $T_CONCEPTS concepts"
else
  fail "tldr" "expected topics>0, got $TOPICS"
fi

# TLDR with focus
OUT=$(BJ tldr --focus "kafka")
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
if [ "$STATUS" = "success" ]; then
  pass "tldr --focus works"
else
  fail "tldr --focus" "status=$STATUS"
fi
echo ""

# ─── 10: Search ─────────────────────────────────────────────
echo "── 10: Search ──"
OUT=$(BJ search "kafka")
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
MATCHES=$(echo "$OUT" | jq -r '.result.matches | length' 2>/dev/null)
if [ "$STATUS" = "success" ] && [ -n "$MATCHES" ] && [ "$MATCHES" -gt 0 ]; then
  pass "search 'kafka': $MATCHES matches"
else
  fail "search" "expected >0 matches, got $MATCHES"
fi

# Search for something that shouldn't match well
OUT=$(BJ search "quantum computing")
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
if [ "$STATUS" = "success" ]; then
  pass "search unrelated term: no crash"
else
  fail "search unrelated" "status=$STATUS"
fi
echo ""

# ─── 11: Graph ──────────────────────────────────────────────
echo "── 11: Graph ──"
OUT=$(BJ graph summary)
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
G_CONCEPTS=$(echo "$OUT" | jq -r '.result.concepts.total // 0' 2>/dev/null)
G_EDGES=$(echo "$OUT" | jq -r '.result.edges.total // 0' 2>/dev/null)
if [ "$STATUS" = "success" ] && [ "$G_CONCEPTS" -gt 0 ]; then
  pass "graph summary: $G_CONCEPTS concepts, $G_EDGES edges"
else
  fail "graph summary" "concepts=$G_CONCEPTS"
fi

# Graph viz
OUT=$(B graph viz)
if [ $? -eq 0 ] && [ -n "$OUT" ]; then
  pass "graph viz produces output"
else
  fail "graph viz" "empty output"
fi
echo ""

# ─── 12: Text output ────────────────────────────────────────
echo "── 12: Text output (human-readable) ──"
OUT=$(B status)
if echo "$OUT" | grep -qiE "(concept|edge|episode)"; then
  pass "status text has knowledge counts"
else
  fail "status text" "missing knowledge counts"
fi

OUT=$(B tldr)
if echo "$OUT" | grep -q "##"; then
  pass "tldr text has topic headings"
else
  fail "tldr text" "no ## headings"
fi

OUT=$(B ask "what is EDA?")
if [ -n "$OUT" ] && [ ${#OUT} -gt 10 ]; then
  pass "ask text output has content"
else
  fail "ask text" "empty or too short"
fi
echo ""

# ─── 13: Subdirectory execution ─────────────────────────────
echo "── 13: Subdirectory execution ──"
mkdir -p "$WORKSPACE/deep/nested/dir"
OUT=$(cd "$WORKSPACE/deep/nested/dir" && BJ status)
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
if [ "$STATUS" = "success" ]; then
  pass "status works from nested subdir"
else
  fail "subdir" "status from deep/nested/dir: $STATUS"
fi
echo ""

# ─── 14: Verify ─────────────────────────────────────────────
echo "── 14: Verify ──"
OUT=$(BJ verify)
STATUS=$(echo "$OUT" | jq -r '.status' 2>/dev/null)
if [ "$STATUS" = "success" ]; then
  pass "verify passes"
else
  fail "verify" "status=$STATUS"
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
