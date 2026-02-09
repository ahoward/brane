#!/usr/bin/env bash
#
# 01-plot-holes.sh — find structural contradictions in a murder mystery
#
# You're 200 pages in. The detective interviews a witness in London.
# But 3 chapters later, that witness was "still in Edinburgh." Plot hole.
# No spellchecker catches this. Brane does.
#

set -e
source "$(dirname "$0")/../lib/common.sh"
setup_workspace

echo "═══════════════════════════════════════════════════════════════"
echo "  PLOT HOLES: a murder mystery with structural contradictions"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# ─────────────────────────────────────────────────────────────────
# initialize
# ─────────────────────────────────────────────────────────────────

brane_q init > /dev/null

# ─────────────────────────────────────────────────────────────────
# the cast
# ─────────────────────────────────────────────────────────────────

echo "--- the cast ---"
echo ""

brane concept create --name "Detective Marsh" --type Character
brane concept create --name "Lord Ashworth" --type Character
brane concept create --name "Lady Ashworth" --type Character
brane concept create --name "The Butler" --type Character

# ─────────────────────────────────────────────────────────────────
# the places
# ─────────────────────────────────────────────────────────────────

echo "--- the places ---"
echo ""

brane concept create --name "Ashworth Manor" --type Location
brane concept create --name "London" --type Location
brane concept create --name "Edinburgh" --type Location

# ─────────────────────────────────────────────────────────────────
# the events
# ─────────────────────────────────────────────────────────────────

echo "--- the events ---"
echo ""

brane concept create --name "The Murder" --type Event
brane concept create --name "The Interview" --type Event
brane concept create --name "The Alibi" --type Event

# ─────────────────────────────────────────────────────────────────
# the relationships — here's where the plot hole hides
# ─────────────────────────────────────────────────────────────────

echo "--- relationships ---"
echo ""

# Lord Ashworth was murdered at the Manor
brane edge create --from "Lord Ashworth" --to "The Murder" --rel VICTIM_OF
brane edge create --from "The Murder" --to "Ashworth Manor" --rel LOCATED_AT

# Detective Marsh investigates
brane edge create --from "Detective Marsh" --to "The Murder" --rel INVESTIGATES

# Chapter 12: Detective interviews The Butler IN LONDON
brane edge create --from "Detective Marsh" --to "The Interview" --rel CONDUCTS
brane edge create --from "The Butler" --to "The Interview" --rel PARTICIPATES_IN
brane edge create --from "The Interview" --to London --rel LOCATED_AT

# Chapter 15: The Butler's alibi says he was IN EDINBURGH at the time
brane edge create --from "The Butler" --to "The Alibi" --rel CLAIMS
brane edge create --from "The Alibi" --to Edinburgh --rel LOCATED_AT

# Chapter 15 ALSO says The Butler "hadn't left Edinburgh in weeks"
# But wait — Chapter 12 has him being interviewed in London!
# The Butler DEPENDS_ON being in Edinburgh for his alibi
# but DEPENDS_ON being in London for the interview to happen
brane edge create --from "The Butler" --to London --rel PRESENT_AT
brane edge create --from "The Butler" --to Edinburgh --rel PRESENT_AT

# ─────────────────────────────────────────────────────────────────
# the graph — see the structure
# ─────────────────────────────────────────────────────────────────

echo "--- the full picture ---"
echo ""

brane concept list
brane edge list

# ─────────────────────────────────────────────────────────────────
# the contradiction — The Butler is in two places at once
# ─────────────────────────────────────────────────────────────────

echo "--- checking: who has contradictory locations? ---"
echo ""

# Walk The Butler's connections
brane graph neighbors "The Butler"

echo ""
echo "  ⚡ The Butler is PRESENT_AT both London"
echo "     AND Edinburgh. But the alibi says he never left"
echo "     Edinburgh. The interview in Chapter 12 is impossible."
echo ""
echo "  A human can't hold 200 pages in their head."
echo "  The graph can."
echo ""

# ─────────────────────────────────────────────────────────────────
# verify — catch the orphan (Lady Ashworth has no connections yet)
# ─────────────────────────────────────────────────────────────────

echo "--- verify: are there dangling characters? ---"
echo ""

brane verify || true

echo ""
echo "  ⚡ Lady Ashworth is an orphan — mentioned but never"
echo "     connected to any event, place, or character."
echo "     Is she a red herring, or did you forget to write her scene?"
echo ""
