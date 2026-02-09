# tests/lib.sh - shared test helpers (sourced, not executed)

# Support both TC_ROOT (new) and BRANE_ROOT (legacy) for backward compatibility
# TC_ROOT is set by tc.ts hook system
# BRANE_ROOT is calculated by legacy run scripts
_ROOT="${TC_ROOT:-$BRANE_ROOT}"
export PATH="$_ROOT/bin:$PATH"

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
  (cd "$seeds_dir/mind" && echo '{}' | brane /mind/init > /dev/null 2>&1)

  # Create mind_populated seed (mind.db with 3 concepts + 2 edges)
  mkdir -p "$seeds_dir/mind_populated/.brane"
  sqlite3 "$seeds_dir/mind_populated/.brane/body.db" "PRAGMA journal_mode=WAL;" > /dev/null
  sqlite3 "$seeds_dir/mind_populated/.brane/body.db" "CREATE TABLE IF NOT EXISTS files (id INTEGER PRIMARY KEY, url TEXT NOT NULL UNIQUE, hash TEXT NOT NULL, size INTEGER NOT NULL, mtime INTEGER NOT NULL);"
  (cd "$seeds_dir/mind_populated" && echo '{}' | brane /mind/init > /dev/null 2>&1)
  (cd "$seeds_dir/mind_populated" && echo '{"items": [{"name": "A", "type": "Entity"}, {"name": "B", "type": "Entity"}, {"name": "C", "type": "Entity"}]}' | brane /mind/concepts/create-many > /dev/null 2>&1)
  (cd "$seeds_dir/mind_populated" && echo '{"items": [{"source": 1, "target": 2, "relation": "DEPENDS_ON"}, {"source": 2, "target": 3, "relation": "DEPENDS_ON"}]}' | brane /mind/edges/create-many > /dev/null 2>&1)

  # Create mind_fts seed (mind.db + body.db with FTS tables)
  mkdir -p "$seeds_dir/mind_fts/.brane"
  sqlite3 "$seeds_dir/mind_fts/.brane/body.db" "PRAGMA journal_mode=WAL;" > /dev/null
  sqlite3 "$seeds_dir/mind_fts/.brane/body.db" "CREATE TABLE IF NOT EXISTS files (id INTEGER PRIMARY KEY, url TEXT NOT NULL UNIQUE, hash TEXT NOT NULL, size INTEGER NOT NULL, mtime INTEGER NOT NULL);"
  sqlite3 "$seeds_dir/mind_fts/.brane/body.db" "CREATE VIRTUAL TABLE IF NOT EXISTS files_fts USING fts5(url, content);"
  sqlite3 "$seeds_dir/mind_fts/.brane/body.db" "CREATE TABLE IF NOT EXISTS files_fts_status (url TEXT PRIMARY KEY, indexed_hash TEXT NOT NULL);"
  # Initialize mind.db in the seeds directory
  (cd "$seeds_dir/mind_fts" && echo '{}' | brane /mind/init > /dev/null 2>&1)
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

# Copy mind_populated seed to current directory (mind + 3 concepts + 2 edges)
use_mind_populated_seed() {
  local seeds_dir="${TC_SEEDS_DIR:?TC_SEEDS_DIR not set}"
  cp -r "$seeds_dir/mind_populated/.brane" .
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
      echo '{}' | brane /mind/init > /dev/null 2>&1
    fi
  else
    init_body
    echo '{}' | brane /mind/init > /dev/null 2>&1
  fi
}

# Initialize mind.db with pre-populated data:
#   Concepts: A(1), B(2), C(3) - all Entity type
#   Edges: A->B(1) DEPENDS_ON, B->C(2) DEPENDS_ON
#   Counters: concept_next_id=4, edge_next_id=3
init_mind_populated() {
  if [[ -n "${TC_SEEDS_DIR:-}" && -d "${TC_SEEDS_DIR}/mind_populated/.brane" ]]; then
    use_mind_populated_seed
  else
    init_mind
    create_concepts '[{"name": "A", "type": "Entity"}, {"name": "B", "type": "Entity"}, {"name": "C", "type": "Entity"}]'
    create_edges '[{"source": 1, "target": 2, "relation": "DEPENDS_ON"}, {"source": 2, "target": 3, "relation": "DEPENDS_ON"}]'
  fi
}

# Initialize mind.db + body.db with FTS (combined seed for tests needing both)
init_mind_fts() {
  if [[ -n "${TC_SEEDS_DIR:-}" && -d "${TC_SEEDS_DIR}/mind_fts/.brane" ]]; then
    use_mind_fts_seed
  else
    init_body_fts
    echo '{}' | brane /mind/init > /dev/null 2>&1
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
  echo "$1" | brane /mind/concepts/create > /dev/null 2>&1
}

# Batch create concepts in mind.db - accepts JSON array of {name, type} objects
create_concepts() {
  echo "{\"items\": $1}" | brane /mind/concepts/create-many > /dev/null 2>&1
}

# Create an edge in mind.db
create_edge() {
  echo "$1" | brane /mind/edges/create > /dev/null 2>&1
}

# Batch create edges in mind.db - accepts JSON array of {source, target, relation, weight?} objects
create_edges() {
  echo "{\"items\": $1}" | brane /mind/edges/create-many > /dev/null 2>&1
}

# Create a provenance link in mind.db
create_provenance() {
  echo "$1" | brane /mind/provenance/create > /dev/null 2>&1
}

# Create isolated workspace, run cleanup on exit
workspace() {
  WORKDIR=$(mktemp -d)
  trap "rm -rf $WORKDIR" EXIT
  cd "$WORKDIR"
}
