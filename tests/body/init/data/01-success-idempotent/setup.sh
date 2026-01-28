#!/usr/bin/env bash
# Setup for idempotent test: pre-initialize body.db
set -e
source "$TC_TESTS_DIR/lib.sh"
init_body
