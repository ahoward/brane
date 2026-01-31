#!/usr/bin/env bash
#
# 11-prose-philosophy.sh — model philosophical concepts with custom types and relations
#
# Demonstrates: freeform concept types and edge relations for philosophy/humanities
#

set -e
source "$(dirname "$0")/lib/common.sh"
setup_workspace

brane init > /dev/null

# ─────────────────────────────────────────────────────────────────────────────
# thinkers (custom type: Philosopher)
# ─────────────────────────────────────────────────────────────────────────────

run brane concept create --name "Socrates" --type Philosopher
run brane concept create --name "Plato" --type Philosopher
run brane concept create --name "Aristotle" --type Philosopher
run brane concept create --name "Nietzsche" --type Philosopher
run brane concept create --name "Wittgenstein" --type Philosopher

# ─────────────────────────────────────────────────────────────────────────────
# ideas (custom type: Idea)
# ─────────────────────────────────────────────────────────────────────────────

run brane concept create --name "Theory of Forms" --type Idea
run brane concept create --name "Socratic Method" --type Idea
run brane concept create --name "Will to Power" --type Idea
run brane concept create --name "Language Games" --type Idea

# ─────────────────────────────────────────────────────────────────────────────
# movements (custom type: Movement)
# ─────────────────────────────────────────────────────────────────────────────

run brane concept create --name "Existentialism" --type Movement
run brane concept create --name "Logical Positivism" --type Movement
run brane concept create --name "Ancient Greek Philosophy" --type Movement

# ─────────────────────────────────────────────────────────────────────────────
# works (custom type: Work)
# ─────────────────────────────────────────────────────────────────────────────

run brane concept create --name "The Republic" --type Work
run brane concept create --name "Tractatus Logico-Philosophicus" --type Work
run brane concept create --name "Thus Spoke Zarathustra" --type Work

# ─────────────────────────────────────────────────────────────────────────────
# relationships (custom relations)
# ─────────────────────────────────────────────────────────────────────────────

# Plato STUDIED_UNDER Socrates
run brane edge create --from 2 --to 1 --rel STUDIED_UNDER

# Aristotle STUDIED_UNDER Plato
run brane edge create --from 3 --to 2 --rel STUDIED_UNDER

# Plato DEVELOPED Theory of Forms
run brane edge create --from 2 --to 6 --rel DEVELOPED

# Socrates PIONEERED Socratic Method
run brane edge create --from 1 --to 7 --rel PIONEERED

# Nietzsche PROPOSED Will to Power
run brane edge create --from 4 --to 8 --rel PROPOSED

# Wittgenstein INTRODUCED Language Games
run brane edge create --from 5 --to 9 --rel INTRODUCED

# Nietzsche INFLUENCED Existentialism
run brane edge create --from 4 --to 10 --rel INFLUENCED

# Wittgenstein CRITIQUED Logical Positivism
run brane edge create --from 5 --to 11 --rel CRITIQUED

# Ancient Greek Philosophy INCLUDES Socrates, Plato, Aristotle
run brane edge create --from 12 --to 1 --rel INCLUDES
run brane edge create --from 12 --to 2 --rel INCLUDES
run brane edge create --from 12 --to 3 --rel INCLUDES

# Works AUTHORED_BY philosophers
run brane edge create --from 13 --to 2 --rel AUTHORED_BY
run brane edge create --from 14 --to 5 --rel AUTHORED_BY
run brane edge create --from 15 --to 4 --rel AUTHORED_BY

# Theory of Forms PRESENTED_IN The Republic
run brane edge create --from 6 --to 13 --rel PRESENTED_IN

# Will to Power PRESENTED_IN Thus Spoke Zarathustra
run brane edge create --from 8 --to 15 --rel PRESENTED_IN

# ─────────────────────────────────────────────────────────────────────────────
# explore the graph
# ─────────────────────────────────────────────────────────────────────────────

run brane concept list

run brane concept list --type Philosopher

# ID    NAME            TYPE
# 1     Socrates        Philosopher
# 2     Plato           Philosopher
# 3     Aristotle       Philosopher
# 4     Nietzsche       Philosopher
# 5     Wittgenstein    Philosopher

run brane edge list --rel STUDIED_UNDER

# The lineage of teaching
# SOURCE  TARGET  RELATION
# 2       1       STUDIED_UNDER
# 3       2       STUDIED_UNDER

run brane edge list --source 4

# All of Nietzsche's connections
# SOURCE  TARGET  RELATION
# 4       8       PROPOSED
# 4       10      INFLUENCED
