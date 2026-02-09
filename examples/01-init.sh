#!/usr/bin/env bash
#
# 01-init.sh — initialize a brane project
#

set -e
source "$(dirname "$0")/lib/common.sh"
setup_workspace

brane init

# body: created .brane
# mind: created .brane/mind.db

ls -la .brane/

# body.db
# mind.db
