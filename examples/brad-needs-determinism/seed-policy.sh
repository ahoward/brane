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
# landscape" (slop). The hook spares these unless they sit next to slop-context
# trigger words. We tag them so the policy itself records the distinction.
for w in robust navigate leverage seamless unlock empower elevate; do
  remember "$w" "dual-use,allow-in-engineering"
done

echo "Done. Inspect the policy:"
echo "  $BRANE recall \"banned filler word\""
echo "  $BRANE admin memory list"
