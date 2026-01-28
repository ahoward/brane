# Feature Specification: context-query

**Feature Branch**: `015-context-query`
**Created**: 2026-01-28
**Status**: Draft
**Input**: Vector search + graph expansion for context retrieval

## Overview

The context query handler provides "Perfect Context" for AI agents by:
1. Finding relevant concepts by name/keyword search (simplified from vector search)
2. Expanding to related concepts via graph traversal
3. Returning file snippets linked to those concepts

This implementation establishes the context retrieval infrastructure. Vector
search can be added later as an enhancement when embedding support is added.

## Architecture

```
Query: "authentication"
    ↓
1. Concept Search: Find concepts matching query
    ↓
2. Graph Expansion: Find 1-2 degree neighbors
    ↓
3. Provenance Lookup: Get file URLs for concepts
    ↓
4. Content Retrieval: Get file content from body.db
    ↓
Return: Context bundle with concepts and file snippets
```

## User Scenarios & Testing

### User Story 1 - Basic Context Query (Priority: P1)

An AI agent wants to understand the codebase context around "authentication".

**Why this priority**: Core functionality - this is the primary use case.

**Independent Test**: Create concepts, run query, verify relevant concepts returned.

**Acceptance Scenarios**:

1. **Given** concepts exist with matching names, **When** context query is called,
   **Then** matching concepts and their file snippets are returned.

2. **Given** no concepts match the query, **When** context query is called,
   **Then** empty result is returned.

---

### User Story 2 - Graph Expansion (Priority: P1)

Context should include related concepts, not just exact matches.

**Why this priority**: Related concepts provide valuable context.

**Independent Test**: Create concepts with edges, query one, verify neighbors included.

**Acceptance Scenarios**:

1. **Given** concept A has edge to concept B, **When** A is queried,
   **Then** B is included in the context.

2. **Given** concept A → B → C chain, **When** A is queried with depth=2,
   **Then** both B and C are included.

---

### User Story 3 - File Snippet Retrieval (Priority: P2)

Context should include actual code, not just concept names.

**Why this priority**: AI agents need to see the actual code.

**Independent Test**: Create concept with provenance, query, verify file content included.

**Acceptance Scenarios**:

1. **Given** concept has provenance link to file, **When** queried,
   **Then** file URL and content preview are included.

---

### Edge Cases

- What happens when mind.db is not initialized?
  → Return error with code `not_initialized`

- What happens when body.db is not initialized?
  → Return error with code `not_initialized`

- What happens with empty query?
  → Return error with code `required`

- What happens when file content is not readable?
  → Return concept without file content, include error note

## Requirements

### Functional Requirements

- **FR-001**: System MUST support text-based concept search
- **FR-002**: System MUST support graph expansion (1-2 degrees)
- **FR-003**: System MUST return provenance-linked file content
- **FR-004**: System MUST support configurable expansion depth
- **FR-005**: System MUST support result limiting
- **FR-006**: System MUST require initialized mind.db and body.db

### Key Entities

- **ContextQuery**: The query parameters
  - `query`: Search text (required)
  - `depth`: Graph expansion depth (default: 1)
  - `limit`: Max concepts to return (default: 10)

- **ContextResult**: The returned context
  - `concepts`: Array of matched concepts with relationships
  - `files`: Array of file snippets linked to concepts
  - `graph`: Adjacency information for visualization

## Success Criteria

### Measurable Outcomes

- **SC-001**: Query completes in <200ms for typical codebase
- **SC-002**: All tc tests pass

## sys.call Interface

```typescript
// Basic query
sys.call("/context/query", { query: "authentication" })

// Success result
{
  status: "success",
  result: {
    concepts: [
      { id: 1, name: "AuthService", type: "Entity", relevance: "direct" },
      { id: 2, name: "LoginHandler", type: "Entity", relevance: "neighbor" }
    ],
    files: [
      {
        url: "file:///path/to/auth.ts",
        concepts: [1, 2],
        preview: "export class AuthService { ... }"
      }
    ],
    graph: {
      nodes: [1, 2],
      edges: [{ source: 2, target: 1, relation: "DEPENDS_ON" }]
    }
  },
  errors: null,
  meta: { path: "/context/query", timestamp, duration_ms }
}

// Query with options
sys.call("/context/query", { query: "auth", depth: 2, limit: 5 })

// Empty result
{
  status: "success",
  result: {
    concepts: [],
    files: [],
    graph: { nodes: [], edges: [] }
  },
  errors: null,
  meta: { path: "/context/query", timestamp, duration_ms }
}

// Error (missing query)
{
  status: "error",
  result: null,
  errors: {
    query: [{ code: "required", message: "query is required" }]
  },
  meta: { path: "/context/query", timestamp, duration_ms }
}
```

## Implementation Notes

### Algorithm

```
1. Validate query is provided
2. Open mind.db and body.db
3. Search concepts by name containing query (case-insensitive)
4. For each matched concept, mark as "direct"
5. Expand graph by depth:
   - For depth 1: find immediate neighbors via edges
   - For depth 2: find neighbors of neighbors
   - Mark expanded concepts as "neighbor"
6. Get provenance links for all concepts
7. For each unique file:
   - Read content from body.db (or file system via FTS)
   - Generate preview snippet
8. Build graph structure (nodes + edges)
9. Return context bundle
```

### Concept Search

Simple substring matching on concept names:
```datalog
?[id, name, type] := *concepts[id, name, type], contains(name, $query)
```

Note: CozoDB's `contains` is case-sensitive. For case-insensitive, we'd need
to normalize both sides, but this adds complexity. Initial implementation
uses exact substring match.

### Graph Expansion

```datalog
# 1-degree neighbors (outgoing edges)
?[id, name, type] :=
  *edges[_, $concept_id, id, _, _],
  *concepts[id, name, type]

# 1-degree neighbors (incoming edges)
?[id, name, type] :=
  *edges[_, id, $concept_id, _, _],
  *concepts[id, name, type]
```

### File Content

For simplicity, file content is retrieved from the FTS index (if indexed)
or marked as unavailable. Full content retrieval could read from disk but
adds complexity.

### Preview Generation

Take first N characters or lines of file content as preview.
