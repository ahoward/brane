# Feature Specification: mind-provenance

**Feature Branch**: `012-mind-provenance`
**Created**: 2026-01-28
**Status**: Draft
**Input**: Link concepts to body files

## Overview

Provenance tracks which concepts are derived from which files. This is the critical
link between the "Body" (file system reality in SQLite) and the "Mind" (semantic
graph in CozoDB). When a file changes, provenance tells us which concepts need to
be re-extracted.

## User Scenarios & Testing

### User Story 1 - Create Provenance Link (Priority: P1)

A developer or LLM extraction process wants to record that a concept was
derived from a specific file. They call the create endpoint with concept_id
and file_url.

**Why this priority**: Core functionality - provenance is essential for
incremental updates and maintaining consistency between Body and Mind.

**Independent Test**: Create concept, create provenance link, verify link exists.

**Acceptance Scenarios**:

1. **Given** a concept exists and a file is tracked in body.db, **When** create
   is called with concept_id and file_url, **Then** link is created.

2. **Given** concept doesn't exist, **When** create is called,
   **Then** error is returned with code `not_found` on concept_id field.

3. **Given** file_url doesn't exist in body.db, **When** create is called,
   **Then** error is returned with code `not_found` on file_url field.

---

### User Story 2 - List Provenance by Concept (Priority: P1)

A developer wants to find all files that contributed to a concept.

**Why this priority**: Essential for understanding where a concept came from.

**Independent Test**: Create provenance links, list by concept, verify files returned.

**Acceptance Scenarios**:

1. **Given** provenance links exist for a concept, **When** list is called with
   concept_id, **Then** all linked file_urls are returned.

2. **Given** no links exist for concept, **When** list is called,
   **Then** empty array is returned.

---

### User Story 3 - List Provenance by File (Priority: P1)

A developer wants to find all concepts derived from a file.

**Why this priority**: Essential for incremental updates - when a file changes,
we need to know which concepts to invalidate.

**Independent Test**: Create provenance links, list by file, verify concepts returned.

**Acceptance Scenarios**:

1. **Given** provenance links exist for a file, **When** list is called with
   file_url, **Then** all linked concept_ids are returned.

2. **Given** no links exist for file, **When** list is called,
   **Then** empty array is returned.

---

### User Story 4 - Delete Provenance Link (Priority: P1)

A developer or cleanup process wants to remove a provenance link.

**Why this priority**: Essential for cleanup when concepts are re-extracted
or files are removed.

**Independent Test**: Create link, delete it, verify it's gone.

**Acceptance Scenarios**:

1. **Given** a link exists, **When** delete is called with concept_id and file_url,
   **Then** the link is removed.

2. **Given** no link exists, **When** delete is called,
   **Then** error is returned with code `not_found`.

---

### User Story 5 - Delete All Provenance for File (Priority: P2)

When a file is removed from body.db, all its provenance links should be cleaned up.

**Why this priority**: Important for cleanup but can be done via multiple delete calls.

**Independent Test**: Create multiple links to file, delete all for file, verify all gone.

**Acceptance Scenarios**:

1. **Given** multiple links exist for a file, **When** delete_by_file is called,
   **Then** all links for that file are removed.

---

### Edge Cases

- What happens when mind.db is not initialized?
  → Return error with code `not_initialized`

- What happens with missing concept_id or file_url?
  → Return error with code `required`

- What happens if same link is created twice?
  → Idempotent operation - no error, link already exists

## Requirements

### Functional Requirements

- **FR-001**: System MUST support creating provenance links (concept_id + file_url)
- **FR-002**: System MUST validate concept exists in mind.db
- **FR-003**: System MUST validate file_url exists in body.db
- **FR-004**: System MUST support listing files by concept_id
- **FR-005**: System MUST support listing concepts by file_url
- **FR-006**: System MUST support deleting individual links
- **FR-007**: System MUST support deleting all links for a file
- **FR-008**: System MUST be idempotent for create (no error on duplicate)
- **FR-009**: System MUST require initialized mind.db and body.db

### Key Entities

- **Provenance**: A link between a concept and a file
  - `concept_id`: The concept ID (required)
  - `file_url`: The file URL from body.db (required)

Note: Unlike concepts and edges, provenance uses a compound key (concept_id, file_url)
rather than a generated ID, since the relationship is inherently identified by its
endpoints.

## Success Criteria

### Measurable Outcomes

- **SC-001**: CRUD operations complete in <50ms
- **SC-002**: All tc tests pass

## sys.call Interface

```typescript
// Create provenance link
sys.call("/mind/provenance/create", { concept_id: 1, file_url: "file:///path/to/file.ts" })

// Success result
{
  status: "success",
  result: {
    concept_id: 1,
    file_url: "file:///path/to/file.ts"
  },
  errors: null,
  meta: { path: "/mind/provenance/create", timestamp, duration_ms }
}

// List by concept
sys.call("/mind/provenance/list", { concept_id: 1 })

// Success result
{
  status: "success",
  result: {
    links: [
      { concept_id: 1, file_url: "file:///path/to/file.ts" },
      { concept_id: 1, file_url: "file:///path/to/other.ts" }
    ],
    total: 2
  },
  errors: null,
  meta: { path: "/mind/provenance/list", timestamp, duration_ms }
}

// List by file
sys.call("/mind/provenance/list", { file_url: "file:///path/to/file.ts" })

// Success result
{
  status: "success",
  result: {
    links: [
      { concept_id: 1, file_url: "file:///path/to/file.ts" },
      { concept_id: 2, file_url: "file:///path/to/file.ts" }
    ],
    total: 2
  },
  errors: null,
  meta: { path: "/mind/provenance/list", timestamp, duration_ms }
}

// Delete single link
sys.call("/mind/provenance/delete", { concept_id: 1, file_url: "file:///path/to/file.ts" })

// Success result
{
  status: "success",
  result: {
    deleted: true
  },
  errors: null,
  meta: { path: "/mind/provenance/delete", timestamp, duration_ms }
}

// Delete all links for file
sys.call("/mind/provenance/delete", { file_url: "file:///path/to/file.ts" })

// Success result
{
  status: "success",
  result: {
    deleted: 3,
    file_url: "file:///path/to/file.ts"
  },
  errors: null,
  meta: { path: "/mind/provenance/delete", timestamp, duration_ms }
}

// Error (concept not found)
{
  status: "error",
  result: null,
  errors: {
    concept_id: [{ code: "not_found", message: "concept not found" }]
  },
  meta: { path: "/mind/provenance/create", timestamp, duration_ms }
}

// Error (file not found)
{
  status: "error",
  result: null,
  errors: {
    file_url: [{ code: "not_found", message: "file not found in body.db" }]
  },
  meta: { path: "/mind/provenance/create", timestamp, duration_ms }
}
```

## Implementation Notes

### Schema

The `provenance` relation already exists in mind.db schema:

```datalog
:create provenance {
  concept_id: Int,
  file_url: String
}
```

### Datalog Queries

```datalog
# Create (idempotent)
?[concept_id, file_url] <- [[$concept_id, $file_url]]
:put provenance { concept_id, file_url }

# List by concept
?[concept_id, file_url] := *provenance[concept_id, file_url], concept_id = $concept_id

# List by file
?[concept_id, file_url] := *provenance[concept_id, file_url], file_url = $file_url

# Delete single
?[concept_id, file_url] <- [[$concept_id, $file_url]]
:rm provenance { concept_id, file_url }

# Delete all for file
?[concept_id, file_url] := *provenance[concept_id, file_url], file_url = $file_url
:rm provenance { concept_id, file_url }

# Check concept exists
?[id] := *concepts[id, _, _], id = $concept_id
```

### Body DB Check

To validate file_url exists in body.db:

```typescript
import Database from "bun:sqlite"

function file_exists_in_body(file_url: string): boolean {
  const db = new Database(".brane/body.db")
  const result = db.query("SELECT 1 FROM files WHERE url = ?").get(file_url)
  db.close()
  return result !== null
}
```
