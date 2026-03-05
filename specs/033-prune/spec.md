# Feature Specification: Prune Orphaned Knowledge

**Feature Branch**: `033-prune`
**Created**: 2026-03-05
**Status**: Draft
**Input**: User description: "033-prune: brane prune command to clean orphaned concepts/edges from mind.db when source files are deleted or re-extracted"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Prune after file deletion (Priority: P1)

A user deletes source files from their project. The concepts and edges extracted from those files still exist in mind.db. The user runs `brane prune` to remove concepts whose provenance points to files that no longer exist in body.db. Edges connected to pruned concepts are also removed.

**Why this priority**: Core use case. Without this, the knowledge graph accumulates stale data indefinitely, producing false positives on `brane verify`.

**Independent Test**: Delete a tracked file, run `brane prune`, verify concepts from that file are gone and edges referencing them are gone.

**Acceptance Scenarios**:

1. **Given** a graph with concepts extracted from `src/auth.ts`, **When** `src/auth.ts` is deleted and the user runs `brane prune`, **Then** concepts with provenance pointing only to `src/auth.ts` are removed, edges referencing those concepts are removed, and provenance records are removed.
2. **Given** a concept with provenance from multiple files (one deleted, one still present), **When** the user runs `brane prune`, **Then** the concept is NOT removed (it still has valid provenance).
3. **Given** no stale provenance, **When** the user runs `brane prune`, **Then** the command reports 0 removals and exits cleanly.

---

### User Story 2 - Dry run (Priority: P1)

A user wants to see what `brane prune` would remove before actually removing it.

**Why this priority**: Destructive operations need a preview mode. Users must be able to audit before committing.

**Independent Test**: Run `brane prune --dry-run`, verify it reports what would be removed without modifying mind.db.

**Acceptance Scenarios**:

1. **Given** stale provenance exists, **When** the user runs `brane prune --dry-run`, **Then** the command lists concepts, edges, and provenance that would be removed, but mind.db is unchanged.
2. **Given** the dry run output, **When** the user then runs `brane prune` (without `--dry-run`), **Then** the actual removals match the dry run report.

---

### User Story 3 - Prune after re-extraction (Priority: P2)

A user re-ingests a file that was previously extracted. The new extraction produces different concepts. Old concepts that were only referenced by the previous extraction of that file become orphaned. The user runs `brane prune` to clean them up.

**Why this priority**: Common workflow — file is edited, re-ingested, old concepts linger. Less urgent than file deletion because the old concepts may still be partially valid.

**Independent Test**: Ingest a file, re-ingest with different content (producing different concepts), run `brane prune`, verify old-only concepts are removed.

**Acceptance Scenarios**:

1. **Given** `src/auth.ts` was ingested producing concept `AuthService`, then the file is edited and re-ingested producing concept `AuthManager` instead, **When** the user runs `brane prune`, **Then** `AuthService` is removed (no remaining provenance), `AuthManager` is kept, and edges to `AuthService` are removed.

---

### User Story 4 - Prune respects manually created concepts (Priority: P2)

A user has manually created concepts (no provenance records). These must never be pruned — only concepts with provenance pointing to missing files are candidates.

**Why this priority**: Data safety. Users who curate their graph by hand must not lose work.

**Independent Test**: Create a concept manually (no provenance), run `brane prune`, verify the manual concept is untouched.

**Acceptance Scenarios**:

1. **Given** a manually created concept with no provenance, **When** the user runs `brane prune`, **Then** the concept is not removed.
2. **Given** a concept with both manual edges and stale provenance edges, **When** the stale provenance is pruned, **Then** the concept itself survives if it has any remaining provenance or no provenance at all, but edges to pruned concepts are removed.

---

### Edge Cases

- What happens when mind.db has concepts but body.db doesn't exist? Error: brane not initialized.
- What happens when a concept has provenance to a file that was never tracked in body.db? The provenance is stale — the concept is a prune candidate (file_url not in body.db files).
- What happens when an edge connects two concepts and only one is pruned? The edge is removed (dangling edges are invalid).
- What happens when pruning would remove all concepts? Works fine — reports the count, graph is empty.
- What happens concurrently with ingest? Prune should be run when ingest is not running. No locking mechanism required — user responsibility (same as git).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST identify concepts whose only provenance points to file_urls not present in body.db.
- **FR-002**: System MUST remove identified orphan concepts from mind.db.
- **FR-003**: System MUST remove edges where either source or target concept was pruned.
- **FR-004**: System MUST remove provenance records pointing to file_urls not present in body.db.
- **FR-005**: System MUST NOT remove concepts that have no provenance (manually created).
- **FR-006**: System MUST NOT remove concepts that have at least one provenance record pointing to a file_url still present in body.db.
- **FR-007**: System MUST support a `--dry-run` flag that reports what would be removed without modifying mind.db.
- **FR-008**: System MUST report counts of removed concepts, edges, and provenance records.
- **FR-009**: System MUST work with the active lens (lens-aware path resolution).
- **FR-010**: System MUST return the standard result envelope.

### Key Entities

- **Orphan Concept**: A concept where ALL provenance records point to file_urls not present in body.db's files table.
- **Dangling Edge**: An edge where either the source or target concept has been pruned.
- **Stale Provenance**: A provenance record whose file_url is not present in body.db's files table.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After pruning, zero concepts remain with provenance pointing exclusively to deleted files.
- **SC-002**: After pruning, zero edges exist where either endpoint concept was removed.
- **SC-003**: After pruning, zero provenance records point to file_urls absent from body.db.
- **SC-004**: Dry run output exactly matches subsequent actual prune results.
- **SC-005**: Manually created concepts (no provenance) are never removed by prune.
- **SC-006**: Prune completes in under 5 seconds for graphs with up to 10,000 concepts.

## Assumptions

- Prune operates on the active lens only (uses `resolve_lens_paths()`).
- body.db's `files` table is the source of truth for which file_urls are currently valid.
- A concept is an orphan candidate only if it has provenance records AND all of them are stale.
- Concepts with zero provenance records are manual and are never pruned.
- No concurrent ingest/prune locking is needed — user is responsible for sequencing.
