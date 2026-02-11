#!/usr/bin/env bash
#
# 02-ingest.sh — ingest files into brane (scan + extract)
#

set -e
source "$(dirname "$0")/lib/common.sh"
setup_workspace

mkdir -p src
echo "export class AuthService { login() {} }" > src/auth.ts
echo "export const VERSION = '1.0'" > src/version.ts

brane_q init > /dev/null

brane ingest src/

# ingesting: /tmp/.../src/auth.ts (added)
#   concepts: 1 extracted (1 created, 0 reused)
#   edges: 0 extracted (0 created)
#   provenance: 1 links
# ingesting: /tmp/.../src/version.ts (added)
#   ...
# summary: 2 files scanned, 2 extracted

# modify a file and re-ingest
echo "// updated" >> src/auth.ts

brane ingest src/

# auth.ts is re-extracted (updated), version.ts is skipped (unchanged)
