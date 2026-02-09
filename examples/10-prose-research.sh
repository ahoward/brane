#!/usr/bin/env bash
#
# 10-prose-research.sh — model academic research with custom types and relations
#
# Demonstrates: freeform concept types and edge relations for research knowledge graphs
#

set -e
source "$(dirname "$0")/lib/common.sh"
setup_workspace

brane_q init > /dev/null

# ─────────────────────────────────────────────────────────────────────────────
# theories (custom type: Theory)
# ─────────────────────────────────────────────────────────────────────────────

brane concept create --name "Quantum Entanglement" --type Theory
brane concept create --name "Local Hidden Variables" --type Theory
brane concept create --name "Copenhagen Interpretation" --type Theory

# ─────────────────────────────────────────────────────────────────────────────
# studies (custom type: Study)
# ─────────────────────────────────────────────────────────────────────────────

brane concept create --name "Bell Test 2022" --type Study
brane concept create --name "Aspect Experiment 1982" --type Study

# ─────────────────────────────────────────────────────────────────────────────
# researchers (custom type: Researcher)
# ─────────────────────────────────────────────────────────────────────────────

brane concept create --name "John Bell" --type Researcher
brane concept create --name "Alain Aspect" --type Researcher
brane concept create --name "Anton Zeilinger" --type Researcher

# ─────────────────────────────────────────────────────────────────────────────
# papers (custom type: Paper)
# ─────────────────────────────────────────────────────────────────────────────

brane concept create --name "On the Einstein Podolsky Rosen Paradox" --type Paper
brane concept create --name "Experimental Tests of Bell Inequalities" --type Paper

# ─────────────────────────────────────────────────────────────────────────────
# relationships (custom relations)
# ─────────────────────────────────────────────────────────────────────────────

# Bell Test 2022 SUPPORTS Quantum Entanglement
brane edge create --from "Bell Test 2022" --to "Quantum Entanglement" --rel SUPPORTS

# Bell Test 2022 REFUTES Local Hidden Variables
brane edge create --from "Bell Test 2022" --to "Local Hidden Variables" --rel REFUTES

# Aspect Experiment 1982 SUPPORTS Quantum Entanglement
brane edge create --from "Aspect Experiment 1982" --to "Quantum Entanglement" --rel SUPPORTS

# John Bell AUTHORED "On the Einstein Podolsky Rosen Paradox"
brane edge create --from "John Bell" --to "On the Einstein Podolsky Rosen Paradox" --rel AUTHORED

# Alain Aspect CONDUCTED Aspect Experiment 1982
brane edge create --from "Alain Aspect" --to "Aspect Experiment 1982" --rel CONDUCTED

# Anton Zeilinger CONDUCTED Bell Test 2022
brane edge create --from "Anton Zeilinger" --to "Bell Test 2022" --rel CONDUCTED

# Paper CITES paper
brane edge create --from "Experimental Tests of Bell Inequalities" --to "On the Einstein Podolsky Rosen Paradox" --rel CITES

# Quantum Entanglement CONTRADICTS Local Hidden Variables
brane edge create --from "Quantum Entanglement" --to "Local Hidden Variables" --rel CONTRADICTS

# Copenhagen Interpretation ENCOMPASSES Quantum Entanglement
brane edge create --from "Copenhagen Interpretation" --to "Quantum Entanglement" --rel ENCOMPASSES

# ─────────────────────────────────────────────────────────────────────────────
# explore the graph
# ─────────────────────────────────────────────────────────────────────────────

brane concept list

brane concept list --type Study

# ID    NAME                    TYPE
# 4     Bell Test 2022          Study
# 5     Aspect Experiment 1982  Study

brane edge list --rel SUPPORTS

# Studies that support theories
# SOURCE  TARGET  RELATION
# 4       1       SUPPORTS
# 5       1       SUPPORTS

brane edge list --rel CONDUCTED

# Who conducted which studies
# SOURCE  TARGET  RELATION
# 7       5       CONDUCTED
# 8       4       CONDUCTED
