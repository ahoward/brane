#!/usr/bin/env bash
#
# demo.sh — prove the no-slop hook works, end to end, with no live session.
#
# We can't drive a real Claude Code turn from a script, but the Stop hook is
# just a program: JSON in (with a transcript path), JSON out (block or not).
# So we forge transcripts containing specific assistant messages and run the
# hook against them. The hook's stdout is the proof.
#
# REAL embeddings on purpose: the whole point is semantic judgment, and you
# cannot fake that deterministically. model2vec runs locally with no API key,
# so the embed tier is honest and fast (~200ms). Mock embeddings are random
# hashes with no meaning — they'd collapse every case to fail-open, proving
# nothing. So this demo does NOT set BRANE_EMBED_MOCK.
#
# Run:
#   ./demo.sh
#
# What you'll see (verdicts judged by MEANING, not pattern):
#   1. "honestly" (hard ban)              → BLOCKED
#   2. "navigate to src/" (technical)     → ALLOWED  (embed tier: technical)
#   3. "navigate the landscape …" (slop)  → BLOCKED  (embed tier: decorative)
#   4. a clean message                    → ALLOWED

set -euo pipefail
cd "$(dirname "$0")"
HERE="$(pwd)"

# Resolve brane.
if   [[ -n "${BRANE_BIN:-}" ]];      then BRANE="$BRANE_BIN"
elif command -v brane &>/dev/null;   then BRANE="brane"
else BRANE="bun run $(cd ../.. && pwd)/src/cli.ts"; fi

HOOK="$HERE/.claude/hooks/no-slop.sh"

# ── Isolated workspace with its own brane + seeded policy ────────────────────
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
cd "$WORK"

echo "▸ init brane + seed policy (real embeddings)"
$BRANE init >/dev/null 2>&1
BRANE_BIN="$BRANE" "$HERE/seed-policy.sh" >/dev/null
echo "  policy + exemplars loaded ($($BRANE admin memory list --json --limit 500 2>/dev/null | jq '.result.episodes | length') memories)"
echo

run_case() {
  local label="$1" msg="$2"
  local t="$WORK/transcript.jsonl"
  jq -nc --arg text "$msg" \
    '{type:"assistant", message:{role:"assistant", content:[{type:"text", text:$text}]}}' > "$t"
  local payload
  payload=$(jq -nc --arg tp "$t" '{transcript_path:$tp, stop_hook_active:false, hook_event_name:"Stop"}')

  local out
  out=$(echo "$payload" | BRANE_BIN="$BRANE" bash "$HOOK" || true)

  echo "── $label"
  echo "   message: \"$msg\""
  if [[ -z "$out" ]]; then
    echo "   verdict: ✅ ALLOWED (turn ends)"
  else
    echo "   verdict: ⛔ BLOCKED — rewrite forced"
    echo "$out" | jq -r '.reason' | sed 's/^/   │ /'
  fi
  echo
}

run_case "hard ban"            "Honestly, this is the cleanest approach."
run_case "dual-use, technical" "Run the migration, then navigate to src/handlers and re-run the tests."
run_case "dual-use, slop"      "This lets us navigate the evolving landscape of robust, seamless solutions."
run_case "clean"               "The migration adds a CAUSED_BY edge and never mutates the source rows."

echo "The dual-use verdicts above were judged by MEANING (see [judged via: embed])."
echo "When the embed tier is uncertain, the hook escalates to an LLM tiebreak."
echo "Policy + exemplars live in brane. To sharpen the judge, add an exemplar:"
echo "  $BRANE remember \"Harden the parser to be robust against malformed input.\" \\"
echo "    --from no-slop-exemplar -t exemplar,technical"
