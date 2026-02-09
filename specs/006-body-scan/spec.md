# Feature Specification: body-scan

**Feature Branch**: `006-body-scan`
**Created**: 2026-01-27
**Status**: Draft
**Input**: Full directory scan: hash all files, update body.db

## User Scenarios & Testing

### User Story 1 - Scan Entire Project (Priority: P1)

A developer wants to sync brane's knowledge of all files in their project.
They run `brane scan` and brane discovers all files, computes hashes, and
updates body.db with new/modified files.

**Why this priority**: This is the primary way to bring brane up to date.
Essential for initial setup and periodic syncing.

**Independent Test**: Create files, run scan, verify all files added to body.db.

**Acceptance Scenarios**:

1. **Given** a project with files, **When** `brane scan` is called,
   **Then** all non-ignored files are added to body.db.

2. **Given** files already in body.db, **When** scan is called,
   **Then** modified files are updated and unchanged files remain.

3. **Given** files deleted from filesystem, **When** scan is called,
   **Then** they are removed from body.db (or marked deleted).

---

### User Story 2 - Scan Specific Directory (Priority: P2)

A developer wants to scan only a specific directory. They run
`brane scan src/` and only files under src/ are processed.

**Why this priority**: Focused scans are faster and useful for large projects.

**Independent Test**: Scan specific directory, verify only that directory's
files are processed.

**Acceptance Scenarios**:

1. **Given** files in `src/` and `tests/`, **When** `brane scan src/` is called,
   **Then** only `src/` files are added/updated.

---

### User Story 3 - Dry Run (Priority: P3)

A developer wants to see what would change without actually changing anything.
They run `brane scan --dry-run` and see the report.

**Why this priority**: Useful for understanding impact before committing,
but not essential for core functionality.

**Independent Test**: Run dry-run, verify no database changes, verify report
shows what would change.

**Acceptance Scenarios**:

1. **Given** dry run mode, **When** scan is called, **Then** no changes
   are made to body.db.

2. **Given** dry run mode, **When** scan completes, **Then** result shows
   what would be added/updated/deleted.

---

### Edge Cases

- What happens when `.brane/` is not initialized?
  → Return error with code `not_initialized`

- What happens with empty directory?
  → Return success with empty results

- What happens when body.db has files that no longer exist?
  → Remove them from body.db (clean up stale entries)

- What happens with permission errors on some files?
  → Skip those files, include in errors, continue scanning

## Requirements

### Functional Requirements

- **FR-001**: System MUST discover all files recursively from scan root
- **FR-002**: System MUST respect .gitignore and .braneignore patterns
- **FR-003**: System MUST exclude hidden files by default
- **FR-004**: System MUST compute SHA-256 hash for each file
- **FR-005**: System MUST add new files to body.db
- **FR-006**: System MUST update modified files in body.db
- **FR-007**: System MUST remove deleted files from body.db
- **FR-008**: System MUST support path parameter for focused scans
- **FR-009**: System MUST support dry_run parameter
- **FR-010**: System MUST return summary with added/updated/deleted/unchanged counts
- **FR-011**: System MUST require initialized `.brane/` directory

### Key Entities

- **ScanResult**: Summary of scan operation
  - `added`: Count of newly tracked files
  - `updated`: Count of modified files
  - `deleted`: Count of removed files
  - `unchanged`: Count of files with no changes
  - `errors`: Count of files that couldn't be processed

## Success Criteria

### Measurable Outcomes

- **SC-001**: Scan of 1000 files completes in <10s
- **SC-002**: All tc tests pass (full scan, path scan, dry run, errors)

## sys.call Interface

```typescript
// Full scan from cwd
sys.call("/body/scan", {})

// Scan specific directory
sys.call("/body/scan", { path: "src/" })

// Dry run (no changes)
sys.call("/body/scan", { dry_run: true })

// Include hidden files
sys.call("/body/scan", { hidden: true })

// Success result
{
  status: "success",
  result: {
    added: [
      { url: "file:///project/new-file.ts", hash: "...", size: 100 }
    ],
    updated: [
      { url: "file:///project/modified.ts", old_hash: "...", new_hash: "...", size: 200 }
    ],
    deleted: [
      { url: "file:///project/removed.ts" }
    ],
    unchanged: 45,
    summary: {
      added: 1,
      updated: 1,
      deleted: 1,
      unchanged: 45,
      errors: 0
    }
  },
  errors: null,
  meta: { path: "/body/scan", timestamp, duration_ms }
}

// Dry run result
{
  status: "success",
  result: {
    added: [...],
    updated: [...],
    deleted: [...],
    unchanged: 45,
    dry_run: true,
    summary: { ... }
  },
  errors: null,
  meta: { path: "/body/scan", timestamp, duration_ms }
}

// Error (not initialized)
{
  status: "error",
  result: null,
  errors: {
    brane: [{ code: "not_initialized", message: "brane not initialized (run brane init)" }]
  },
  meta: { path: "/body/scan", timestamp, duration_ms }
}
```

## CLI Interface

```bash
# Full scan
brane scan

# Scan specific directory
brane scan src/
brane scan tests/

# Dry run
brane scan --dry-run
brane scan -n

# Include hidden files
brane scan --hidden

# Raw mode
brane call /body/scan
brane call /body/scan '{"path": "src/"}'
brane call /body/scan '{"dry_run": true}'
```
