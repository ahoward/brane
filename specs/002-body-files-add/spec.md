# Feature Specification: body-files-add

**Feature Branch**: `002-body-files-add`
**Created**: 2026-01-27
**Status**: Draft
**Input**: Add files to body.db with url, hash, size, mtime

## User Scenarios & Testing

### User Story 1 - Add a Single File (Priority: P1)

A developer wants to track a file in their project. They call `/body/files/add`
with a file path. The system computes the file's hash, size, and mtime, then
stores a record in `body.db` with a `file://` URL.

**Why this priority**: This is the core operation. All file tracking starts
with adding files. Without this, brane cannot track anything.

**Independent Test**: Call `/body/files/add` with a valid file path, verify
the file record appears in `body.db` with correct url, hash, size, mtime.

**Acceptance Scenarios**:

1. **Given** an initialized `.brane/` and a file `foo.txt`, **When**
   `/body/files/add` is called with `{ "path": "foo.txt" }`, **Then** a record
   is inserted into `files` table with `file://` URL.

2. **Given** a file added to body.db, **When** querying the `files` table,
   **Then** the record contains correct SHA-256 hash, byte size, and mtime.

3. **Given** a successful add, **When** result is returned, **Then** status
   is `"success"` with the file record in result.

---

### User Story 2 - Add Multiple Files (Priority: P1)

A developer wants to track multiple files at once. They call `/body/files/add`
with an array of paths. The system processes all files and returns results
for each.

**Why this priority**: Batch operations are essential for real-world usage.
Adding files one-by-one would be too slow for any meaningful project.

**Independent Test**: Call `/body/files/add` with multiple paths, verify all
files are added and results include all records.

**Acceptance Scenarios**:

1. **Given** files `a.txt`, `b.txt`, `c.txt`, **When** `/body/files/add` is
   called with `{ "paths": ["a.txt", "b.txt", "c.txt"] }`, **Then** all three
   files are added to `body.db`.

2. **Given** a batch add, **When** result is returned, **Then** result contains
   array of file records matching input order.

---

### User Story 3 - Update Existing File (Priority: P2)

A developer modifies a tracked file and wants to update its record. They call
`/body/files/add` with the same path. The system detects the file changed
(different hash/size/mtime) and updates the existing record.

**Why this priority**: Files change constantly. The system must handle updates
gracefully without creating duplicates.

**Independent Test**: Add a file, modify it, add again, verify single record
with updated hash/size/mtime.

**Acceptance Scenarios**:

1. **Given** a file already in body.db, **When** the file is modified and
   `/body/files/add` is called, **Then** the existing record is updated
   (not duplicated).

2. **Given** an update operation, **When** result is returned, **Then** result
   indicates `updated: true` vs `created: true`.

---

### User Story 4 - Add File with Absolute Path (Priority: P3)

A developer wants to track a file outside the current directory using an
absolute path.

**Why this priority**: Useful for tracking external dependencies or shared
files, but most usage will be relative paths within project.

**Independent Test**: Call `/body/files/add` with absolute path, verify
record created with correct `file://` URL.

**Acceptance Scenarios**:

1. **Given** an absolute path `/tmp/external.txt`, **When** `/body/files/add`
   is called, **Then** record is created with `file:///tmp/external.txt` URL.

---

### Edge Cases

- What happens when file doesn't exist?
  → Return error with code `not_found` for that path

- What happens when path is a directory?
  → Return error with code `not_a_file` (use `/body/scan` for directories)

- What happens when file is not readable (permissions)?
  → Return error with code `permission_denied`

- What happens when `.brane/` is not initialized?
  → Return error with code `not_initialized`

- What happens with symlinks?
  → Follow symlinks, store the resolved path as URL

- What happens with mixed batch (some valid, some invalid)?
  → Process all valid files, return errors for invalid ones (partial success)

## Requirements

### Functional Requirements

- **FR-001**: System MUST accept single path via `path` parameter
- **FR-002**: System MUST accept multiple paths via `paths` array parameter
- **FR-003**: System MUST compute SHA-256 hash of file contents
- **FR-004**: System MUST store file size in bytes
- **FR-005**: System MUST store file mtime as unix timestamp
- **FR-006**: System MUST store URL as `file://` + absolute path
- **FR-007**: System MUST update existing records (UPSERT by URL)
- **FR-008**: System MUST return Result envelope with file record(s)
- **FR-009**: System MUST indicate `created: true` or `updated: true` per file
- **FR-010**: System MUST handle partial failures in batch operations
- **FR-011**: System MUST resolve relative paths to absolute before storing
- **FR-012**: System MUST require initialized `.brane/` directory

### Key Entities

- **FileRecord**: Row in `files` table
  - `id`: INTEGER PRIMARY KEY (auto-increment)
  - `url`: TEXT NOT NULL UNIQUE (`file:///absolute/path`)
  - `hash`: TEXT NOT NULL (SHA-256 hex string, 64 chars)
  - `size`: INTEGER NOT NULL (bytes)
  - `mtime`: INTEGER NOT NULL (unix timestamp seconds)

## Success Criteria

### Measurable Outcomes

- **SC-001**: Single file add completes in <50ms for files <1MB
- **SC-002**: Batch add of 100 files completes in <5s
- **SC-003**: Hash computation matches `sha256sum` output
- **SC-004**: All tc tests pass (add, update, batch, errors)

## sys.call Interface

```typescript
// Add single file
sys.call("/body/files/add", { path: "relative/or/absolute/path.txt" })

// Add multiple files
sys.call("/body/files/add", { paths: ["a.txt", "b.txt", "c.txt"] })

// Success result (single)
{
  status: "success",
  result: {
    file: {
      id: 1,
      url: "file:///absolute/path/to/file.txt",
      hash: "abc123...",
      size: 1234,
      mtime: 1706345678
    },
    created: true  // or updated: true
  },
  errors: null,
  meta: { path: "/body/files/add", timestamp, duration_ms }
}

// Success result (batch)
{
  status: "success",
  result: {
    files: [
      { id: 1, url: "file:///path/a.txt", hash: "...", size: 100, mtime: 123, created: true },
      { id: 2, url: "file:///path/b.txt", hash: "...", size: 200, mtime: 456, updated: true }
    ]
  },
  errors: null,
  meta: { path: "/body/files/add", timestamp, duration_ms }
}

// Error result (file not found)
{
  status: "error",
  result: null,
  errors: {
    path: [{ code: "not_found", message: "file does not exist: foo.txt" }]
  },
  meta: { path: "/body/files/add", timestamp, duration_ms }
}

// Partial success (batch with some failures)
{
  status: "success",
  result: {
    files: [
      { id: 1, url: "file:///path/a.txt", hash: "...", size: 100, mtime: 123, created: true }
    ]
  },
  errors: {
    paths: {
      "b.txt": [{ code: "not_found", message: "file does not exist" }]
    }
  },
  meta: { path: "/body/files/add", timestamp, duration_ms }
}
```
