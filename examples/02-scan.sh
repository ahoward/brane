#!/usr/bin/env bash
#
# 02-scan.sh — scan files into brane
#

set -e
source "$(dirname "$0")/lib/common.sh"
setup_workspace

mkdir -p src
echo "console.log('hello')" > src/index.ts
echo "export const VERSION = '1.0'" > src/version.ts

brane_q init > /dev/null

brane scan src/

# added: 2
# updated: 0
# unchanged: 0

# modify a file and rescan
echo "// updated" >> src/index.ts

brane scan src/

# added: 0
# updated: 1
# unchanged: 1
