# Research: Ingest

## R1: How does /body/scan detect new/changed/unchanged files?

**Decision**: Reuse `/body/scan` handler directly — it hashes files (SHA256), compares against body.db, and returns `added`, `updated`, `unchanged` categories.

**Rationale**: The handler already handles .gitignore/.braneignore, binary detection, recursive directory walking, and hash comparison. No reason to reimplement.

**Alternatives considered**: Building custom file discovery in the ingest handler — rejected because it duplicates tested logic.

## R2: How to determine which files need LLM extraction?

**Decision**: After scan completes, extract all files that were `added` or `updated` (new hash differs from old). Skip `unchanged` files.

**Rationale**: Unchanged files have already been extracted. Re-extracting would waste LLM calls. Changed files need re-extraction because their content (and thus concepts/edges) may have changed.

**Alternatives considered**: Using provenance as the dirty flag (current calabi/scan approach) — rejected because hash-based detection from body/scan is more reliable and already available in the scan result.

## R3: How to handle the RocksDB single-connection constraint?

**Decision**: Same pattern as calabi/extract-llm — open mind.db to read lens config, close it, then let extract_handler open/close it per file with 10ms delays.

**Rationale**: Proven pattern from existing extract-llm handler. RocksDB only allows one connection at a time.

**Alternatives considered**: Keeping mind.db open across files — rejected because extract_handler opens its own connection.

## R4: How to handle scan + extract as a single atomic operation?

**Decision**: Not atomic. Scan writes to body.db first (SQLite, no lock contention), then extraction writes to mind.db per-file. If extraction fails partway through, body.db is updated but some files lack mind.db entries — this is acceptable because re-running ingest will detect those files as unchanged but with no provenance, and can re-extract them.

**Rationale**: True atomicity across SQLite + CozoDB would require transaction coordination that doesn't exist. The idempotent design (re-run picks up where it left off) is simpler and sufficient.

**Alternatives considered**: Two-phase commit — rejected as over-engineering (Principle VI).

## R5: Should ingest call /body/scan via sys.call or direct function import?

**Decision**: Direct function import (like calabi/scan.ts does with extract_handler). The handler is an internal primitive, not a public API boundary.

**Rationale**: Constitution Principle III — sys.call is the public API. Internal orchestration uses direct function calls. Avoids unnecessary envelope wrapping/unwrapping.

**Alternatives considered**: sys.call — rejected per constitution.

## R6: CLI command registration — new subcommand or replace scan/extract?

**Decision**: Add `brane ingest` as a new command. Keep `scan` and `extract` available. Ingest becomes the recommended user-facing command.

**Rationale**: Non-breaking change. Power users may still want scan-only (index without LLM) or extract-only (re-extract specific files).

**Alternatives considered**: Deprecating scan/extract — premature, keep them as primitives.
