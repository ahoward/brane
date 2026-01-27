# Feature Specification: body-fts-index

**Feature Branch**: `007-body-fts-index`
**Created**: 2026-01-27
**Status**: Draft
**Input**: Build FTS5 index from file contents

## User Scenarios & Testing

### User Story 1 - Index All Tracked Files (Priority: P1)

A developer wants to enable full-text search across their codebase.
They run `brane index` and brane reads the contents of all tracked files
and indexes them using SQLite FTS5.

**Why this priority**: Core functionality - without indexing, search is impossible.

**Independent Test**: Track files, run index, verify all text content is searchable.

**Acceptance Scenarios**:

1. **Given** tracked files in body.db, **When** `brane index` is called,
   **Then** all text files are indexed in FTS5 table.

2. **Given** previously indexed files, **When** index is called again,
   **Then** modified files are re-indexed, unchanged files are skipped.

3. **Given** binary files in body.db, **When** index is called,
   **Then** binary files are skipped (only text content indexed).

---

### User Story 2 - Index Specific Files (Priority: P2)

A developer wants to index only files in a specific directory.
They run `brane index src/` and only files under src/ are indexed.

**Why this priority**: Focused indexing is faster for large projects.

**Independent Test**: Index specific path, verify only that path's files
are indexed.

**Acceptance Scenarios**:

1. **Given** files in `src/` and `tests/`, **When** `brane index src/` is called,
   **Then** only `src/` files are indexed.

---

### User Story 3 - Force Re-index (Priority: P3)

A developer wants to rebuild the entire index from scratch.
They run `brane index --force` and all files are re-indexed.

**Why this priority**: Useful for recovery or after schema changes,
but not essential for daily use.

**Independent Test**: Run force index, verify all files are re-indexed
regardless of previous state.

**Acceptance Scenarios**:

1. **Given** existing index, **When** `--force` is used,
   **Then** all files are re-indexed.

---

### Edge Cases

- What happens when `.brane/` is not initialized?
  → Return error with code `not_initialized`

- What happens when no files are tracked?
  → Return success with zero indexed count

- What happens with binary files (images, executables)?
  → Skip them, only index text-based files

- What happens with very large files?
  → Index up to a reasonable limit (e.g., 10MB max)

- What happens with encoding issues?
  → Try UTF-8, skip files with encoding errors

## Requirements

### Functional Requirements

- **FR-001**: System MUST create FTS5 virtual table if not exists
- **FR-002**: System MUST index content of all tracked text files
- **FR-003**: System MUST skip binary files automatically
- **FR-004**: System MUST track indexed hash to avoid redundant indexing
- **FR-005**: System MUST support path parameter for focused indexing
- **FR-006**: System MUST support force parameter for full re-index
- **FR-007**: System MUST return count of indexed/skipped/errors
- **FR-008**: System MUST require initialized `.brane/` directory
- **FR-009**: System MUST handle large files gracefully (skip or limit)
- **FR-010**: System MUST clean up stale index entries for deleted files

### Key Entities

- **IndexResult**: Summary of index operation
  - `indexed`: Number of files indexed
  - `skipped`: Number of files skipped (binary, too large, encoding)
  - `errors`: Number of files that failed
  - `deleted`: Number of stale index entries removed

- **files_fts**: FTS5 virtual table
  - `url`: File URL (matches files table)
  - `content`: Full text content

- **files_fts_status**: Index tracking table
  - `url`: File URL
  - `indexed_hash`: Hash when file was last indexed

## Success Criteria

### Measurable Outcomes

- **SC-001**: Index of 1000 files completes in <30s
- **SC-002**: All tc tests pass
- **SC-003**: Binary files are correctly detected and skipped

## sys.call Interface

```typescript
// Index all tracked files
sys.call("/body/fts/index", {})

// Index specific directory
sys.call("/body/fts/index", { path: "src/" })

// Force re-index everything
sys.call("/body/fts/index", { force: true })

// Success result
{
  status: "success",
  result: {
    indexed: 150,
    skipped: 20,
    deleted: 5,
    errors: 0
  },
  errors: null,
  meta: { path: "/body/fts/index", timestamp, duration_ms }
}

// Error (not initialized)
{
  status: "error",
  result: null,
  errors: {
    brane: [{ code: "not_initialized", message: "brane not initialized (run brane init)" }]
  },
  meta: { path: "/body/fts/index", timestamp, duration_ms }
}
```

## CLI Interface

```bash
# Index all tracked files
brane index

# Index specific directory
brane index src/
brane index tests/

# Force full re-index
brane index --force
brane index -f

# Raw mode
brane call /body/fts/index
brane call /body/fts/index '{"path": "src/"}'
brane call /body/fts/index '{"force": true}'
```

## Implementation Notes

### FTS5 Schema

```sql
-- FTS5 virtual table for full-text search
CREATE VIRTUAL TABLE IF NOT EXISTS files_fts USING fts5(
  url,
  content,
  content=''  -- external content mode (we manage content ourselves)
);

-- Track which files have been indexed and at what hash
CREATE TABLE IF NOT EXISTS files_fts_status (
  url TEXT PRIMARY KEY,
  indexed_hash TEXT NOT NULL
);
```

### Binary Detection

Use file content heuristics:
1. Check for null bytes in first 8KB
2. Check for valid UTF-8 encoding
3. Known binary extensions as fallback (.png, .jpg, .exe, etc.)

### Incremental Indexing

1. Get all tracked files from files table
2. For each file, check files_fts_status
3. If hash matches current hash, skip
4. If hash differs or missing, re-index
5. Clean up entries in files_fts_status for deleted files
