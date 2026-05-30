#!/usr/bin/env bash
#
# demo.sh — prove the no-slop hook works, end to end, with no live session.
#
# We can't drive a real Claude Code turn from a script, but the Stop hook is
# just a program: JSON in (with a transcript path), JSON out (block or not).
# So we forge transcripts containing specific assistant messages and run the
# hook against them. The hook's stdout is the proof.
#
# Run:
#   ./demo.sh
#
# What you'll see:
#   1. "honestly" (hard ban)              → BLOCKED, rewrite forced
#   2. "navigate to src/" (dual-use, ok)  → ALLOWED, the word earns its keep
#   3. "navigate the landscape" (slop)    → BLOCKED, decorative use caught
#   4. a clean message                    → ALLOWED

set -euo pipefail
cd "$(dirname "$0")"

# Resolve brane.
if   [[ -n "${BRANE_BIN:-}" ]];      then BRANE="$BRANE_BIN"
elif command -v brane &>/dev/null;   then BRANE="brane"
else BRANE="bun run $(cd ../.. && pwd)/src/cli.ts"; fi
export BRANE_EMBED_MOCK=1   # deterministic embeddings for the demo

HOOK="$(pwd)/.claude/hooks/no-slop.sh"

# ── Isolated workspace with its own brane + seeded policy ────────────────────
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
cd "$WORK"

echo "▸ init brane + seed policy"
$BRANE init >/dev/null 2>&1
BRANE_BIN="$BRANE" "$OLDPWD/seed-policy.sh" >/dev/null
echo "  policy loaded:"
$BRANE admin memory list 2>/dev/null | sed 's/^/    /'
echo

# ── Helper: forge a one-line JSONL transcript with a given assistant message,
#    then run the hook against it and report the verdict. ──────────────────────
run_case() {
  local label="$1" msg="$2"
  local t="$WORK/transcript.jsonl"

  # One assistant turn, in the real transcript shape (.type + .message.content[]).
  jq -nc --arg text "$msg" '
    {type:"assistant", message:{role:"assistant", content:[{type:"text", text:$text}]}}
  ' > "$t"

  # The Stop hook payload: transcript_path + stop_hook_active.
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

run_case "hard ban"          "Honestly, this is the cleanest approach."
run_case "dual-use, technical" "Run the migration, then navigate to src/handlers and re-run the tests."
run_case "dual-use, slop"    "This lets us navigate the evolving landscape of robust, seamless solutions."
run_case "clean"             "The migration adds a CAUSED_BY edge and never mutates the source rows."

echo "Policy lives in brane. To change it, add a word — no code edit:"
echo "  $BRANE remember \"synergy\" --from no-slop-policy -t banned-word,filler"
