#!/usr/bin/env bash
#
# 15-graph-explore.sh — navigate the knowledge graph
#
# summary, neighbors, and viz — the tools agents use to understand structure.
#

set -e
source "$(dirname "$0")/lib/common.sh"
setup_workspace

brane init

# ─────────────────────────────────────────────────────────────────────────────
# build a small service graph
# ─────────────────────────────────────────────────────────────────────────────

brane concept create --name ApiGateway --type Entity
brane concept create --name AuthService --type Entity
brane concept create --name UserDB --type Entity
brane concept create --name PaymentService --type Entity
brane concept create --name StripeAPI --type Entity

brane edge create --from ApiGateway --to AuthService --rel DEPENDS_ON
brane edge create --from ApiGateway --to PaymentService --rel DEPENDS_ON
brane edge create --from AuthService --to UserDB --rel DEPENDS_ON
brane edge create --from PaymentService --to UserDB --rel DEPENDS_ON
brane edge create --from PaymentService --to StripeAPI --rel DEPENDS_ON

# ─────────────────────────────────────────────────────────────────────────────
# summary — totals and type breakdowns
# ─────────────────────────────────────────────────────────────────────────────

brane graph summary

# Concepts: 5
#   Entity: 5
#
# Edges: 5
#   DEPENDS_ON: 5

# ─────────────────────────────────────────────────────────────────────────────
# neighbors — what connects to PaymentService?
# ─────────────────────────────────────────────────────────────────────────────

brane graph neighbors PaymentService

# [PaymentService] Entity
#
# Incoming:
#   <- DEPENDS_ON [ApiGateway] Entity (edge 2)
#
# Outgoing:
#   -> DEPENDS_ON [UserDB] Entity (edge 4)
#   -> DEPENDS_ON [StripeAPI] Entity (edge 5)
#
# Total: 3 neighbors

# ─────────────────────────────────────────────────────────────────────────────
# viz — ASCII graph
# ─────────────────────────────────────────────────────────────────────────────

brane graph viz

# [ApiGateway]
#   |--DEPENDS_ON--> [AuthService]
#   |--DEPENDS_ON--> [PaymentService]
# [AuthService]
#   |--DEPENDS_ON--> [UserDB]
# [PaymentService]
#   |--DEPENDS_ON--> [UserDB]
#   |--DEPENDS_ON--> [StripeAPI]

# ─────────────────────────────────────────────────────────────────────────────
# viz centered on a node
# ─────────────────────────────────────────────────────────────────────────────

brane graph viz -c UserDB

# centered view showing only UserDB's neighborhood

# ─────────────────────────────────────────────────────────────────────────────
# mermaid output — paste into any markdown renderer
# ─────────────────────────────────────────────────────────────────────────────

brane graph viz -f mermaid

# graph LR
#   ApiGateway -->|DEPENDS_ON| AuthService
#   ApiGateway -->|DEPENDS_ON| PaymentService
#   ...
