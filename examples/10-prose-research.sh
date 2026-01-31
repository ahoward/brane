#!/usr/bin/env bash
#
# 10-prose-research.sh — model academic research with custom types and relations
#
# Demonstrates: freeform concept types and edge relations for research knowledge graphs
#

set -e
source "$(dirname "$0")/lib/common.sh"
setup_workspace

brane init > /dev/null

# ─────────────────────────────────────────────────────────────────────────────
# theories (custom type: Theory)
# ─────────────────────────────────────────────────────────────────────────────

run brane concept create --name "Quantum Entanglement" --type Theory
run brane concept create --name "Local Hidden Variables" --type Theory
run brane concept create --name "Copenhagen Interpretation" --type Theory

# ─────────────────────────────────────────────────────────────────────────────
# studies (custom type: Study)
# ─────────────────────────────────────────────────────────────────────────────

run brane concept create --name "Bell Test 2022" --type Study
run brane concept create --name "Aspect Experiment 1982" --type Study

# ─────────────────────────────────────────────────────────────────────────────
# researchers (custom type: Researcher)
# ─────────────────────────────────────────────────────────────────────────────

run brane concept create --name "John Bell" --type Researcher
run brane concept create --name "Alain Aspect" --type Researcher
run brane concept create --name "Anton Zeilinger" --type Researcher

# ─────────────────────────────────────────────────────────────────────────────
# papers (custom type: Paper)
# ─────────────────────────────────────────────────────────────────────────────

run brane concept create --name "On the Einstein Podolsky Rosen Paradox" --type Paper
run brane concept create --name "Experimental Tests of Bell Inequalities" --type Paper

# ─────────────────────────────────────────────────────────────────────────────
# relationships (custom relations)
# ─────────────────────────────────────────────────────────────────────────────

# Bell Test 2022 SUPPORTS Quantum Entanglement
run brane edge create --from 4 --to 1 --rel SUPPORTS

# Bell Test 2022 REFUTES Local Hidden Variables
run brane edge create --from 4 --to 2 --rel REFUTES

# Aspect Experiment 1982 SUPPORTS Quantum Entanglement
run brane edge create --from 5 --to 1 --rel SUPPORTS

# John Bell AUTHORED "On the Einstein Podolsky Rosen Paradox"
run brane edge create --from 6 --to 9 --rel AUTHORED

# Alain Aspect CONDUCTED Aspect Experiment 1982
run brane edge create --from 7 --to 5 --rel CONDUCTED

# Anton Zeilinger CONDUCTED Bell Test 2022
run brane edge create --from 8 --to 4 --rel CONDUCTED

# Paper CITES paper
run brane edge create --from 10 --to 9 --rel CITES

# Quantum Entanglement CONTRADICTS Local Hidden Variables
run brane edge create --from 1 --to 2 --rel CONTRADICTS

# Copenhagen Interpretation ENCOMPASSES Quantum Entanglement
run brane edge create --from 3 --to 1 --rel ENCOMPASSES

# ─────────────────────────────────────────────────────────────────────────────
# explore the graph
# ─────────────────────────────────────────────────────────────────────────────

run brane concept list

run brane concept list --type Study

# ID    NAME                    TYPE
# 4     Bell Test 2022          Study
# 5     Aspect Experiment 1982  Study

run brane edge list --rel SUPPORTS

# Studies that support theories
# SOURCE  TARGET  RELATION
# 4       1       SUPPORTS
# 5       1       SUPPORTS

run brane edge list --rel CONDUCTED

# Who conducted which studies
# SOURCE  TARGET  RELATION
# 7       5       CONDUCTED
# 8       4       CONDUCTED
