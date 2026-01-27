# tests/lib.sh - shared test helpers (sourced, not executed)

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

# Add FTS content and status
add_fts() {
  local url="$1" content="$2" hash="${3:-indexed}"
  sqlite3 .brane/body.db "INSERT INTO files_fts (url, content) VALUES ('$url', '$content');"
  sqlite3 .brane/body.db "INSERT INTO files_fts_status (url, indexed_hash) VALUES ('$url', '$hash');"
}

# Create a concept in mind.db
create_concept() {
  echo "$1" | bun run "$BRANE_ROOT/src/cli.ts" /mind/concepts/create > /dev/null 2>&1
}

# Create isolated workspace, run cleanup on exit
workspace() {
  WORKDIR=$(mktemp -d)
  trap "rm -rf $WORKDIR" EXIT
  cd "$WORKDIR"
}
