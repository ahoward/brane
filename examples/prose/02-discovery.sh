#!/usr/bin/env bash
#
# 02-discovery.sh — find what's connected to what you're working on
#
# You're revising the chapter about the Kingdom of Voss. You know about
# King Aldric. But do you know about the trade agreement with the Dwarven
# Holds that would collapse if Aldric dies? Brane does.
#

set -e
source "$(dirname "$0")/../lib/common.sh"
setup_workspace

echo "═══════════════════════════════════════════════════════════════"
echo "  DISCOVERY: what in my story is connected to what I'm changing?"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# ─────────────────────────────────────────────────────────────────
# initialize
# ─────────────────────────────────────────────────────────────────

brane_q init > /dev/null

# ─────────────────────────────────────────────────────────────────
# build a fantasy world — 15 concepts, densely connected
# ─────────────────────────────────────────────────────────────────

echo "--- building the world ---"
echo ""

# Characters
brane_q concept create --name "King Aldric" --type Character > /dev/null
brane_q concept create --name "Queen Sera" --type Character > /dev/null
brane_q concept create --name "Prince Kael" --type Character > /dev/null
brane_q concept create --name "Thane Borgrim" --type Character > /dev/null
brane_q concept create --name "Witch of the Moor" --type Character > /dev/null

# Factions
brane_q concept create --name "Kingdom of Voss" --type Faction > /dev/null
brane_q concept create --name "Dwarven Holds" --type Faction > /dev/null
brane_q concept create --name "Moorland Coven" --type Faction > /dev/null

# Places
brane_q concept create --name "Castle Voss" --type Location > /dev/null
brane_q concept create --name "The Iron Mines" --type Location > /dev/null
brane_q concept create --name "The Blighted Moor" --type Location > /dev/null

# Plot elements
brane_q concept create --name "The Iron Treaty" --type Agreement > /dev/null
brane_q concept create --name "The Succession Crisis" --type Event > /dev/null
brane_q concept create --name "The Curse" --type Threat > /dev/null
brane_q concept create --name "The Prophecy" --type Artifact > /dev/null

echo "  15 concepts created."
echo ""

# ─────────────────────────────────────────────────────────────────
# wire them up
# ─────────────────────────────────────────────────────────────────

echo "--- connecting the web ---"
echo ""

# Power structure
brane_q edge create --from "King Aldric" --to "Kingdom of Voss" --rel RULES > /dev/null
brane_q edge create --from "Queen Sera" --to "Kingdom of Voss" --rel MEMBER_OF > /dev/null
brane_q edge create --from "Prince Kael" --to "Kingdom of Voss" --rel HEIR_TO > /dev/null
brane_q edge create --from "Thane Borgrim" --to "Dwarven Holds" --rel LEADS > /dev/null
brane_q edge create --from "Witch of the Moor" --to "Moorland Coven" --rel LEADS > /dev/null
brane_q edge create --from "Kingdom of Voss" --to "Castle Voss" --rel BASED_AT > /dev/null
brane_q edge create --from "Dwarven Holds" --to "The Iron Mines" --rel CONTROLS > /dev/null
brane_q edge create --from "Moorland Coven" --to "The Blighted Moor" --rel INHABITS > /dev/null

# The treaty — this is the fragile thread
brane_q edge create --from "The Iron Treaty" --to "Kingdom of Voss" --rel BINDS > /dev/null
brane_q edge create --from "The Iron Treaty" --to "Dwarven Holds" --rel BINDS > /dev/null
brane_q edge create --from "King Aldric" --to "The Iron Treaty" --rel GUARANTOR_OF > /dev/null
brane_q edge create --from "Thane Borgrim" --to "The Iron Treaty" --rel GUARANTOR_OF > /dev/null

# The crisis
brane_q edge create --from "The Succession Crisis" --to "Prince Kael" --rel INVOLVES > /dev/null
brane_q edge create --from "The Succession Crisis" --to "King Aldric" --rel TRIGGERED_BY > /dev/null

# The curse
brane_q edge create --from "The Curse" --to "King Aldric" --rel TARGETS > /dev/null
brane_q edge create --from "Witch of the Moor" --to "The Curse" --rel CASTS > /dev/null

# The prophecy
brane_q edge create --from "The Prophecy" --to "Prince Kael" --rel CONCERNS > /dev/null
brane_q edge create --from "The Prophecy" --to "The Curse" --rel FORETELLS > /dev/null

echo "  19 edges created."
echo ""

# ─────────────────────────────────────────────────────────────────
# THE SCENARIO: you're revising King Aldric's death scene
# what else in the story does this touch?
# ─────────────────────────────────────────────────────────────────

echo "═══════════════════════════════════════════════════════════════"
echo "  You're revising King Aldric's death scene."
echo "  What else does this touch?"
echo "═══════════════════════════════════════════════════════════════"
echo ""

echo "--- search: who/what is connected to 'king'? ---"
echo ""

brane search "king"

echo "--- Aldric's direct connections ---"
echo ""

brane graph neighbors "King Aldric"

echo ""
echo "  ⚡ If Aldric dies:"
echo "     → The Iron Treaty loses a guarantor"
echo "     → The Succession Crisis is triggered"
echo "     → Prince Kael becomes relevant"
echo "     → The Curse on Aldric resolves... or transfers?"
echo ""
echo "  You thought you were editing one scene."
echo "  You're actually touching 4 plot threads."
echo ""

echo "--- search: anything about 'succession'? ---"
echo ""

brane search "succession"

echo "--- search: anything about 'treaty' or 'alliance'? ---"
echo ""

brane search "treaty"

echo ""
echo "  The graph shows you what your memory can't hold:"
echo "  every thread that unravels when you pull one."
echo ""
