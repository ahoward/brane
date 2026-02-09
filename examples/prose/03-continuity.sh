#!/usr/bin/env bash
#
# 03-continuity.sh — if I kill this character, what breaks?
#
# Every novelist has killed a character and then found references
# to them 6 chapters later. Brane tells you what breaks BEFORE
# you make the change.
#

set -e
source "$(dirname "$0")/../lib/common.sh"
setup_workspace

echo "═══════════════════════════════════════════════════════════════"
echo "  CONTINUITY: if I remove this character, what breaks?"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# ─────────────────────────────────────────────────────────────────
# initialize
# ─────────────────────────────────────────────────────────────────

brane_q init > /dev/null

# ─────────────────────────────────────────────────────────────────
# a spy thriller — Handler Diaz is the connective tissue
# ─────────────────────────────────────────────────────────────────

echo "--- the setup: a spy thriller ---"
echo ""

brane_q concept create --name "Agent Cole" --type Character > /dev/null        # 1
brane_q concept create --name "Handler Diaz" --type Character > /dev/null      # 2
brane_q concept create --name "Mole (unknown)" --type Character > /dev/null    # 3
brane_q concept create --name "Director Yuen" --type Character > /dev/null     # 4
brane_q concept create --name "Operation Nightfall" --type Mission > /dev/null # 5
brane_q concept create --name "The Dead Drop" --type Event > /dev/null         # 6
brane_q concept create --name "The Interrogation" --type Event > /dev/null     # 7
brane_q concept create --name "The Betrayal" --type Event > /dev/null          # 8
brane_q concept create --name "Safe House Berlin" --type Location > /dev/null  # 9
brane_q concept create --name "CIA Headquarters" --type Location > /dev/null   # 10

echo "  10 concepts. 4 characters, 3 events, 1 mission, 2 locations."
echo ""

# Cole is the protagonist — well connected
brane_q edge create --from "Agent Cole" --to "Operation Nightfall" --rel ASSIGNED_TO > /dev/null
brane_q edge create --from "Agent Cole" --to "Safe House Berlin" --rel OPERATES_FROM > /dev/null
brane_q edge create --from "Agent Cole" --to "The Dead Drop" --rel PARTICIPATES_IN > /dev/null
brane_q edge create --from "Agent Cole" --to "The Interrogation" --rel CONDUCTS > /dev/null

# Diaz is the hub — she connects everything
brane_q edge create --from "Handler Diaz" --to "Agent Cole" --rel HANDLES > /dev/null
brane_q edge create --from "Handler Diaz" --to "Operation Nightfall" --rel OVERSEES > /dev/null
brane_q edge create --from "Handler Diaz" --to "The Dead Drop" --rel ARRANGES > /dev/null
brane_q edge create --from "Handler Diaz" --to "CIA Headquarters" --rel BASED_AT > /dev/null

# The Mole's only connection is through Diaz
brane_q edge create --from "Mole (unknown)" --to "Handler Diaz" --rel MANIPULATES > /dev/null

# Director connects only through Diaz
brane_q edge create --from "Director Yuen" --to "Handler Diaz" --rel COMMANDS > /dev/null

# The Betrayal connects to The Interrogation
brane_q edge create --from "The Betrayal" --to "The Interrogation" --rel LEADS_TO > /dev/null

echo "  11 edges. The web is set."
echo ""

# ─────────────────────────────────────────────────────────────────
# verify: everything is connected right now
# ─────────────────────────────────────────────────────────────────

echo "--- verify: is the story structurally sound? ---"
echo ""

brane verify

echo "  Clean. Every concept connects to something."
echo ""

# ─────────────────────────────────────────────────────────────────
# THE QUESTION: your editor says "cut Handler Diaz"
#
# don't touch a page yet. ask brane what she's connected to.
# ─────────────────────────────────────────────────────────────────

echo "═══════════════════════════════════════════════════════════════"
echo "  Your editor says: 'Cut Handler Diaz. She's boring.'"
echo ""
echo "  Before you touch a single page, ask brane:"
echo "═══════════════════════════════════════════════════════════════"
echo ""

brane graph neighbors "Handler Diaz"

echo "  6 connections. She's not boring — she's load-bearing."
echo ""

# ─────────────────────────────────────────────────────────────────
# compare: who else in the story is this connected?
# ─────────────────────────────────────────────────────────────────

echo "--- for comparison, check other characters ---"
echo ""

brane graph neighbors "Mole (unknown)"

brane graph neighbors "Director Yuen"

echo ""
echo "  The Mole has 1 connection — to Diaz."
echo "  Director Yuen has 1 connection — to Diaz."
echo "  CIA Headquarters has 1 connection — from Diaz."
echo ""
echo "  If you cut Diaz:"
echo "    → The Mole's only link to the story is severed"
echo "    → Director Yuen floats free with no narrative purpose"
echo "    → CIA Headquarters becomes set dressing for no scene"
echo "    → The twist (Mole manipulates Diaz) collapses entirely"
echo ""
echo "  You thought you were cutting one 'boring' character."
echo "  You're actually pulling 3 threads and unraveling a twist."
echo ""
echo "  You didn't have to reread 300 pages to see this."
echo "  The graph already knew."
echo ""
