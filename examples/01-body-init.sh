#!/usr/bin/env bash
#
# 01-body-init.sh - Initialize Brane's body (file tracking database)
#
# Demonstrates: /body/init endpoint
#

set -e
source "$(dirname "$0")/lib/common.sh"

show_binary
setup_workspace

section "Initialize Body"

echo "Body is SQLite-based file tracking."
echo "Stores: file hashes, paths, metadata."
echo ""

run_json "/body/init" '{}'

echo "Body initialized at .brane/body.db"
echo ""

section "Verify Body Exists"

ls -la .brane/

success "Body initialization complete!"
