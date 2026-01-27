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

### User Story 2 - Add Multiple Paths (Files and Directories) (Priority: P1)

A developer wants to track multiple files and directories at once. They call
`/body/files/add` with an array of paths. Directories are recursively walked
to discover all files within.

**Why this priority**: Batch operations are essential for real-world usage.
Mixed file/directory input is the natural CLI interface.

**Independent Test**: Call `/body/files/add` with mix of files and directories,
verify all discovered files are added.

**Acceptance Scenarios**:

1. **Given** files `a.txt`, `b.txt` and directory `src/`, **When**
   `/body/files/add` is called with `{ "paths": ["a.txt", "b.txt", "src/"] }`,
   **Then** all files including those in `src/` are added to `body.db`.

2. **Given** a batch add, **When** result is returned, **Then** result contains
   array of all file records with summary counts.

3. **Given** a directory with nested subdirectories, **When** added, **Then**
   all files at all depths are discovered and added.

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

### User Story 4 - Respect Ignore Patterns (Priority: P2)

A developer adds a directory but wants to exclude files matching `.gitignore`
and `.braneignore` patterns. The system respects these patterns when walking
directories.

**Why this priority**: Without ignore support, users would track unwanted files
(node_modules, build artifacts, etc.).

**Independent Test**: Create directory with `.gitignore`, add directory, verify
ignored files are not added.

**Acceptance Scenarios**:

1. **Given** a directory with `.gitignore` containing `*.log`, **When**
   `/body/files/add` is called on the directory, **Then** `.log` files are
   not added.

2. **Given** a `.braneignore` file, **When** walking directories, **Then**
   patterns in `.braneignore` are also respected.

3. **Given** both `.gitignore` and `.braneignore`, **When** walking, **Then**
   both are combined (union of patterns).

---

### User Story 5 - Add File with Absolute Path (Priority: P3)

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

- What happens when file is not readable (permissions)?
  → Return error with code `permission_denied`

- What happens when `.brane/` is not initialized?
  → Return error with code `not_initialized`

- What happens with symlinks?
  → Follow symlinks, store the resolved path as URL

- What happens with mixed batch (some valid, some invalid)?
  → Process all valid files, return errors for invalid ones (partial success)

- What happens with hidden files (dotfiles)?
  → Excluded by default (e.g., `.env`, `.git/`)

- What happens with empty directories?
  → Silently skip (no files to add)

- What happens with circular symlinks?
  → Detect and skip with warning in errors

## Requirements

### Functional Requirements

- **FR-001**: System MUST accept single path via `path` parameter
- **FR-002**: System MUST accept multiple paths via `paths` array parameter
- **FR-003**: System MUST recursively walk directories to discover files
- **FR-004**: System MUST respect `.gitignore` patterns when walking directories
- **FR-005**: System MUST respect `.braneignore` patterns when walking directories
- **FR-006**: System MUST exclude hidden files/directories by default
- **FR-007**: System MUST accept `hidden: true` parameter to include hidden files
- **FR-008**: System MUST compute SHA-256 hash of file contents
- **FR-009**: System MUST store file size in bytes
- **FR-010**: System MUST store file mtime as unix timestamp
- **FR-011**: System MUST store URL as `file://` + absolute path
- **FR-012**: System MUST update existing records (UPSERT by URL)
- **FR-013**: System MUST return Result envelope with file record(s)
- **FR-014**: System MUST indicate `created: true` or `updated: true` per file
- **FR-015**: System MUST handle partial failures in batch operations
- **FR-016**: System MUST resolve relative paths to absolute before storing
- **FR-017**: System MUST require initialized `.brane/` directory
- **FR-018**: System MUST return summary with `added`, `updated`, `errors` counts

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
- **SC-004**: All tc tests pass (add, update, batch, directory, ignore, errors)

## sys.call Interface

```typescript
// Add single file
sys.call("/body/files/add", { path: "file.txt" })

// Add multiple paths (files and/or directories)
sys.call("/body/files/add", { paths: ["README.md", "src/", "tests/"] })

// Include hidden files
sys.call("/body/files/add", { paths: ["src/"], hidden: true })

// Success result (single file)
{
  status: "success",
  result: {
    files: [
      { id: 1, url: "file:///project/file.txt", hash: "abc123...", size: 1234, mtime: 1706345678, created: true }
    ],
    summary: { added: 1, updated: 0, errors: 0 }
  },
  errors: null,
  meta: { path: "/body/files/add", timestamp, duration_ms }
}

// Success result (mixed files and directories)
{
  status: "success",
  result: {
    files: [
      { id: 1, url: "file:///project/README.md", hash: "...", size: 100, mtime: 123, created: true },
      { id: 2, url: "file:///project/src/index.ts", hash: "...", size: 200, mtime: 456, created: true },
      { id: 3, url: "file:///project/src/lib/util.ts", hash: "...", size: 300, mtime: 789, updated: true },
      { id: 4, url: "file:///project/tests/main.test.ts", hash: "...", size: 400, mtime: 101, created: true }
    ],
    summary: { added: 3, updated: 1, errors: 0 }
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
      { id: 1, url: "file:///project/a.txt", hash: "...", size: 100, mtime: 123, created: true }
    ],
    summary: { added: 1, updated: 0, errors: 1 }
  },
  errors: {
    paths: {
      "b.txt": [{ code: "not_found", message: "file does not exist" }]
    }
  },
  meta: { path: "/body/files/add", timestamp, duration_ms }
}
```

## CLI Interface

The CLI provides a clean, Unix-style interface for everyday use.

```bash
# Add files (like git add)
brane add foo.txt
brane add foo.txt bar.js src/
brane add .
brane add --hidden src/

# Other commands (for reference)
brane init                  # → /body/init
brane init /path/to/project
brane status                # → /body/files/status (future)
brane ls                    # → /body/files/list (future)
brane scan                  # → /body/scan (future)
```

**Raw Mode:**

For scripting, debugging, or direct access to any handler:

```bash
# Raw sys.call access
brane call /body/files/add '{"paths": ["src/"]}'
brane call /body/init
brane call /body/init '{"path": "/tmp/foo"}'

# Pipe JSON input
echo '{"paths": ["a.txt", "b.txt"]}' | brane call /body/files/add
```

**CLI → sys.call Mapping:**

| CLI Command | sys.call Path |
|-------------|---------------|
| `brane init` | `/body/init` |
| `brane add` | `/body/files/add` |
| `brane status` | `/body/files/status` |
| `brane ls` | `/body/files/list` |
| `brane scan` | `/body/scan` |
| `brane call <path>` | `<path>` (raw) |
