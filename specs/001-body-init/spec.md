# Feature Specification: body-init

**Feature Branch**: `001-body-init`
**Created**: 2026-01-27
**Status**: Draft
**Input**: Initialize .brane/ directory structure and empty body.db

## User Scenarios & Testing

### User Story 1 - Initialize Brane in a Project (Priority: P1)

A developer runs `brane init` (or calls `/body/init`) in their project root.
The system creates the `.brane/` directory with an empty `body.db` SQLite
database, ready to track files.

**Why this priority**: This is the foundation. Nothing else works without
initialization. Every other body feature depends on having a valid `.brane/`
directory and `body.db`.

**Independent Test**: Call `/body/init` in a temp directory, verify `.brane/`
exists with `body.db` inside. Database should be valid SQLite with correct
schema.

**Acceptance Scenarios**:

1. **Given** a directory without `.brane/`, **When** `/body/init` is called,
   **Then** `.brane/` directory is created with `body.db` inside.

2. **Given** a directory without `.brane/`, **When** `/body/init` is called,
   **Then** `body.db` contains the `files` table with correct schema.

3. **Given** a directory without `.brane/`, **When** `/body/init` is called,
   **Then** result status is `"success"` with path to `.brane/` in result.

---

### User Story 2 - Idempotent Re-initialization (Priority: P2)

A developer accidentally runs `brane init` in an already-initialized project.
The system recognizes the existing `.brane/` and returns success without
destroying existing data.

**Why this priority**: Users will do this. It should be safe. Data loss on
accidental re-init would be catastrophic.

**Independent Test**: Initialize once, add some data, initialize again,
verify data survives.

**Acceptance Scenarios**:

1. **Given** a directory with existing `.brane/body.db`, **When** `/body/init`
   is called, **Then** existing database is preserved (not truncated).

2. **Given** a directory with existing `.brane/body.db`, **When** `/body/init`
   is called, **Then** result status is `"success"`.

---

### User Story 3 - Init with Custom Path (Priority: P3)

A developer wants to initialize brane in a non-cwd location, passing an
explicit path parameter.

**Why this priority**: Useful but not essential for MVP. Most users will
init in cwd.

**Independent Test**: Call `/body/init` with `{ "path": "/tmp/foo" }`, verify
`.brane/` created at that location.

**Acceptance Scenarios**:

1. **Given** params `{ "path": "/some/dir" }`, **When** `/body/init` is called,
   **Then** `.brane/` is created at `/some/dir/.brane/`.

2. **Given** params `{ "path": "/nonexistent" }`, **When** `/body/init` is called,
   **Then** result status is `"error"` with appropriate message.

---

### Edge Cases

- What happens when `.brane/` exists but `body.db` is missing?
  → Create `body.db`, preserve any other files in `.brane/`

- What happens when `body.db` exists but is corrupted/not-sqlite?
  → Return error, do not overwrite (user must manually fix)

- What happens when filesystem is read-only?
  → Return error with clear message

- What happens when path param points to a file, not directory?
  → Return error with clear message

## Requirements

### Functional Requirements

- **FR-001**: System MUST create `.brane/` directory if it doesn't exist
- **FR-002**: System MUST create `body.db` SQLite database in WAL mode
- **FR-003**: System MUST create `files` table with schema:
  - `id` INTEGER PRIMARY KEY
  - `path` TEXT NOT NULL UNIQUE
  - `hash` TEXT NOT NULL
  - `size` INTEGER NOT NULL
  - `mtime` INTEGER NOT NULL (unix timestamp)
- **FR-004**: System MUST be idempotent (safe to run multiple times)
- **FR-005**: System MUST NOT destroy existing data on re-init
- **FR-006**: System MUST return Result envelope with path to `.brane/` on success
- **FR-007**: System MUST accept optional `path` parameter (default: cwd)

### Key Entities

- **BraneDir**: The `.brane/` directory, container for all brane state
- **BodyDB**: SQLite database (`body.db`) storing file physical reality
- **FileRecord**: Row in `files` table representing a tracked file

## Success Criteria

### Measurable Outcomes

- **SC-001**: `/body/init` creates valid `.brane/body.db` in <100ms
- **SC-002**: Re-running `/body/init` preserves 100% of existing data
- **SC-003**: All tc tests pass (success cases, idempotency, error cases)

## sys.call Interface

```typescript
// Initialize brane in a directory
sys.call("/body/init", { path?: string })

// Success result
{
  status: "success",
  result: {
    path: "/absolute/path/to/.brane",
    created: true | false  // true if newly created, false if existed
  },
  errors: null,
  meta: { path: "/body/init", timestamp, duration_ms }
}

// Error result (e.g., path doesn't exist)
{
  status: "error",
  result: null,
  errors: {
    path: [{ code: "not_found", message: "directory does not exist" }]
  },
  meta: { path: "/body/init", timestamp, duration_ms }
}
```
