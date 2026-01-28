# Feature Specification: calabi-extract

**Feature Branch**: `013-calabi-extract`
**Created**: 2026-01-28
**Status**: Draft
**Input**: LLM extraction: file → concepts + edges

## Overview

The Calabi extraction engine is the bridge between raw files (Body) and semantic
knowledge (Mind). When a file is processed, the extraction handler receives the
file content and produces concepts and edges that are written to mind.db.

This spec focuses on the **handler** that accepts extraction results and applies
them to the Mind. The actual LLM call is intentionally decoupled - allowing any
extraction source (LLM, manual, mock) to provide the structured output.

## Architecture

```
File Content → [Extraction Source*] → CalabiPatch → /calabi/extract → mind.db
                                                         ↓
                                               provenance links created
```

*Extraction Source is external to this handler - could be LLM, mock, or manual input.

## User Scenarios & Testing

### User Story 1 - Apply Extraction Patch (Priority: P1)

A developer or automated process has extracted concepts and edges from a file
and wants to persist them to mind.db with proper provenance linking.

**Why this priority**: Core functionality - this is the primary purpose of the
Calabi engine.

**Independent Test**: Provide extraction patch, verify concepts/edges/provenance created.

**Acceptance Scenarios**:

1. **Given** a file exists in body.db and extraction patch is provided, **When**
   extract is called, **Then** concepts are created, edges are created, and
   provenance links are established.

2. **Given** extraction includes a concept matching existing concept (by name),
   **When** extract is called, **Then** existing concept is reused (not duplicated).

3. **Given** extraction includes edge referencing new concepts, **When** extract
   is called, **Then** concepts are created first, then edge is created.

---

### User Story 2 - Replace Existing Extraction (Priority: P1)

When a file is re-extracted (e.g., after modification), the old extraction
results should be replaced with new ones.

**Why this priority**: Essential for incremental updates - file changes mean
concepts may have changed.

**Acceptance Scenarios**:

1. **Given** file has existing provenance links, **When** extract is called with
   new patch, **Then** old provenance links are removed, old orphan concepts
   are removed, and new extraction is applied.

2. **Given** concept from old extraction is linked to other files, **When**
   extract is called, **Then** concept is preserved (not orphaned).

---

### User Story 3 - Validate Extraction Input (Priority: P2)

The handler should validate the extraction patch structure before applying.

**Why this priority**: Important for debugging and error handling.

**Acceptance Scenarios**:

1. **Given** patch has concept with missing name, **When** extract is called,
   **Then** error is returned with validation details.

2. **Given** patch has edge referencing non-existent concept name not in patch,
   **When** extract is called, **Then** error is returned.

---

### Edge Cases

- What happens when mind.db is not initialized?
  → Return error with code `not_initialized`

- What happens when body.db is not initialized?
  → Return error with code `not_initialized`

- What happens when file_url doesn't exist in body.db?
  → Return error with code `not_found` on file_url

- What happens with empty patch (no concepts, no edges)?
  → Valid operation - removes old extraction, leaves nothing

- What happens with duplicate concept names in patch?
  → Deduplicate, create single concept

## Requirements

### Functional Requirements

- **FR-001**: System MUST accept extraction patch (concepts + edges) for a file
- **FR-002**: System MUST create concepts from patch
- **FR-003**: System MUST create edges from patch (after concepts exist)
- **FR-004**: System MUST create provenance links for all concepts to source file
- **FR-005**: System MUST remove old provenance links for file before applying
- **FR-006**: System MUST remove orphan concepts (no remaining provenance)
- **FR-007**: System MUST validate extraction patch structure
- **FR-008**: System MUST reuse existing concepts by name match
- **FR-009**: System MUST require initialized mind.db and body.db
- **FR-010**: System MUST validate file_url exists in body.db

### Key Entities

- **CalabiPatch**: The extraction result to apply
  - `file_url`: The source file URL (required)
  - `concepts`: Array of concepts to create
    - `name`: Concept name (required)
    - `type`: Concept type - "Entity" | "Caveat" (required)
  - `edges`: Array of edges to create
    - `source_name`: Name of source concept (required)
    - `target_name`: Name of target concept (required)
    - `relation`: Edge relation type (required)
    - `weight`: Optional weight (default 1.0)

Note: Edges reference concepts by name (not ID) since IDs are assigned during creation.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Extraction completes in <100ms for typical file
- **SC-002**: All tc tests pass

## sys.call Interface

```typescript
// Apply extraction patch
sys.call("/calabi/extract", {
  file_url: "file:///path/to/auth.ts",
  concepts: [
    { name: "AuthService", type: "Entity" },
    { name: "LoginHandler", type: "Entity" },
    { name: "Do not modify auth", type: "Caveat" }
  ],
  edges: [
    { source_name: "LoginHandler", target_name: "AuthService", relation: "DEPENDS_ON" },
    { source_name: "Do not modify auth", target_name: "AuthService", relation: "CONFLICTS_WITH" }
  ]
})

// Success result
{
  status: "success",
  result: {
    file_url: "file:///path/to/auth.ts",
    concepts_created: 2,
    concepts_reused: 1,
    edges_created: 2,
    provenance_created: 3
  },
  errors: null,
  meta: { path: "/calabi/extract", timestamp, duration_ms }
}

// Empty extraction (clear file)
sys.call("/calabi/extract", {
  file_url: "file:///path/to/auth.ts",
  concepts: [],
  edges: []
})

// Success result
{
  status: "success",
  result: {
    file_url: "file:///path/to/auth.ts",
    concepts_created: 0,
    concepts_reused: 0,
    edges_created: 0,
    provenance_created: 0,
    concepts_orphaned: 2
  },
  errors: null,
  meta: { path: "/calabi/extract", timestamp, duration_ms }
}

// Error (file not found)
{
  status: "error",
  result: null,
  errors: {
    file_url: [{ code: "not_found", message: "file not found in body.db" }]
  },
  meta: { path: "/calabi/extract", timestamp, duration_ms }
}

// Error (validation)
{
  status: "error",
  result: null,
  errors: {
    concepts: {
      "0": {
        name: [{ code: "required", message: "name is required" }]
      }
    }
  },
  meta: { path: "/calabi/extract", timestamp, duration_ms }
}
```

## Implementation Notes

### Algorithm

```
1. Validate input structure
2. Validate file_url exists in body.db
3. Begin transaction
4. Get old provenance links for file_url
5. Remove old provenance links
6. For each concept in patch:
   a. Check if concept with same name exists
   b. If exists, reuse ID; else create new concept
   c. Create provenance link
7. For each edge in patch:
   a. Resolve source_name to concept ID
   b. Resolve target_name to concept ID
   c. Create edge
8. Find orphan concepts (no remaining provenance)
9. Remove orphan concepts and their edges
10. Commit transaction
11. Return stats
```

### Concept Matching

Concepts are matched by name. This allows the extraction to reference existing
concepts without needing to know their IDs. The type is used when creating new
concepts but ignored when matching (a concept named "AuthService" is the same
regardless of type).

### Orphan Cleanup

When old provenance is removed, concepts that have no remaining provenance links
are considered "orphans" and are deleted. This ensures the Mind doesn't accumulate
stale concepts from deleted or modified files.

Exception: Concepts with `type: "Caveat"` are never auto-deleted - they represent
manual annotations that should persist regardless of extraction.

### Datalog Queries

```datalog
# Find existing concept by name
?[id] := *concepts[id, name, _], name = $name

# Find concepts with provenance to file
?[concept_id] := *provenance[concept_id, file_url], file_url = $file_url

# Find orphan concepts (no provenance) - excluding Caveats
?[id] :=
  *concepts[id, _, type],
  not *provenance[id, _],
  type != "Caveat"

# Remove edges involving concept
?[id, source, target, relation, weight] :=
  *edges[id, source, target, relation, weight],
  or(source = $concept_id, target = $concept_id)
:rm edges { id, source, target, relation, weight }
```
