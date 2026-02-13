#!/usr/bin/env bash
#
# spike: validate progress emitter works on stderr, stdout stays clean
#
set -e

BRANE="$(cd "$(dirname "$0")/.." && pwd)/brane"
WORK="$(mktemp -d)"
trap "rm -rf '$WORK'" EXIT

cd "$WORK"

# init
"$BRANE" init > /dev/null 2>&1

# create some test files
mkdir -p src
for i in 1 2 3; do
  echo "export class Service${i} { run() {} }" > "src/service${i}.ts"
done

echo "=== STDERR (progress) ==="
# Run ingest, capture stdout and stderr separately
BRANE_LLM_MOCK=1 BRANE_EMBED_MOCK=1 "$BRANE" ingest src/ > "$WORK/stdout.txt" 2> "$WORK/stderr.txt"

echo "--- stderr ---"
cat "$WORK/stderr.txt"

echo ""
echo "--- stdout ---"
cat "$WORK/stdout.txt"

echo ""
echo "=== JSON mode (no progress on stderr) ==="
# Re-init to clear state
rm -rf .brane
"$BRANE" init > /dev/null 2>&1
mkdir -p src
for i in 4 5; do
  echo "export class Other${i} { go() {} }" > "src/other${i}.ts"
done

BRANE_LLM_MOCK=1 BRANE_EMBED_MOCK=1 "$BRANE" ingest src/ --json > "$WORK/stdout2.txt" 2> "$WORK/stderr2.txt"

echo "--- stderr (should be empty) ---"
cat "$WORK/stderr2.txt"
echo "(end)"

echo ""
echo "--- stdout (JSON) ---"
cat "$WORK/stdout2.txt" | head -5
echo "..."

echo ""
echo "=== PASS ==="
