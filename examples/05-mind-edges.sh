#!/usr/bin/env bash
#
# 05-mind-edges.sh - Manage edges (relationships) in the knowledge graph
#
# Demonstrates: /mind/edges/create, /list, /delete
#

set -e
source "$(dirname "$0")/lib/common.sh"

show_binary
setup_workspace

section "Initialize Body and Mind"

run_json "/body/init" '{}'
run_json "/mind/init" '{}'

section "Create Concepts First"

run_json "/mind/concepts/create" '{"name": "ApiController", "type": "Entity"}'
run_json "/mind/concepts/create" '{"name": "UserService", "type": "Entity"}'
run_json "/mind/concepts/create" '{"name": "Database", "type": "Entity"}'
run_json "/mind/concepts/create" '{"name": "Cache", "type": "Entity"}'

section "Create Edges"

echo "ApiController DEPENDS_ON UserService..."
run_json "/mind/edges/create" '{"source": 1, "target": 2, "relation": "DEPENDS_ON"}'

echo "UserService DEPENDS_ON Database..."
run_json "/mind/edges/create" '{"source": 2, "target": 3, "relation": "DEPENDS_ON"}'

echo "UserService DEPENDS_ON Cache..."
run_json "/mind/edges/create" '{"source": 2, "target": 4, "relation": "DEPENDS_ON"}'

section "List All Edges"

run_json "/mind/edges/list" '{}'

section "Query Edges"

echo "Note: Edge deletion requires the edge id."
echo "Listing edges to see their IDs..."
run_json "/mind/edges/list" '{}'

success "Edges management complete!"
