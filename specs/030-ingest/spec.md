# Feature Specification: Ingest

**Feature Branch**: `030-ingest`
**Created**: 2026-02-10
**Status**: Draft
**Input**: User description: "Unified brane ingest command that merges scan and extract into a single operation"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ingest a Single File (Priority: P1)

A developer adds a new source file to their project and wants Brane to understand it. They run `brane ingest src/auth.ts` and the file is indexed into body.db AND its concepts and relationships are extracted into mind.db in one step.

**Why this priority**: This is the atomic unit of the feature. If a user can ingest one file, they have a working system. Everything else builds on this.

**Independent Test**: Run `brane ingest src/auth.ts` on a file not yet tracked. Verify the file appears in body.db and concepts/edges appear in mind.db.

**Acceptance Scenarios**:

1. **Given** an initialized workspace with a source file not yet tracked, **When** user runs `brane ingest src/auth.ts`, **Then** the file is added to body.db AND concepts and edges are extracted into mind.db
2. **Given** a file already tracked in body.db whose content has changed, **When** user runs `brane ingest src/auth.ts`, **Then** the file hash is updated in body.db AND concepts/edges are re-extracted (replacing old provenance)
3. **Given** a file already tracked and unchanged, **When** user runs `brane ingest src/auth.ts`, **Then** the file is skipped with a message indicating it is up to date

---

### User Story 2 - Ingest a Directory (Priority: P2)

A developer wants to ingest an entire directory of files. They run `brane ingest src/` and all eligible files under that directory are indexed and extracted.

**Why this priority**: Directory ingestion is the natural workflow for onboarding a project. After single-file works, batch is the next critical step.

**Independent Test**: Run `brane ingest src/` on a directory with multiple files. Verify all files appear in body.db and all have concepts extracted.

**Acceptance Scenarios**:

1. **Given** a directory with 5 source files, **When** user runs `brane ingest src/`, **Then** all 5 files are indexed and extracted with per-file progress output
2. **Given** a directory where 3 files are new and 2 are unchanged, **When** user runs `brane ingest src/`, **Then** only the 3 new files are extracted (unchanged files are skipped)
3. **Given** a directory with files that match .gitignore or .braneignore patterns, **When** user runs `brane ingest src/`, **Then** ignored files are excluded

---

### User Story 3 - Dry Run Preview (Priority: P3)

A developer wants to see what ingestion would do without making changes. They run `brane ingest src/ --dry-run` and see a preview of files to be indexed and what concepts/edges would be extracted.

**Why this priority**: Dry run is essential for trust and debugging. Users need to preview before committing to LLM calls (which cost time and money).

**Independent Test**: Run `brane ingest src/auth.ts --dry-run`. Verify no changes to body.db or mind.db, but output shows what would happen.

**Acceptance Scenarios**:

1. **Given** untracked files, **When** user runs `brane ingest --dry-run`, **Then** they see which files would be added and what concepts/edges would be extracted, with no database changes
2. **Given** changed files, **When** user runs `brane ingest --dry-run`, **Then** they see which files would be updated and what concepts/edges would be re-extracted

---

### User Story 4 - Ingest Current Directory (Priority: P4)

A developer in their project root runs `brane ingest .` (or just `brane ingest` with no arguments) to ingest everything. This is the "just do it all" onboarding experience.

**Why this priority**: This is the simplest onboarding path. A new user runs `brane init && brane ingest` and has a populated knowledge graph.

**Independent Test**: Run `brane ingest` in a project root. Verify all eligible files are indexed and extracted.

**Acceptance Scenarios**:

1. **Given** an initialized workspace, **When** user runs `brane ingest` with no arguments, **Then** it defaults to `.` and ingests all eligible files in the current directory tree
2. **Given** a workspace not yet initialized, **When** user runs `brane ingest`, **Then** they see a clear error directing them to run `brane init` first

---

### Edge Cases

- What happens when a file exists on disk but is binary? Binary files are indexed in body.db (for tracking) but skipped for LLM extraction
- What happens when LLM extraction fails for one file in a batch? The error is reported for that file, remaining files continue processing, and a summary includes the failure
- What happens when the file is deleted between scan and extract within the same ingest? The file is still recorded in body.db (with its last-known hash) but extraction is skipped with a warning
- What happens with very large files (>100KB)? File content is truncated before sending to the LLM (existing behavior in the LLM backend)
- What happens when the workspace has no mind.db? Error directing user to run `brane init`

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a single `brane ingest <path>` command that indexes files into body.db and extracts concepts/edges into mind.db in one operation
- **FR-002**: System MUST accept a file path, directory path, or default to `.` when no path is given
- **FR-003**: System MUST skip files that are already tracked and unchanged (same hash) unless forced
- **FR-004**: System MUST re-extract concepts/edges for files whose content has changed since last ingestion
- **FR-005**: System MUST respect .gitignore and .braneignore exclusion patterns when ingesting directories
- **FR-006**: System MUST provide a `--dry-run` flag that previews changes without modifying any database
- **FR-007**: System MUST provide per-file progress output showing what was indexed and extracted
- **FR-008**: System MUST continue processing remaining files when extraction fails for an individual file, reporting errors in the summary
- **FR-009**: System MUST support `--json` output for programmatic consumption
- **FR-010**: System MUST use the current lens configuration (golden types/relations) to guide LLM extraction

### Key Entities

- **IngestResult**: Per-file results (file_url, indexed status, concepts extracted, edges extracted, errors) plus aggregate totals
- **IngestFile**: A file being processed — its URL, hash, content, and whether it's new/changed/unchanged

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can populate their knowledge graph from source files using a single command instead of two
- **SC-002**: Unchanged files are detected and skipped, avoiding unnecessary LLM calls
- **SC-003**: Ingesting a directory of 10 files completes with per-file progress visible to the user
- **SC-004**: A failed extraction for one file does not prevent other files from being processed
- **SC-005**: Dry run produces output without modifying body.db or mind.db

## Assumptions

- Both body.db and mind.db must be initialized before ingestion (`brane init`)
- The existing `/body/scan`, `/calabi/extract-llm`, and `/calabi/extract` handlers remain as internal primitives — ingest orchestrates them
- The `scan` and `extract` CLI commands remain available but `ingest` becomes the recommended user-facing command
- File eligibility (binary detection, ignore patterns) follows existing `/body/scan` behavior
- LLM extraction uses the existing CLI shell-out backend (`BRANE_LLM_MOCK=1` for tests)
