#!/usr/bin/env bash
#
# 09-prose-novel.sh — model a novel's structure with custom types and relations
#
# Demonstrates: freeform concept types and edge relations for creative writing
#

set -e
source "$(dirname "$0")/lib/common.sh"
setup_workspace

brane_q init > /dev/null

# ─────────────────────────────────────────────────────────────────────────────
# characters (custom type: Character)
# ─────────────────────────────────────────────────────────────────────────────

brane concept create --name "Hamlet" --type Character
brane concept create --name "Claudius" --type Character
brane concept create --name "Ophelia" --type Character
brane concept create --name "Gertrude" --type Character

# ─────────────────────────────────────────────────────────────────────────────
# settings (custom type: Location)
# ─────────────────────────────────────────────────────────────────────────────

brane concept create --name "Elsinore Castle" --type Location
brane concept create --name "The Ramparts" --type Location

# ─────────────────────────────────────────────────────────────────────────────
# themes (custom type: Theme)
# ─────────────────────────────────────────────────────────────────────────────

brane concept create --name "Revenge" --type Theme
brane concept create --name "Madness" --type Theme
brane concept create --name "Betrayal" --type Theme

# ─────────────────────────────────────────────────────────────────────────────
# relationships (custom relations)
# ─────────────────────────────────────────────────────────────────────────────

# Hamlet HATES Claudius (for killing his father)
brane edge create --from Hamlet --to Claudius --rel HATES

# Hamlet LOVES Ophelia
brane edge create --from Hamlet --to Ophelia --rel LOVES

# Claudius MARRIED Gertrude
brane edge create --from Claudius --to Gertrude --rel MARRIED

# Hamlet RESIDES_AT Elsinore Castle
brane edge create --from Hamlet --to "Elsinore Castle" --rel RESIDES_AT

# Theme: Revenge DRIVES Hamlet
brane edge create --from Revenge --to Hamlet --rel DRIVES

# Theme: Madness AFFLICTS Ophelia
brane edge create --from Madness --to Ophelia --rel AFFLICTS

# Theme: Betrayal PERVADES the story (connected to Claudius)
brane edge create --from Betrayal --to Claudius --rel CHARACTERIZES

# ─────────────────────────────────────────────────────────────────────────────
# explore the graph
# ─────────────────────────────────────────────────────────────────────────────

brane concept list

# ID    NAME              TYPE
# 1     Hamlet            Character
# 2     Claudius          Character
# 3     Ophelia           Character
# 4     Gertrude          Character
# 5     Elsinore Castle   Location
# 6     The Ramparts      Location
# 7     Revenge           Theme
# 8     Madness           Theme
# 9     Betrayal          Theme

brane concept list --type Character

# ID    NAME              TYPE
# 1     Hamlet            Character
# 2     Claudius          Character
# 3     Ophelia           Character
# 4     Gertrude          Character

brane edge list --rel LOVES

# SOURCE  TARGET  RELATION
# 1       3       LOVES

brane edge list --from Hamlet

# All of Hamlet's relationships
# SOURCE  TARGET  RELATION
# 1       2       HATES
# 1       3       LOVES
# 1       5       RESIDES_AT
