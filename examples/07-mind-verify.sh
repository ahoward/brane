#!/usr/bin/env bash
#
# 07-mind-verify.sh - Verify knowledge graph against rules
#
# Demonstrates: /mind/verify endpoint
#

set -e
source "$(dirname "$0")/lib/common.sh"

show_binary
setup_workspace

section "Initialize Body and Mind"

run_json "/body/init" '{}'
run_json "/mind/init" '{}'

section "Create Valid Graph"

echo "Creating concepts..."
run_json "/mind/concepts/create" '{"name": "ServiceA", "type": "Entity"}'
run_json "/mind/concepts/create" '{"name": "ServiceB", "type": "Entity"}'

echo "Creating edges..."
run_json "/mind/edges/create" '{"source": 1, "target": 2, "relation": "DEPENDS_ON"}'

section "Verify Graph (should pass)"

run_json "/mind/verify" '{}'

section "List Built-in Rules"

run_json "/mind/rules/list" '{}'

section "Get Rule Details"

echo "Getting 'orphans' rule..."
run_json "/mind/rules/get" '{"name": "orphans"}'

echo "Getting 'cycles' rule..."
run_json "/mind/rules/get" '{"name": "cycles"}'

success "Graph verification complete!"
