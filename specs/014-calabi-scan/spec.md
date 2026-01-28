# Feature Specification: calabi-scan

**Feature Branch**: `014-calabi-scan`
**Created**: 2026-01-28
**Status**: Draft
**Input**: Scan dirty files, extract to mind.db

## Overview

The Calabi scan handler orchestrates the extraction process across dirty files.
It identifies files that need extraction (new or modified), reads their content,
and applies extraction patches to mind.db.

For this initial implementation, extraction is simplified to create a basic
concept per file (Entity type, name derived from filename). This establishes
the orchestration infrastructure while deferring LLM integration to a future
enhancement.

## Architecture

```
/calabi/scan
    ↓
Find dirty files (body/files/status)
    ↓
For each dirty file:
    1. Read file content
    2. Generate extraction patch (currently: simple concept per file)
    3. Apply via /calabi/extract
    ↓
Return scan summary
```

## User Scenarios & Testing

### User Story 1 - Scan New Files (Priority: P1)

When new files are added to the body, scanning should create concepts for them.

**Why this priority**: Core functionality - new files need extraction.

**Independent Test**: Add file to body, run scan, verify concept created.

**Acceptance Scenarios**:

1. **Given** a new file in body.db with no extraction, **When** scan is called,
   **Then** concept is created and provenance link established.

2. **Given** multiple new files, **When** scan is called, **Then** all files
   are processed and concepts created.

---

### User Story 2 - Scan Modified Files (Priority: P1)

When existing files are modified (hash changed), scanning should re-extract.

**Why this priority**: Files change - extraction must stay current.

**Independent Test**: Modify tracked file, run scan, verify re-extraction.

**Acceptance Scenarios**:

1. **Given** a modified file (different hash in body.db vs provenance marker),
   **When** scan is called, **Then** old concepts are updated/replaced.

---

### User Story 3 - Scan Path Filter (Priority: P2)

User wants to scan only specific paths, not the entire body.

**Why this priority**: Useful for incremental work on large codebases.

**Independent Test**: Add multiple files, scan with path filter, verify only
matching files processed.

**Acceptance Scenarios**:

1. **Given** files in different directories, **When** scan is called with path
   filter, **Then** only matching files are processed.

---

### User Story 4 - Dry Run Mode (Priority: P2)

User wants to preview what would be scanned without making changes.

**Why this priority**: Allows inspection before committing changes.

**Independent Test**: Run scan with dry_run, verify no changes made.

**Acceptance Scenarios**:

1. **Given** dirty files exist, **When** scan is called with dry_run=true,
   **Then** files are listed but no extraction applied.

---

### Edge Cases

- What happens when mind.db is not initialized?
  → Return error with code `not_initialized`

- What happens when body.db is not initialized?
  → Return error with code `not_initialized`

- What happens when no dirty files exist?
  → Return success with files_scanned: 0

- What happens if extraction fails for one file?
  → Continue with other files, report partial success

## Requirements

### Functional Requirements

- **FR-001**: System MUST identify files needing extraction (new or modified)
- **FR-002**: System MUST read file content for extraction
- **FR-003**: System MUST generate extraction patch (simplified: filename → concept)
- **FR-004**: System MUST apply extraction via /calabi/extract
- **FR-005**: System MUST track extraction state (which files have been extracted)
- **FR-006**: System MUST support path filtering
- **FR-007**: System MUST support dry run mode
- **FR-008**: System MUST require initialized mind.db and body.db

### Key Entities

- **ScanResult**: Summary of scan operation
  - `files_scanned`: Number of files processed
  - `concepts_created`: Total concepts created
  - `concepts_reused`: Total concepts reused
  - `edges_created`: Total edges created
  - `errors`: Array of per-file errors (if any)

### Extraction State Tracking

To track which files have been extracted, we use the `files_fts_status` table
in body.db (already exists for FTS indexing). We add a column or use a parallel
approach to track extraction state.

Alternative: Use provenance links - if file has provenance links, it's been
extracted. Re-extraction triggered when file hash differs from when provenance
was created.

For simplicity, we use provenance links as the state marker. A file needs
extraction if:
1. File exists in body.db AND no provenance links exist for it, OR
2. File exists in body.db AND file hash differs from last extraction

## Success Criteria

### Measurable Outcomes

- **SC-001**: Scan of 100 files completes in <5s
- **SC-002**: All tc tests pass

## sys.call Interface

```typescript
// Full scan
sys.call("/calabi/scan", {})

// Success result
{
  status: "success",
  result: {
    files_scanned: 3,
    concepts_created: 3,
    concepts_reused: 0,
    edges_created: 0
  },
  errors: null,
  meta: { path: "/calabi/scan", timestamp, duration_ms }
}

// Scan with path filter
sys.call("/calabi/scan", { path: "src/" })

// Dry run
sys.call("/calabi/scan", { dry_run: true })

// Success result (dry run)
{
  status: "success",
  result: {
    files_to_scan: ["file:///path/to/auth.ts", "file:///path/to/login.ts"],
    dry_run: true
  },
  errors: null,
  meta: { path: "/calabi/scan", timestamp, duration_ms }
}

// Partial success (some files failed)
{
  status: "success",
  result: {
    files_scanned: 2,
    concepts_created: 2,
    concepts_reused: 0,
    edges_created: 0,
    errors: [
      { file_url: "file:///path/to/broken.ts", error: "file not readable" }
    ]
  },
  errors: null,
  meta: { path: "/calabi/scan", timestamp, duration_ms }
}

// Error (not initialized)
{
  status: "error",
  result: null,
  errors: {
    mind: [{ code: "not_initialized", message: "mind not initialized" }]
  },
  meta: { path: "/calabi/scan", timestamp, duration_ms }
}
```

## Implementation Notes

### Algorithm

```
1. Validate mind.db and body.db are initialized
2. Get all files from body.db (with optional path filter)
3. For each file:
   a. Check if file has provenance links
   b. If no provenance → needs extraction
   c. If has provenance → check if hash changed (future enhancement)
4. If dry_run, return list of files to scan
5. For each file needing extraction:
   a. Generate extraction patch (simplified: filename → Entity concept)
   b. Call /calabi/extract with patch
   c. Track results/errors
6. Return summary
```

### Simplified Extraction

For this initial version, extraction creates a single concept per file:
- Name: Filename without extension (e.g., "auth.ts" → "auth")
- Type: "Entity"

This establishes the infrastructure. LLM-based extraction can be added later
by replacing the extraction function.

### Tracking Extraction State

Initially, we use a simple heuristic: a file needs extraction if it has no
provenance links to any concepts. More sophisticated tracking (hash-based
re-extraction) can be added later.
