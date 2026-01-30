# tests/lib.sh - shared test helpers (sourced, not executed)

# Support both TC_ROOT (new) and BRANE_ROOT (legacy) for backward compatibility
# TC_ROOT is set by tc.ts hook system
# BRANE_ROOT is calculated by legacy run scripts
_ROOT="${TC_ROOT:-$BRANE_ROOT}"

#
# Seed database support
# TC_SEEDS_DIR contains pre-built databases created by before_all.sh
# These are copied instead of re-initialized for each test (much faster)
#

# Create seed databases (run once in before_all.sh)
create_seeds() {
  local seeds_dir="${TC_SEEDS_DIR:?TC_SEEDS_DIR not set}"

  # Create body seed
  mkdir -p "$seeds_dir/body/.brane"
  sqlite3 "$seeds_dir/body/.brane/body.db" "PRAGMA journal_mode=WAL;" > /dev/null
  sqlite3 "$seeds_dir/body/.brane/body.db" "CREATE TABLE IF NOT EXISTS files (id INTEGER PRIMARY KEY, url TEXT NOT NULL UNIQUE, hash TEXT NOT NULL, size INTEGER NOT NULL, mtime INTEGER NOT NULL);"

  # Create body_fts seed
  mkdir -p "$seeds_dir/body_fts/.brane"
  sqlite3 "$seeds_dir/body_fts/.brane/body.db" "PRAGMA journal_mode=WAL;" > /dev/null
  sqlite3 "$seeds_dir/body_fts/.brane/body.db" "CREATE TABLE IF NOT EXISTS files (id INTEGER PRIMARY KEY, url TEXT NOT NULL UNIQUE, hash TEXT NOT NULL, size INTEGER NOT NULL, mtime INTEGER NOT NULL);"
  sqlite3 "$seeds_dir/body_fts/.brane/body.db" "CREATE VIRTUAL TABLE IF NOT EXISTS files_fts USING fts5(url, content);"
  sqlite3 "$seeds_dir/body_fts/.brane/body.db" "CREATE TABLE IF NOT EXISTS files_fts_status (url TEXT PRIMARY KEY, indexed_hash TEXT NOT NULL);"

  # Create mind seed (includes body tables + mind.db via CozoDB)
  mkdir -p "$seeds_dir/mind/.brane"
  sqlite3 "$seeds_dir/mind/.brane/body.db" "PRAGMA journal_mode=WAL;" > /dev/null
  sqlite3 "$seeds_dir/mind/.brane/body.db" "CREATE TABLE IF NOT EXISTS files (id INTEGER PRIMARY KEY, url TEXT NOT NULL UNIQUE, hash TEXT NOT NULL, size INTEGER NOT NULL, mtime INTEGER NOT NULL);"
  # Initialize mind.db in the seeds directory
  (cd "$seeds_dir/mind" && echo '{}' | bun run "$_ROOT/src/cli.ts" /mind/init > /dev/null 2>&1)

  # Create mind_fts seed (mind.db + body.db with FTS tables)
  mkdir -p "$seeds_dir/mind_fts/.brane"
  sqlite3 "$seeds_dir/mind_fts/.brane/body.db" "PRAGMA journal_mode=WAL;" > /dev/null
  sqlite3 "$seeds_dir/mind_fts/.brane/body.db" "CREATE TABLE IF NOT EXISTS files (id INTEGER PRIMARY KEY, url TEXT NOT NULL UNIQUE, hash TEXT NOT NULL, size INTEGER NOT NULL, mtime INTEGER NOT NULL);"
  sqlite3 "$seeds_dir/mind_fts/.brane/body.db" "CREATE VIRTUAL TABLE IF NOT EXISTS files_fts USING fts5(url, content);"
  sqlite3 "$seeds_dir/mind_fts/.brane/body.db" "CREATE TABLE IF NOT EXISTS files_fts_status (url TEXT PRIMARY KEY, indexed_hash TEXT NOT NULL);"
  # Initialize mind.db in the seeds directory
  (cd "$seeds_dir/mind_fts" && echo '{}' | bun run "$_ROOT/src/cli.ts" /mind/init > /dev/null 2>&1)
}

# Copy body seed to current directory
use_body_seed() {
  local seeds_dir="${TC_SEEDS_DIR:?TC_SEEDS_DIR not set}"
  cp -r "$seeds_dir/body/.brane" .
}

# Copy body_fts seed to current directory
use_body_fts_seed() {
  local seeds_dir="${TC_SEEDS_DIR:?TC_SEEDS_DIR not set}"
  cp -r "$seeds_dir/body_fts/.brane" .
}

# Copy mind seed to current directory
use_mind_seed() {
  local seeds_dir="${TC_SEEDS_DIR:?TC_SEEDS_DIR not set}"
  cp -r "$seeds_dir/mind/.brane" .
}

# Copy mind_fts seed to current directory (mind + FTS)
use_mind_fts_seed() {
  local seeds_dir="${TC_SEEDS_DIR:?TC_SEEDS_DIR not set}"
  cp -r "$seeds_dir/mind_fts/.brane" .
}

#
# Legacy init functions (for backward compatibility or non-seed usage)
#

# Initialize body.db in current directory
init_body() {
  # Use seed if available, otherwise create from scratch
  if [[ -n "${TC_SEEDS_DIR:-}" && -d "${TC_SEEDS_DIR}/body/.brane" ]]; then
    use_body_seed
  else
    mkdir -p .brane
    sqlite3 .brane/body.db "PRAGMA journal_mode=WAL;" > /dev/null
    sqlite3 .brane/body.db "CREATE TABLE IF NOT EXISTS files (id INTEGER PRIMARY KEY, url TEXT NOT NULL UNIQUE, hash TEXT NOT NULL, size INTEGER NOT NULL, mtime INTEGER NOT NULL);"
  fi
}

# Initialize body.db + FTS tables
init_body_fts() {
  # Use seed if available, otherwise create from scratch
  if [[ -n "${TC_SEEDS_DIR:-}" && -d "${TC_SEEDS_DIR}/body_fts/.brane" ]]; then
    use_body_fts_seed
  else
    init_body
    sqlite3 .brane/body.db "CREATE VIRTUAL TABLE IF NOT EXISTS files_fts USING fts5(url, content);"
    sqlite3 .brane/body.db "CREATE TABLE IF NOT EXISTS files_fts_status (url TEXT PRIMARY KEY, indexed_hash TEXT NOT NULL);"
  fi
}

# Initialize mind.db (requires body.db first)
# If body_fts is already initialized, use mind_fts seed to preserve FTS tables
init_mind() {
  # Check if we need FTS support (body_fts already initialized)
  local has_fts=false
  if [[ -d .brane ]] && sqlite3 .brane/body.db "SELECT 1 FROM sqlite_master WHERE name='files_fts';" 2>/dev/null | grep -q 1; then
    has_fts=true
  fi

  # Use seed if available
  if [[ -n "${TC_SEEDS_DIR:-}" ]]; then
    if [[ "$has_fts" == "true" && -d "${TC_SEEDS_DIR}/mind_fts/.brane" ]]; then
      # Copy only mind.db, keep existing body.db with FTS
      cp -r "$TC_SEEDS_DIR/mind_fts/.brane/mind.db" .brane/
    elif [[ -d "${TC_SEEDS_DIR}/mind/.brane" ]]; then
      use_mind_seed
    else
      init_body
      echo '{}' | bun run "$_ROOT/src/cli.ts" /mind/init > /dev/null 2>&1
    fi
  else
    init_body
    echo '{}' | bun run "$_ROOT/src/cli.ts" /mind/init > /dev/null 2>&1
  fi
}

# Initialize mind.db + body.db with FTS (combined seed for tests needing both)
init_mind_fts() {
  if [[ -n "${TC_SEEDS_DIR:-}" && -d "${TC_SEEDS_DIR}/mind_fts/.brane" ]]; then
    use_mind_fts_seed
  else
    init_body_fts
    echo '{}' | bun run "$_ROOT/src/cli.ts" /mind/init > /dev/null 2>&1
  fi
}

# Add file to body.db
add_body_file() {
  local url="$1" hash="$2" size="$3" mtime="$4"
  sqlite3 .brane/body.db "INSERT INTO files (url, hash, size, mtime) VALUES ('$url', '$hash', $size, $mtime);"
}

# Add FTS content and status
add_fts() {
  local url="$1" content="$2" hash="${3:-indexed}"
  sqlite3 .brane/body.db "INSERT INTO files_fts (url, content) VALUES ('$url', '$content');"
  sqlite3 .brane/body.db "INSERT INTO files_fts_status (url, indexed_hash) VALUES ('$url', '$hash');"
}

# Create a concept in mind.db
create_concept() {
  echo "$1" | bun run "$_ROOT/src/cli.ts" /mind/concepts/create > /dev/null 2>&1
}

# Create an edge in mind.db
create_edge() {
  echo "$1" | bun run "$_ROOT/src/cli.ts" /mind/edges/create > /dev/null 2>&1
}

# Create a provenance link in mind.db
create_provenance() {
  echo "$1" | bun run "$_ROOT/src/cli.ts" /mind/provenance/create > /dev/null 2>&1
}

# Create an extraction state entry in mind.db (via direct CozoDB query)
# Usage: create_extraction_state "file_url" "file_hash"
create_extraction_state() {
  local file_url="$1" file_hash="$2"
  # Use a simple bun script to run the CozoDB query
  bun -e "
    const { CozoDb } = require('$_ROOT/src/lib/cozo');
    const db = new CozoDb('rocksdb', '.brane/mind.db');
    db.run(\`?[file_url, file_hash] <- [['$file_url', '$file_hash']] :put extraction_state { file_url, file_hash }\`);
    db.close();
  " > /dev/null 2>&1
}

# Create isolated workspace, run cleanup on exit
workspace() {
  WORKDIR=$(mktemp -d)
  trap "rm -rf $WORKDIR" EXIT
  cd "$WORKDIR"
}
