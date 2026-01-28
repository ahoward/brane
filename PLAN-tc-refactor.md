# Plan: tc Test Convention Refactor

## Philosophy (preserving tc intent)

The tc test runner is designed for **transparency**:
- Directory structure IS documentation
- Data files are readable fixtures (no factories, no generation)
- Run scripts are explicit bash - humans and AI read exactly what happens
- No DSLs, no config languages, no "setup frameworks"
- Duplication is acceptable if it means transparency
- Everything fits in context window - all is known to the robots

## Changes

### 1. Rename data files: input → params, expected → result

This aligns with the hexagonal/Result envelope pattern used everywhere in brane:

```
sys.call("/path", params) → { status, result, errors, meta }
```

**Current:**
```
tests/{handler}/data/{case}/input.json
tests/{handler}/data/{case}/expected.json
```

**After:**
```
tests/{handler}/data/{case}/params.json
tests/{handler}/data/{case}/result.json
```

The fractal consistency: params go in, result comes out - at every level.

### 2. Extract shared helpers to tests/lib.sh

Keep run scripts explicit, but source common helpers to reduce noise without hiding logic.

**Create `tests/lib.sh`:**
```bash
# tests/lib.sh - shared test helpers (sourced, not executed)

# Find brane root from any test directory
brane_root() {
  local dir="$1"
  while [[ "$dir" != "/" ]]; do
    [[ -f "$dir/src/cli.ts" ]] && echo "$dir" && return
    dir="$(dirname "$dir")"
  done
}

# Initialize body.db in current directory
init_body() {
  mkdir -p .brane
  sqlite3 .brane/body.db "PRAGMA journal_mode=WAL;" > /dev/null
  sqlite3 .brane/body.db "CREATE TABLE IF NOT EXISTS files (id INTEGER PRIMARY KEY, url TEXT NOT NULL UNIQUE, hash TEXT NOT NULL, size INTEGER NOT NULL, mtime INTEGER NOT NULL);"
}

# Initialize body.db + FTS tables
init_body_fts() {
  init_body
  sqlite3 .brane/body.db "CREATE VIRTUAL TABLE IF NOT EXISTS files_fts USING fts5(url, content);"
  sqlite3 .brane/body.db "CREATE TABLE IF NOT EXISTS files_fts_status (url TEXT PRIMARY KEY, indexed_hash TEXT NOT NULL);"
}

# Initialize mind.db (requires body.db first)
init_mind() {
  init_body
  echo '{}' | bun run "$BRANE_ROOT/src/cli.ts" /mind/init > /dev/null 2>&1
}

# Add file to body.db
add_body_file() {
  local url="$1" hash="$2" size="$3" mtime="$4"
  sqlite3 .brane/body.db "INSERT INTO files (url, hash, size, mtime) VALUES ('$url', '$hash', $size, $mtime);"
}

# Add FTS content
add_fts() {
  local url="$1" content="$2" hash="${3:-indexed}"
  sqlite3 .brane/body.db "INSERT INTO files_fts (url, content) VALUES ('$url', '$content');"
  sqlite3 .brane/body.db "INSERT INTO files_fts_status (url, indexed_hash) VALUES ('$url', '$hash');"
}

# Create isolated workspace, run cleanup on exit
workspace() {
  WORKDIR=$(mktemp -d)
  trap "rm -rf $WORKDIR" EXIT
  cd "$WORKDIR"
}
```

**Run scripts become:**
```bash
#!/usr/bin/env bash
set -e

BRANE_ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
source "$BRANE_ROOT/tests/lib.sh"

INPUT=$(cat)
workspace

case "$TC_CASE_NAME" in
  00-success-single-file)
    init_body
    echo "hello world" > test.txt
    ;;
  # ... rest of cases, now cleaner
esac

echo "$INPUT" | bun run "$BRANE_ROOT/src/cli.ts" /body/files/add
```

The setup logic is still **in the run script** - visible, explicit, per-case.
The helpers just reduce the noise of repeated sqlite3 commands.

### 3. Update tc.ts to use params.json / result.json

Change the file discovery:
- `input.json` → `params.json`
- `expected.json` → `result.json`

### 4. Rename all 94 test cases

```bash
# For each test case directory
find tests -name "input.json" -exec sh -c 'mv "$1" "$(dirname "$1")/params.json"' _ {} \;
find tests -name "expected.json" -exec sh -c 'mv "$1" "$(dirname "$1")/result.json"' _ {} \;
```

## Files Changed

1. `tests/lib.sh` - NEW (shared helpers, ~40 lines)
2. `src/tc.ts` - Update file names (input→params, expected→result)
3. `tests/*/run` - Source lib.sh, use helpers (15 files)
4. `tests/**/params.json` - Renamed from input.json (94 files)
5. `tests/**/result.json` - Renamed from expected.json (94 files)

## What This Does NOT Do

- Does NOT hide setup logic in config files
- Does NOT create a DSL or framework
- Does NOT remove the per-handler run scripts
- Does NOT change the tc.ts test runner architecture

## Verification

```bash
bun test  # All 94 tests pass
```

## Summary

| Before | After | Why |
|--------|-------|-----|
| input.json | params.json | Matches sys.call(path, **params**) |
| expected.json | result.json | Matches { status, **result**, errors, meta } |
| Repeated sqlite3 commands | `init_body`, `init_mind` helpers | Less noise, same transparency |
