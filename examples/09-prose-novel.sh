#!/usr/bin/env bash
#
# 09-prose-novel.sh — model a novel's structure with custom types and relations
#
# Demonstrates: freeform concept types and edge relations for creative writing
#

set -e
source "$(dirname "$0")/lib/common.sh"
setup_workspace

brane init > /dev/null

# ─────────────────────────────────────────────────────────────────────────────
# characters (custom type: Character)
# ─────────────────────────────────────────────────────────────────────────────

run brane concept create --name "Hamlet" --type Character
run brane concept create --name "Claudius" --type Character
run brane concept create --name "Ophelia" --type Character
run brane concept create --name "Gertrude" --type Character

# ─────────────────────────────────────────────────────────────────────────────
# settings (custom type: Location)
# ─────────────────────────────────────────────────────────────────────────────

run brane concept create --name "Elsinore Castle" --type Location
run brane concept create --name "The Ramparts" --type Location

# ─────────────────────────────────────────────────────────────────────────────
# themes (custom type: Theme)
# ─────────────────────────────────────────────────────────────────────────────

run brane concept create --name "Revenge" --type Theme
run brane concept create --name "Madness" --type Theme
run brane concept create --name "Betrayal" --type Theme

# ─────────────────────────────────────────────────────────────────────────────
# relationships (custom relations)
# ─────────────────────────────────────────────────────────────────────────────

# Hamlet HATES Claudius (for killing his father)
run brane edge create --from 1 --to 2 --rel HATES

# Hamlet LOVES Ophelia
run brane edge create --from 1 --to 3 --rel LOVES

# Claudius MARRIED Gertrude
run brane edge create --from 2 --to 4 --rel MARRIED

# Hamlet RESIDES_AT Elsinore Castle
run brane edge create --from 1 --to 5 --rel RESIDES_AT

# Theme: Revenge DRIVES Hamlet
run brane edge create --from 7 --to 1 --rel DRIVES

# Theme: Madness AFFLICTS Ophelia
run brane edge create --from 8 --to 3 --rel AFFLICTS

# Theme: Betrayal PERVADES the story (connected to Claudius)
run brane edge create --from 9 --to 2 --rel CHARACTERIZES

# ─────────────────────────────────────────────────────────────────────────────
# explore the graph
# ─────────────────────────────────────────────────────────────────────────────

run brane concept list

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

run brane concept list --type Character

# ID    NAME              TYPE
# 1     Hamlet            Character
# 2     Claudius          Character
# 3     Ophelia           Character
# 4     Gertrude          Character

run brane edge list --rel LOVES

# SOURCE  TARGET  RELATION
# 1       3       LOVES

run brane edge list --source 1

# All of Hamlet's relationships
# SOURCE  TARGET  RELATION
# 1       2       HATES
# 1       3       LOVES
# 1       5       RESIDES_AT
