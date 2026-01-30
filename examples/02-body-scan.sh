#!/usr/bin/env bash
#
# 02-body-scan.sh - Scan files into Brane's body
#
# Demonstrates: /body/scan endpoint
#

set -e
source "$(dirname "$0")/lib/common.sh"

show_binary
setup_workspace

section "Setup: Create sample files"

mkdir -p src
echo "console.log('hello')" > src/index.ts
echo "export const VERSION = '1.0.0'" > src/version.ts
echo "# README" > README.md

echo "Created:"
find . -type f -name "*.ts" -o -name "*.md" | head -10
echo ""

section "Initialize Body"

run_json "/body/init" '{}'

section "Scan Directory"

echo "Scanning src/ directory..."
run_json "/body/scan" '{"path": "src"}'

section "Scan Single File"

echo "Scanning README.md..."
run_json "/body/scan" '{"path": "README.md"}'

section "List Scanned Files"

run_json "/body/files/list" '{}'

success "Body scan complete!"
