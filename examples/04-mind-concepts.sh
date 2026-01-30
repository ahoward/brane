#!/usr/bin/env bash
#
# 04-mind-concepts.sh - Manage concepts in the knowledge graph
#
# Demonstrates: /mind/concepts/create, /list, /get, /update, /delete
#

set -e
source "$(dirname "$0")/lib/common.sh"

show_binary
setup_workspace

section "Initialize Body and Mind"

run_json "/body/init" '{}'
run_json "/mind/init" '{}'

section "Create Concepts"

echo "Creating Entity concepts..."
run_json "/mind/concepts/create" '{"name": "UserService", "type": "Entity"}'
run_json "/mind/concepts/create" '{"name": "AuthModule", "type": "Entity"}'
run_json "/mind/concepts/create" '{"name": "DatabasePool", "type": "Entity"}'

echo "Creating Rule concept..."
run_json "/mind/concepts/create" '{"name": "SingletonPattern", "type": "Rule"}'

section "List All Concepts"

run_json "/mind/concepts/list" '{}'

section "Get Single Concept"

echo "Getting concept with id=1..."
run_json "/mind/concepts/get" '{"id": 1}'

section "Update Concept"

echo "Updating concept 1 with new name..."
run_json "/mind/concepts/update" '{"id": 1, "name": "UserServiceV2"}'

section "Delete Concept"

echo "Deleting concept 4 (SingletonPattern)..."
run_json "/mind/concepts/delete" '{"id": 4}'

section "Final State"

run_json "/mind/concepts/list" '{}'

success "Concepts management complete!"
