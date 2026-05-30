#!/usr/bin/env bash
#
# seed-policy.sh — load the no-slop policy into brane.
#
# The policy is not hardcoded in the hook. It lives in brane as memories, so
# it's queryable (`brane recall "banned"`), auditable (every word has a source
# and a timestamp), and editable without touching code (`brane remember` a new
# word). This is the determinism Brad wanted: enforcement in a system of record,
# not in a vibe.
#
# Two tiers:
#   banned-word — hard ban. Always rewritten. Almost never the right word.
#   dual-use    — context-aware. Slop in marketing, exact in engineering.
#                 The hook only flags these in a decorative context.
#
# Usage:
#   ./seed-policy.sh              # seeds into ./.brane (run `brane init` first)
#   BRANE_BIN=/path/to/brane ./seed-policy.sh

set -euo pipefail

if   [[ -n "${BRANE_BIN:-}" ]];      then BRANE="$BRANE_BIN"
elif command -v brane &>/dev/null;   then BRANE="brane"
else BRANE="bun run $(cd "$(dirname "$0")/../.." && pwd)/src/cli.ts"
fi

remember() { "$BRANE" remember "$1" --from "no-slop-policy" -t "$2" >/dev/null; }

echo "Seeding no-slop policy into brane…"

# ── Hard bans: virtue-signaling filler and measured stylistic inflation ──────
# These are almost never the right word in the work we actually do.
for w in honestly honest honesty delve tapestry testament meticulous \
         intricate resonate; do
  remember "$w" "banned-word,filler"
done

# ── Dual-use: slop OR exact depending on context ─────────────────────────────
# A substring match can't tell "navigate to src/" (fine) from "navigate the
# landscape" (slop). These are judged SEMANTICALLY at scan time (embed-then-LLM,
# see classify-usage.ts) — never by pattern. We tag them so the policy records
# the distinction.
for w in robust navigate leverage seamless unlock empower elevate; do
  remember "$w" "dual-use,allow-in-engineering"
done

# ── Exemplars: the training signal for the semantic discriminator ────────────
# The classifier embeds the offending sentence and compares it to two centroids
# built from these. They live in brane too — to sharpen the judge, add more
# exemplars; no code change. Decorative = vague/promotional. Technical = precise.
exemplar() { "$BRANE" remember "$1" --from "no-slop-exemplar" -t "$2" >/dev/null; }

for s in \
  "We navigate the evolving landscape of modern solutions." \
  "A robust, seamless platform that empowers teams to unlock their potential." \
  "Leverage cutting-edge synergies to elevate your brand journey." \
  "This holistic ecosystem resonates across the entire paradigm." \
  "Unlock seamless value in a rapidly shifting marketplace."; do
  exemplar "$s" "exemplar,decorative"
done

for s in \
  "Navigate to src/handlers and re-run the failing test." \
  "The retry logic is robust to transient network errors." \
  "We leverage the existing HNSW index to avoid a full table scan." \
  "Empower the worker pool with two extra threads under load." \
  "Elevate the log level to debug before reproducing the crash."; do
  exemplar "$s" "exemplar,technical"
done

echo "Done. Inspect the policy:"
echo "  $BRANE recall \"banned filler word\""
echo "  $BRANE admin memory list"
