# Feature Specification: body-files-status

**Feature Branch**: `004-body-files-status`
**Created**: 2026-01-27
**Status**: Draft
**Input**: Show changed/new/deleted files vs body.db

## User Scenarios & Testing

### User Story 1 - See What's Changed (Priority: P1)

A developer wants to see which tracked files have been modified since they
were added to brane. They run `brane status` and see files grouped by state:
modified, new (untracked), deleted (missing).

**Why this priority**: Core workflow. This is how users know what needs
attention - like `git status` for brane.

**Independent Test**: Add files, modify one, delete one, create new one,
run status, verify correct categorization.

**Acceptance Scenarios**:

1. **Given** a tracked file that was modified, **When** `/body/files/status`
   is called, **Then** the file appears in `modified` list.

2. **Given** a tracked file that was deleted, **When** `/body/files/status`
   is called, **Then** the file appears in `deleted` list.

3. **Given** a file not in body.db, **When** `/body/files/status` is called
   with scan enabled, **Then** the file appears in `new` list.

---

### User Story 2 - Status of Specific Path (Priority: P2)

A developer wants to check status of only files in a specific directory.
They run `brane status src/` and see status limited to that path.

**Why this priority**: Large projects need filtering to focus on relevant
changes.

**Independent Test**: Create changes in multiple directories, run status
with path filter, verify only matching files shown.

**Acceptance Scenarios**:

1. **Given** changes in `src/` and `tests/`, **When** `/body/files/status`
   is called with `{ "path": "src/" }`, **Then** only `src/` changes shown.

---

### User Story 3 - Quick Status (Priority: P2)

A developer wants a fast status check that only looks at tracked files
(no filesystem scan for new files). They run `brane status --quick`.

**Why this priority**: Full scan can be slow on large projects. Quick mode
covers the common case of checking tracked files only.

**Independent Test**: Run status with quick mode, verify new files not
detected but modified/deleted are.

**Acceptance Scenarios**:

1. **Given** quick mode enabled, **When** status is called, **Then** new
   untracked files are not reported.

2. **Given** quick mode enabled, **When** status is called, **Then**
   modified and deleted tracked files are still reported.

---

### Edge Cases

- What happens when `.brane/` is not initialized?
  → Return error with code `not_initialized`

- What happens when no changes exist?
  → Return empty arrays for all categories with clean: true

- What happens with files that have same content but different mtime?
  → Compare by hash, not mtime - file is unchanged if hash matches

## Requirements

### Functional Requirements

- **FR-001**: System MUST detect modified files (hash changed)
- **FR-002**: System MUST detect deleted files (tracked but missing)
- **FR-003**: System MUST detect new files (exists but not tracked) when scan enabled
- **FR-004**: System MUST support path filtering
- **FR-005**: System MUST support quick mode (skip new file detection)
- **FR-006**: System MUST return summary with counts per category
- **FR-007**: System MUST indicate `clean: true` when no changes
- **FR-008**: System MUST require initialized `.brane/` directory
- **FR-009**: System MUST respect .gitignore and .braneignore when scanning for new files

### Key Entities

- **StatusResult**: Contains arrays of files by category
  - `modified`: Files with different hash than stored
  - `deleted`: Files in db but not on filesystem
  - `new`: Files on filesystem but not in db (when scan enabled)

## Success Criteria

### Measurable Outcomes

- **SC-001**: Status of 1000 tracked files completes in <500ms (quick mode)
- **SC-002**: All tc tests pass (modified, deleted, new, clean, filtered, quick)

## sys.call Interface

```typescript
// Full status (includes scan for new files)
sys.call("/body/files/status", {})

// Status of specific path
sys.call("/body/files/status", { path: "src/" })

// Quick mode (tracked files only, no scan)
sys.call("/body/files/status", { quick: true })

// Success result
{
  status: "success",
  result: {
    modified: [
      { url: "file:///project/src/index.ts", old_hash: "abc...", new_hash: "def..." }
    ],
    deleted: [
      { url: "file:///project/old-file.ts", hash: "ghi..." }
    ],
    new: [
      { path: "src/new-file.ts" }
    ],
    summary: {
      modified: 1,
      deleted: 1,
      new: 1,
      clean: false
    }
  },
  errors: null,
  meta: { path: "/body/files/status", timestamp, duration_ms }
}

// Clean result (no changes)
{
  status: "success",
  result: {
    modified: [],
    deleted: [],
    new: [],
    summary: {
      modified: 0,
      deleted: 0,
      new: 0,
      clean: true
    }
  },
  errors: null,
  meta: { path: "/body/files/status", timestamp, duration_ms }
}

// Error (not initialized)
{
  status: "error",
  result: null,
  errors: {
    brane: [{ code: "not_initialized", message: "brane not initialized (run brane init)" }]
  },
  meta: { path: "/body/files/status", timestamp, duration_ms }
}
```

## CLI Interface

```bash
# Full status
brane status

# Status of specific path
brane status src/
brane status tests/

# Quick mode (tracked files only)
brane status --quick
brane status -q

# Raw mode
brane call /body/files/status
brane call /body/files/status '{"path": "src/"}'
brane call /body/files/status '{"quick": true}'
```
