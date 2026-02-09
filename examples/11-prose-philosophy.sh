#!/usr/bin/env bash
#
# 11-prose-philosophy.sh — model philosophical concepts with custom types and relations
#
# Demonstrates: freeform concept types and edge relations for philosophy/humanities
#

set -e
source "$(dirname "$0")/lib/common.sh"
setup_workspace

brane_q init > /dev/null

# ─────────────────────────────────────────────────────────────────────────────
# thinkers (custom type: Philosopher)
# ─────────────────────────────────────────────────────────────────────────────

brane concept create --name "Socrates" --type Philosopher
brane concept create --name "Plato" --type Philosopher
brane concept create --name "Aristotle" --type Philosopher
brane concept create --name "Nietzsche" --type Philosopher
brane concept create --name "Wittgenstein" --type Philosopher

# ─────────────────────────────────────────────────────────────────────────────
# ideas (custom type: Idea)
# ─────────────────────────────────────────────────────────────────────────────

brane concept create --name "Theory of Forms" --type Idea
brane concept create --name "Socratic Method" --type Idea
brane concept create --name "Will to Power" --type Idea
brane concept create --name "Language Games" --type Idea

# ─────────────────────────────────────────────────────────────────────────────
# movements (custom type: Movement)
# ─────────────────────────────────────────────────────────────────────────────

brane concept create --name "Existentialism" --type Movement
brane concept create --name "Logical Positivism" --type Movement
brane concept create --name "Ancient Greek Philosophy" --type Movement

# ─────────────────────────────────────────────────────────────────────────────
# works (custom type: Work)
# ─────────────────────────────────────────────────────────────────────────────

brane concept create --name "The Republic" --type Work
brane concept create --name "Tractatus Logico-Philosophicus" --type Work
brane concept create --name "Thus Spoke Zarathustra" --type Work

# ─────────────────────────────────────────────────────────────────────────────
# relationships (custom relations)
# ─────────────────────────────────────────────────────────────────────────────

# Plato STUDIED_UNDER Socrates
brane edge create --from Plato --to Socrates --rel STUDIED_UNDER

# Aristotle STUDIED_UNDER Plato
brane edge create --from Aristotle --to Plato --rel STUDIED_UNDER

# Plato DEVELOPED Theory of Forms
brane edge create --from Plato --to "Theory of Forms" --rel DEVELOPED

# Socrates PIONEERED Socratic Method
brane edge create --from Socrates --to "Socratic Method" --rel PIONEERED

# Nietzsche PROPOSED Will to Power
brane edge create --from Nietzsche --to "Will to Power" --rel PROPOSED

# Wittgenstein INTRODUCED Language Games
brane edge create --from Wittgenstein --to "Language Games" --rel INTRODUCED

# Nietzsche INFLUENCED Existentialism
brane edge create --from Nietzsche --to Existentialism --rel INFLUENCED

# Wittgenstein CRITIQUED Logical Positivism
brane edge create --from Wittgenstein --to "Logical Positivism" --rel CRITIQUED

# Ancient Greek Philosophy INCLUDES Socrates, Plato, Aristotle
brane edge create --from "Ancient Greek Philosophy" --to Socrates --rel INCLUDES
brane edge create --from "Ancient Greek Philosophy" --to Plato --rel INCLUDES
brane edge create --from "Ancient Greek Philosophy" --to Aristotle --rel INCLUDES

# Works AUTHORED_BY philosophers
brane edge create --from "The Republic" --to Plato --rel AUTHORED_BY
brane edge create --from "Tractatus Logico-Philosophicus" --to Wittgenstein --rel AUTHORED_BY
brane edge create --from "Thus Spoke Zarathustra" --to Nietzsche --rel AUTHORED_BY

# Theory of Forms PRESENTED_IN The Republic
brane edge create --from "Theory of Forms" --to "The Republic" --rel PRESENTED_IN

# Will to Power PRESENTED_IN Thus Spoke Zarathustra
brane edge create --from "Will to Power" --to "Thus Spoke Zarathustra" --rel PRESENTED_IN

# ─────────────────────────────────────────────────────────────────────────────
# explore the graph
# ─────────────────────────────────────────────────────────────────────────────

brane concept list

brane concept list --type Philosopher

# ID    NAME            TYPE
# 1     Socrates        Philosopher
# 2     Plato           Philosopher
# 3     Aristotle       Philosopher
# 4     Nietzsche       Philosopher
# 5     Wittgenstein    Philosopher

brane edge list --rel STUDIED_UNDER

# The lineage of teaching
# SOURCE  TARGET  RELATION
# 2       1       STUDIED_UNDER
# 3       2       STUDIED_UNDER

brane edge list --from Nietzsche

# All of Nietzsche's connections
# SOURCE  TARGET  RELATION
# 4       8       PROPOSED
# 4       10      INFLUENCED
