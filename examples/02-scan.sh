#!/usr/bin/env bash
#
# 02-scan.sh — digest code directories (scan + extract)
#
# When you `brane digest` a local code directory, it runs the full
# AST + LLM extraction pipeline with provenance and change detection.
#

set -e
source "$(dirname "$0")/lib/common.sh"
setup_workspace

mkdir -p src
echo "export class AuthService { login() {} }" > src/auth.ts
echo "export const VERSION = '1.0'" > src/version.ts

brane_q init > /dev/null

brane digest src/

# digesting: src/auth.ts (added)
#   concepts: 1 extracted (1 created, 0 reused)
# digesting: src/version.ts (added)
#   ...
# summary: 2 files scanned, 2 extracted

# modify a file and re-digest
echo "// updated" >> src/auth.ts

brane digest src/

# auth.ts is re-extracted (updated), version.ts is skipped (unchanged)
