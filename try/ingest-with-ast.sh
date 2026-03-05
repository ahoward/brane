#!/usr/bin/env bash
#
# Whitebox spike: does AST-augmented ingest work end-to-end?
# Verifies sentinel merge + coverage metrics in ingest output.
#
set -e

BRANE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export BRANE_LLM_MOCK=1
export BRANE_EMBED_MOCK=1

echo "=== spike: ingest-with-ast ==="

# Create temp workspace
WORKDIR=$(mktemp -d)
trap "rm -rf $WORKDIR" EXIT

# Init brane (body + mind)
mkdir -p "$WORKDIR/.brane"
echo '{}' | bun run "$BRANE_ROOT/src/cli.ts" /body/init 2>&1 | (cd "$WORKDIR" && cat > /dev/null)
(cd "$WORKDIR" && echo '{}' | brane /body/init > /dev/null 2>&1)
(cd "$WORKDIR" && echo '{}' | brane /mind/init > /dev/null 2>&1)

# Create a TypeScript file with classes the LLM mock won't name correctly
mkdir -p "$WORKDIR/src"
cat > "$WORKDIR/src/panopticon.ts" << 'EOF'
import { EventEmitter } from "events"

export interface TrackerConfig {
  endpoint: string
  retention_days: number
}

export class BehaviorTracker extends EventEmitter {
  constructor(private config: TrackerConfig) {
    super()
  }

  async track(userId: string): Promise<void> {
    // tracking logic
  }
}
EOF

echo "--- ingest src/panopticon.ts ---"
(cd "$WORKDIR" && echo "{\"path\": \"$WORKDIR/src/panopticon.ts\"}" | brane /calabi/ingest 2>&1) | jq '{
  status,
  files: .result.files | map({
    file_url,
    concepts_extracted,
    ast_symbols,
    ast_sentinels,
    coverage_pct,
    coverage_missing
  }),
  totals: .result.totals
}'

echo ""
echo "=== spike complete ==="
