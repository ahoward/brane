#!/usr/bin/env bash
#
# 03-mind-init.sh - Initialize Brane's mind (knowledge graph database)
#
# Demonstrates: /mind/init endpoint
#

set -e
source "$(dirname "$0")/lib/common.sh"

show_binary
setup_workspace

section "Initialize Body First"

run_json "/body/init" '{}'

section "Initialize Mind"

echo "Mind is CozoDB-based knowledge graph."
echo "Stores: concepts, edges, rules, embeddings."
echo ""

run_json "/mind/init" '{}'

echo "Mind initialized at .brane/mind.db"
echo ""

section "Verify Mind Exists"

ls -la .brane/

section "Re-initialize (idempotent)"

echo "Running init again - should succeed without changes..."
run_json "/mind/init" '{}'

section "Force Re-initialize"

echo "Force reinit recreates database..."
run_json "/mind/init" '{"force": true}'

success "Mind initialization complete!"
