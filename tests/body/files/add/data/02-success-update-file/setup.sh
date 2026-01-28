#!/usr/bin/env bash
set -e
source "$TC_TESTS_DIR/lib.sh"
echo "original content" > test.txt
echo '{"path": "test.txt"}' | bun run "$TC_ROOT/src/cli.ts" /body/files/add > /dev/null
sleep 0.1
echo "modified content" > test.txt
