# Feature Specification: mind-edges

**Feature Branch**: `011-mind-edges`
**Created**: 2026-01-28
**Status**: Draft
**Input**: CRUD for edges (relationships between concepts)

## User Scenarios & Testing

### User Story 1 - Create Edge (Priority: P1)

A developer or LLM extraction process wants to connect two concepts in the
knowledge graph. They call the create endpoint with source, target, and
relation type, and receive the new edge with its assigned ID.

**Why this priority**: Core functionality - can't build a graph without edges.

**Independent Test**: Create two concepts, create edge between them, verify edge exists.

**Acceptance Scenarios**:

1. **Given** two concepts exist, **When** create is called with source, target, relation,
   **Then** edge is created and ID is returned.

2. **Given** source concept doesn't exist, **When** create is called,
   **Then** error is returned with code `not_found` on source field.

3. **Given** target concept doesn't exist, **When** create is called,
   **Then** error is returned with code `not_found` on target field.

---

### User Story 2 - Get Edge (Priority: P1)

A developer wants to retrieve a specific edge by ID.

**Why this priority**: Essential for graph traversal and verification.

**Independent Test**: Create edge, get by ID, verify data matches.

**Acceptance Scenarios**:

1. **Given** an edge exists, **When** get is called with its ID,
   **Then** the edge data is returned.

2. **Given** no edge with that ID, **When** get is called,
   **Then** error is returned with code `not_found`.

---

### User Story 3 - List Edges (Priority: P1)

A developer wants to list edges, optionally filtered by source, target, or relation.

**Why this priority**: Essential for graph traversal and exploration.

**Independent Test**: Create edges, list all, verify all returned.

**Acceptance Scenarios**:

1. **Given** edges exist, **When** list is called,
   **Then** all edges are returned.

2. **Given** edges exist, **When** list is called with source filter,
   **Then** only edges from that source are returned.

3. **Given** edges exist, **When** list is called with target filter,
   **Then** only edges to that target are returned.

4. **Given** edges exist, **When** list is called with relation filter,
   **Then** only edges of that relation type are returned.

---

### User Story 4 - Update Edge (Priority: P2)

A developer wants to update an edge's relation or weight.

**Why this priority**: Important for corrections, but less frequent than create/read.

**Independent Test**: Create edge, update relation, verify change persisted.

**Acceptance Scenarios**:

1. **Given** an edge exists, **When** update is called with new relation,
   **Then** the edge is updated.

2. **Given** an edge exists, **When** update is called with new weight,
   **Then** the edge is updated.

3. **Given** no edge with that ID, **When** update is called,
   **Then** error is returned with code `not_found`.

---

### User Story 5 - Delete Edge (Priority: P2)

A developer wants to remove an edge from the graph.

**Why this priority**: Important for cleanup, but less frequent.

**Independent Test**: Create edge, delete it, verify it's gone.

**Acceptance Scenarios**:

1. **Given** an edge exists, **When** delete is called,
   **Then** the edge is removed.

2. **Given** no edge with that ID, **When** delete is called,
   **Then** error is returned with code `not_found`.

---

### Edge Cases

- What happens when mind.db is not initialized?
  → Return error with code `not_initialized`

- What happens with missing source/target/relation?
  → Return error with code `required`

- What happens with invalid relation type?
  → Return error with code `invalid` (must be DEPENDS_ON, CONFLICTS_WITH, or DEFINED_IN)

- What happens with negative or invalid weight?
  → Weight defaults to 1.0 if not provided, must be positive number

## Requirements

### Functional Requirements

- **FR-001**: System MUST support creating edges with source, target, relation
- **FR-002**: System MUST auto-generate unique integer IDs for edges
- **FR-003**: System MUST validate source concept exists
- **FR-004**: System MUST validate target concept exists
- **FR-005**: System MUST support optional weight (default 1.0)
- **FR-006**: System MUST support retrieving edge by ID
- **FR-007**: System MUST support listing all edges
- **FR-008**: System MUST support filtering edges by source
- **FR-009**: System MUST support filtering edges by target
- **FR-010**: System MUST support filtering edges by relation
- **FR-011**: System MUST support updating edge relation and weight
- **FR-012**: System MUST support deleting edges by ID
- **FR-013**: System MUST require initialized mind.db
- **FR-014**: System MUST validate relation is one of: DEPENDS_ON, CONFLICTS_WITH, DEFINED_IN

### Key Entities

- **Edge**: A relationship between two concepts
  - `id`: Unique identifier (auto-generated integer)
  - `source`: Source concept ID (required)
  - `target`: Target concept ID (required)
  - `relation`: Relationship type (DEPENDS_ON, CONFLICTS_WITH, DEFINED_IN)
  - `weight`: Relationship strength (default 1.0)

## Success Criteria

### Measurable Outcomes

- **SC-001**: CRUD operations complete in <50ms
- **SC-002**: All tc tests pass

## sys.call Interface

```typescript
// Create edge
sys.call("/mind/edges/create", { source: 1, target: 2, relation: "DEPENDS_ON" })
sys.call("/mind/edges/create", { source: 1, target: 2, relation: "DEPENDS_ON", weight: 0.5 })

// Success result
{
  status: "success",
  result: {
    id: 1,
    source: 1,
    target: 2,
    relation: "DEPENDS_ON",
    weight: 1.0
  },
  errors: null,
  meta: { path: "/mind/edges/create", timestamp, duration_ms }
}

// Get edge
sys.call("/mind/edges/get", { id: 1 })

// Success result
{
  status: "success",
  result: {
    id: 1,
    source: 1,
    target: 2,
    relation: "DEPENDS_ON",
    weight: 1.0
  },
  errors: null,
  meta: { path: "/mind/edges/get", timestamp, duration_ms }
}

// List edges
sys.call("/mind/edges/list", {})
sys.call("/mind/edges/list", { source: 1 })
sys.call("/mind/edges/list", { target: 2 })
sys.call("/mind/edges/list", { relation: "DEPENDS_ON" })

// Success result
{
  status: "success",
  result: {
    edges: [
      { id: 1, source: 1, target: 2, relation: "DEPENDS_ON", weight: 1.0 },
      { id: 2, source: 2, target: 3, relation: "CONFLICTS_WITH", weight: 0.5 }
    ],
    total: 2
  },
  errors: null,
  meta: { path: "/mind/edges/list", timestamp, duration_ms }
}

// Update edge
sys.call("/mind/edges/update", { id: 1, relation: "CONFLICTS_WITH" })
sys.call("/mind/edges/update", { id: 1, weight: 0.8 })

// Success result
{
  status: "success",
  result: {
    id: 1,
    source: 1,
    target: 2,
    relation: "CONFLICTS_WITH",
    weight: 0.8
  },
  errors: null,
  meta: { path: "/mind/edges/update", timestamp, duration_ms }
}

// Delete edge
sys.call("/mind/edges/delete", { id: 1 })

// Success result
{
  status: "success",
  result: {
    deleted: true
  },
  errors: null,
  meta: { path: "/mind/edges/delete", timestamp, duration_ms }
}

// Error (source not found)
{
  status: "error",
  result: null,
  errors: {
    source: [{ code: "not_found", message: "source concept not found" }]
  },
  meta: { path: "/mind/edges/create", timestamp, duration_ms }
}

// Error (mind not initialized)
{
  status: "error",
  result: null,
  errors: {
    mind: [{ code: "not_initialized", message: "mind not initialized (run brane mind init)" }]
  },
  meta: { path: "/mind/edges/create", timestamp, duration_ms }
}
```

## Implementation Notes

### Schema Extension

The `edges` relation needs to be added to mind.db schema in `/mind/init`:

```datalog
:create edges {
  id:       Int,
  source:   Int,
  target:   Int,
  relation: String,
  weight:   Float default 1.0
  =>
}
```

### ID Generation

Use a counter stored in schema_meta (same pattern as concepts):
```datalog
# Get next ID
?[next_id] := *schema_meta['edge_next_id', val], next_id = to_int(val)

# Increment counter
?[key, value] <- [['edge_next_id', $new_id]]
:put schema_meta { key => value }
```

### Datalog Queries

```datalog
# Create
?[id, source, target, relation, weight] <- [[$id, $source, $target, $relation, $weight]]
:put edges { id, source, target, relation, weight }

# Get by ID
?[id, source, target, relation, weight] := *edges[id, source, target, relation, weight], id = $id

# List all
?[id, source, target, relation, weight] := *edges[id, source, target, relation, weight]

# List by source
?[id, source, target, relation, weight] := *edges[id, source, target, relation, weight], source = $source

# List by target
?[id, source, target, relation, weight] := *edges[id, source, target, relation, weight], target = $target

# List by relation
?[id, source, target, relation, weight] := *edges[id, source, target, relation, weight], relation = $relation

# Check concept exists
?[id] := *concepts[id, _, _], id = $concept_id

# Delete
?[id, source, target, relation, weight] := *edges[id, source, target, relation, weight], id = $id
:rm edges { id, source, target, relation, weight }
```

### Valid Relation Types

From PRD (section 7):
- `DEPENDS_ON`
- `CONFLICTS_WITH`
- `DEFINED_IN`
