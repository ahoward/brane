#!/usr/bin/env bash
#
# body/fts/ level before_each hook
# Initializes FTS tables
#

set -e

source "$TC_TESTS_DIR/lib.sh"
init_body_fts
