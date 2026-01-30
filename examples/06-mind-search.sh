#!/usr/bin/env bash
#
# 06-mind-search.sh - Semantic search in the knowledge graph
#
# Demonstrates: /mind/search endpoint with vector embeddings
#

set -e
source "$(dirname "$0")/lib/common.sh"

show_binary
setup_workspace

section "Initialize Body and Mind"

run_json "/body/init" '{}'
run_json "/mind/init" '{}'

section "Create Searchable Concepts"

echo "Creating concepts with semantic meaning..."
run_json "/mind/concepts/create" '{"name": "AuthenticationService", "type": "Entity"}'
run_json "/mind/concepts/create" '{"name": "PasswordValidator", "type": "Entity"}'
run_json "/mind/concepts/create" '{"name": "SessionManager", "type": "Entity"}'
run_json "/mind/concepts/create" '{"name": "DatabaseConnection", "type": "Entity"}'
run_json "/mind/concepts/create" '{"name": "QueryBuilder", "type": "Entity"}'
run_json "/mind/concepts/create" '{"name": "CacheLayer", "type": "Entity"}'

section "Search: Authentication"

echo "Query: 'login and user verification'"
run_json "/mind/search" '{"query": "login and user verification", "limit": 3}'

section "Search: Database"

echo "Query: 'database queries and storage'"
run_json "/mind/search" '{"query": "database queries and storage", "limit": 3}'

section "Search: Performance"

echo "Query: 'caching and performance optimization'"
run_json "/mind/search" '{"query": "caching and performance optimization", "limit": 3}'

success "Semantic search complete!"
