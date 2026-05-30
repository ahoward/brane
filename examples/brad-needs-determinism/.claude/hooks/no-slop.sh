#!/usr/bin/env bash
#
# no-slop.sh — a Stop hook that gives a "no filler words" rule actual teeth.
#
# The problem (from Brad Feld, via adventuresinclaude.ai):
#   A soft instruction — "don't say 'honestly'" — leaks. The model agrees,
#   then says it anyway three turns later. The rule has no enforcement.
#
# The fix:
#   A Stop hook fires when Claude finishes a turn. It reads Claude's last
#   message and scans for banned words. If one slipped through, the hook
#   BLOCKS the stop and feeds back an instruction to rewrite. Claude does
#   not get to argue. Deterministic.
#
# The hard part (the reason this isn't a one-liner):
#   "robust", "navigate", "leverage" are slop in marketing and EXACT in
#   engineering. "navigate to the directory" is correct; "navigate the
#   landscape" is slop. A plain substring match cannot tell them apart, so
#   banning them outright would block the real work.
#
#   So the policy has two tiers:
#     - HARD ban   (tag: banned-word) → always rewrite. "honestly", "delve".
#     - DUAL-USE   (tag: dual-use)    → only flag in a slop context, judged
#                                       by nearby trigger words. Otherwise
#                                       the word earns its keep, untouched.
#
# The policy itself lives in brane — the agent's memory. Each banned word is
# a memory tagged banned-word or dual-use. To change the policy you don't edit
# this script; you `brane remember` a new word. The rule is queryable and
# auditable, not hardcoded.
#
# Wiring (.claude/settings.json):
#   { "hooks": { "Stop": [ { "matcher": "",
#       "hooks": [ { "type": "command", "command": ".claude/hooks/no-slop.sh" } ] } ] } }
#

set -euo pipefail

# ── Read the hook payload from stdin ─────────────────────────────────────────
# Claude Code passes a JSON object: { transcript_path, stop_hook_active, ... }
INPUT=$(cat)

# ── Loop guard ───────────────────────────────────────────────────────────────
# If we're already inside a Stop-hook-triggered continuation, don't block again.
# Without this, a word the model refuses to drop would loop until the 8x cap.
if [[ "$(echo "$INPUT" | jq -r '.stop_hook_active // false')" == "true" ]]; then
  exit 0
fi

TRANSCRIPT=$(echo "$INPUT" | jq -r '.transcript_path // empty')
[[ -z "$TRANSCRIPT" || ! -f "$TRANSCRIPT" ]] && exit 0

# ── Pull Claude's last assistant text message from the transcript ────────────
# The transcript is JSONL. Each line has .type and .message (an Anthropic
# message object). We want the last assistant turn's concatenated text blocks.
LAST_MSG=$(
  jq -rs '
    map(select(.type == "assistant" and (.message.content | type == "array")))
    | last
    | .message.content[]? | select(.type == "text") | .text
  ' "$TRANSCRIPT" 2>/dev/null || true
)
[[ -z "$LAST_MSG" ]] && exit 0

# Lowercase copy for matching (policy match is case-insensitive).
LOWER_MSG=$(printf '%s' "$LAST_MSG" | tr '[:upper:]' '[:lower:]')

# ── Fetch the ban policy from brane ──────────────────────────────────────────
# Resolve the brane binary the same way the examples do.
if   [[ -n "${BRANE_BIN:-}" ]];                 then BRANE="$BRANE_BIN"
elif command -v brane &>/dev/null;              then BRANE="brane"
else BRANE="bun run $(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/../../src/cli.ts"
fi

# `brane admin memory list --json` enumerates the whole policy. Each memory's
# observation is a word; its tags say how strict to be.
POLICY=$("$BRANE" admin memory list --json --limit 500 2>/dev/null || echo '{}')

# Hard-ban words: tagged banned-word. Always rewritten.
mapfile -t HARD < <(echo "$POLICY" | jq -r '
  .result.episodes[]? | select(.tags | index("banned-word")) | .observation | ascii_downcase
' 2>/dev/null || true)

# Dual-use words: tagged dual-use. Flagged only in a slop context.
mapfile -t DUAL < <(echo "$POLICY" | jq -r '
  .result.episodes[]? | select(.tags | index("dual-use")) | .observation | ascii_downcase
' 2>/dev/null || true)

# Context triggers that mark dual-use words as decorative rather than technical.
# "navigate the landscape" → slop; "navigate to src/" → fine. The trigger words
# are the abstract-noun company that slop keeps.
SLOP_CONTEXT='landscape|journey|tapestry|realm|space|world|ecosystem|paradigm|synerg|holistic|seamless|cutting-edge|game-?chang|unlock|empower|elevate|robustly'

# ── Scan ─────────────────────────────────────────────────────────────────────
# Match whole words only, so "honest" never trips on "honestly" inside a longer
# token and "leverage" never trips inside "leverages" unless we mean it to.
word_present() { grep -Eiq "\\b${1}\\b" <<<"$LOWER_MSG"; }

HITS=()

for w in "${HARD[@]}"; do
  [[ -z "$w" ]] && continue
  if word_present "$w"; then
    HITS+=("\"$w\" (banned filler — never the right word here)")
  fi
done

for w in "${DUAL[@]}"; do
  [[ -z "$w" ]] && continue
  word_present "$w" || continue
  # Only a violation if the word sits in a slop context. Otherwise it's earning
  # its keep in real engineering prose — leave it alone.
  if grep -Eiq "\\b${w}\\b[^.]{0,40}(${SLOP_CONTEXT})|(${SLOP_CONTEXT})[^.]{0,40}\\b${w}\\b" <<<"$LOWER_MSG"; then
    HITS+=("\"$w\" (used decoratively, not technically — rephrase or cut)")
  fi
done

# ── Verdict ──────────────────────────────────────────────────────────────────
if [[ ${#HITS[@]} -eq 0 ]]; then
  exit 0   # clean — let the turn end
fi

REASON="Your message tripped the no-slop policy (enforced by a Stop hook, sourced from brane memory):
$(printf '  - %s\n' "${HITS[@]}")
Rewrite the message without these. Do not explain or apologize — just produce the clean version. Dual-use words are fine in genuine technical use; only the decorative uses above need to go."

# Block the stop. exit 0 + this JSON = Claude continues and rewrites.
# `reason` is fed back to Claude as the instruction.
jq -nc --arg reason "$REASON" '{decision: "block", reason: $reason}'
exit 0
