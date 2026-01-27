# Feature Specification: body-files-list

**Feature Branch**: `003-body-files-list`
**Created**: 2026-01-27
**Status**: Draft
**Input**: List tracked files from body.db

## User Scenarios & Testing

### User Story 1 - List All Tracked Files (Priority: P1)

A developer wants to see all files currently tracked by brane. They run
`brane ls` and see a list of all files in body.db.

**Why this priority**: Basic visibility into what brane knows about. Without
this, users have no way to verify what's tracked.

**Independent Test**: Add some files, run list, verify all added files appear.

**Acceptance Scenarios**:

1. **Given** files tracked in body.db, **When** `/body/files/list` is called,
   **Then** all tracked files are returned with their metadata.

2. **Given** an empty body.db, **When** `/body/files/list` is called,
   **Then** an empty files array is returned.

3. **Given** tracked files, **When** result is returned, **Then** each file
   includes id, url, hash, size, mtime.

---

### User Story 2 - List Files in a Directory (Priority: P2)

A developer wants to see only files tracked under a specific directory.
They run `brane ls src/` and see files matching that prefix.

**Why this priority**: Large projects need filtering. Listing everything
would be overwhelming.

**Independent Test**: Add files in multiple directories, list with path filter,
verify only matching files returned.

**Acceptance Scenarios**:

1. **Given** files in `src/` and `tests/`, **When** `/body/files/list` is
   called with `{ "path": "src/" }`, **Then** only `src/` files are returned.

2. **Given** a path filter, **When** matching files exist, **Then** files
   with URLs starting with that prefix are returned.

---

### User Story 3 - List with Pattern Matching (Priority: P3)

A developer wants to find all TypeScript files tracked. They run
`brane ls "*.ts"` and see matching files.

**Why this priority**: Useful for targeted queries, but path filtering
covers most use cases.

**Independent Test**: Add various file types, list with glob pattern,
verify only matching files returned.

**Acceptance Scenarios**:

1. **Given** mixed file types, **When** `/body/files/list` is called with
   `{ "pattern": "*.ts" }`, **Then** only `.ts` files are returned.

---

### Edge Cases

- What happens when `.brane/` is not initialized?
  → Return error with code `not_initialized`

- What happens with invalid path filter?
  → Return empty array (no matches)

- What happens with no tracked files?
  → Return empty array with summary showing count: 0

## Requirements

### Functional Requirements

- **FR-001**: System MUST list all tracked files when no filter specified
- **FR-002**: System MUST filter by path prefix when `path` parameter provided
- **FR-003**: System MUST filter by glob pattern when `pattern` parameter provided
- **FR-004**: System MUST return file metadata: id, url, hash, size, mtime
- **FR-005**: System MUST return summary with total count
- **FR-006**: System MUST require initialized `.brane/` directory
- **FR-007**: System MUST sort files by URL for deterministic output

### Key Entities

- **FileRecord**: Row in `files` table (same as add)
  - `id`: INTEGER PRIMARY KEY
  - `url`: TEXT NOT NULL UNIQUE
  - `hash`: TEXT NOT NULL
  - `size`: INTEGER NOT NULL
  - `mtime`: INTEGER NOT NULL

## Success Criteria

### Measurable Outcomes

- **SC-001**: List of 1000 files completes in <100ms
- **SC-002**: All tc tests pass (list all, filter path, filter pattern, empty, errors)

## sys.call Interface

```typescript
// List all files
sys.call("/body/files/list", {})

// List files in directory
sys.call("/body/files/list", { path: "src/" })

// List files matching pattern
sys.call("/body/files/list", { pattern: "*.ts" })

// Success result
{
  status: "success",
  result: {
    files: [
      { id: 1, url: "file:///project/README.md", hash: "...", size: 100, mtime: 123 },
      { id: 2, url: "file:///project/src/index.ts", hash: "...", size: 200, mtime: 456 }
    ],
    summary: { count: 2 }
  },
  errors: null,
  meta: { path: "/body/files/list", timestamp, duration_ms }
}

// Empty result
{
  status: "success",
  result: {
    files: [],
    summary: { count: 0 }
  },
  errors: null,
  meta: { path: "/body/files/list", timestamp, duration_ms }
}

// Error (not initialized)
{
  status: "error",
  result: null,
  errors: {
    brane: [{ code: "not_initialized", message: "brane not initialized (run brane init)" }]
  },
  meta: { path: "/body/files/list", timestamp, duration_ms }
}
```

## CLI Interface

```bash
# List all tracked files
brane ls

# List files in directory
brane ls src/
brane ls tests/

# List files matching pattern
brane ls "*.ts"
brane ls "src/**/*.js"

# Raw mode
brane call /body/files/list
brane call /body/files/list '{"path": "src/"}'
```
