#!/usr/bin/env bash
#
# test.sh — pin the three tiers of the semantic discriminator.
#
# Unlike demo.sh (a narrative), this asserts. Exit 0 = all green.
#   1. embed tier discriminates technical vs decorative (real embeddings)
#   2. LLM tiebreak fires when the embed margin is too small (fake claude CLI)
#   3. fail-open when neither tier can run
#
set -euo pipefail
cd "$(dirname "$0")"

PASS=0; FAIL=0
ok()   { PASS=$((PASS+1)); echo "  PASS: $1"; }
no()   { FAIL=$((FAIL+1)); echo "  FAIL: $1 ($2)"; }

EX='{"decorative":[
  "We navigate the evolving landscape of modern solutions.",
  "A robust, seamless platform that empowers teams to unlock their potential.",
  "Leverage cutting-edge synergies to elevate your brand journey.",
  "This holistic ecosystem resonates across the entire paradigm.",
  "Unlock seamless value in a rapidly shifting marketplace."
],"technical":[
  "Navigate to src/handlers and re-run the failing test.",
  "The retry logic is robust to transient network errors.",
  "We leverage the existing HNSW index to avoid a full table scan.",
  "Empower the worker pool with two extra threads under load.",
  "Elevate the log level to debug before reproducing the crash."
]}'

verdict() { jq -r '.verdict'; }
how()     { jq -r '.how'; }

echo "── tier 1: embedding similarity (real embeddings) ──"
T=$(jq -nc --argjson ex "$EX" '{word:"navigate", sentence:"Run the migration, then navigate to src/handlers and re-run the tests.", exemplars:$ex}' | bun classify-usage.ts)
[[ "$(echo "$T" | verdict)" == "technical" && "$(echo "$T" | how)" == "embed" ]] \
  && ok "technical use judged technical via embed" || no "technical use" "$T"

D=$(jq -nc --argjson ex "$EX" '{word:"navigate", sentence:"This lets us navigate the evolving landscape of robust, seamless solutions.", exemplars:$ex}' | bun classify-usage.ts)
[[ "$(echo "$D" | verdict)" == "decorative" && "$(echo "$D" | how)" == "embed" ]] \
  && ok "decorative use judged decorative via embed" || no "decorative use" "$D"

echo "── tier 2: LLM tiebreak on uncertainty (fake claude CLI) ──"
FAKE=$(mktemp)
cat > "$FAKE" <<'EOF'
#!/usr/bin/env bash
cat >/dev/null
echo '{"structured_output":{"verdict":"decorative","reason":"fake judge"}}'
EOF
chmod +x "$FAKE"
L=$(jq -nc --argjson ex "$EX" '{word:"navigate", sentence:"An ambiguous navigate sentence.", exemplars:$ex}' \
  | NOSLOP_MARGIN=0.99 BRANE_LLM_CLI="$FAKE" bun classify-usage.ts)
rm -f "$FAKE"
[[ "$(echo "$L" | how)" == "llm" ]] \
  && ok "uncertain margin escalates to LLM" || no "LLM escalation" "$L"

echo "── tier 3: fail-open when no judge available ──"
F=$(jq -nc --argjson ex "$EX" '{word:"navigate", sentence:"An ambiguous navigate sentence.", exemplars:$ex}' \
  | NOSLOP_MARGIN=0.99 BRANE_LLM_MOCK=1 bun classify-usage.ts)
[[ "$(echo "$F" | verdict)" == "technical" && "$(echo "$F" | how)" == "fail-open" ]] \
  && ok "no judge → allow (fail-open)" || no "fail-open" "$F"

echo ""
echo "═══════════════════════════"
echo "  PASS: $PASS  FAIL: $FAIL"
echo "═══════════════════════════"
[[ "$FAIL" -eq 0 ]]
