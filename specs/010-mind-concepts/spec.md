# Feature Specification: mind-concepts

**Feature Branch**: `010-mind-concepts`
**Created**: 2026-01-27
**Status**: Draft
**Input**: CRUD for concepts (entities in the graph)

## User Scenarios & Testing

### User Story 1 - Create Concept (Priority: P1)

A developer or LLM extraction process wants to add a new concept to the
knowledge graph. They call the create endpoint with name and type, and
receive the new concept with its assigned ID.

**Why this priority**: Core functionality - can't build a graph without creating nodes.

**Independent Test**: Create concept, verify it exists in mind.db.

**Acceptance Scenarios**:

1. **Given** an initialized mind.db, **When** create is called with name and type,
   **Then** concept is created and ID is returned.

2. **Given** a concept with the same name exists, **When** create is called,
   **Then** a new concept is created (names are not unique).

---

### User Story 2 - Get Concept (Priority: P1)

A developer wants to retrieve a specific concept by ID.

**Why this priority**: Essential for graph traversal and verification.

**Independent Test**: Create concept, get by ID, verify data matches.

**Acceptance Scenarios**:

1. **Given** a concept exists, **When** get is called with its ID,
   **Then** the concept data is returned.

2. **Given** no concept with that ID, **When** get is called,
   **Then** error is returned with code `not_found`.

---

### User Story 3 - List Concepts (Priority: P1)

A developer wants to list all concepts, optionally filtered by type.

**Why this priority**: Essential for exploration and debugging.

**Independent Test**: Create concepts, list all, verify all returned.

**Acceptance Scenarios**:

1. **Given** concepts exist, **When** list is called,
   **Then** all concepts are returned.

2. **Given** concepts of different types, **When** list is called with type filter,
   **Then** only matching concepts are returned.

---

### User Story 4 - Update Concept (Priority: P2)

A developer wants to update a concept's name or type.

**Why this priority**: Important for corrections, but less frequent than create/read.

**Independent Test**: Create concept, update name, verify change persisted.

**Acceptance Scenarios**:

1. **Given** a concept exists, **When** update is called with new name,
   **Then** the concept is updated.

2. **Given** no concept with that ID, **When** update is called,
   **Then** error is returned with code `not_found`.

---

### User Story 5 - Delete Concept (Priority: P2)

A developer wants to remove a concept from the graph.

**Why this priority**: Important for cleanup, but less frequent.

**Independent Test**: Create concept, delete it, verify it's gone.

**Acceptance Scenarios**:

1. **Given** a concept exists, **When** delete is called,
   **Then** the concept is removed.

2. **Given** no concept with that ID, **When** delete is called,
   **Then** error is returned with code `not_found`.

---

### Edge Cases

- What happens when mind.db is not initialized?
  → Return error with code `not_initialized`

- What happens with empty name?
  → Return error with code `required`

- What happens with invalid type?
  → Return error with code `invalid` (must be Entity, Caveat, or Rule)

## Requirements

### Functional Requirements

- **FR-001**: System MUST support creating concepts with name and type
- **FR-002**: System MUST auto-generate unique integer IDs
- **FR-003**: System MUST support retrieving concept by ID
- **FR-004**: System MUST support listing all concepts
- **FR-005**: System MUST support filtering concepts by type
- **FR-006**: System MUST support updating concept name and type
- **FR-007**: System MUST support deleting concepts by ID
- **FR-008**: System MUST require initialized mind.db
- **FR-009**: System MUST validate type is one of: Entity, Caveat, Rule

### Key Entities

- **Concept**: A semantic entity in the knowledge graph
  - `id`: Unique identifier (auto-generated integer)
  - `name`: Human-readable name (string, required)
  - `type`: Entity type (Entity, Caveat, Rule)

## Success Criteria

### Measurable Outcomes

- **SC-001**: CRUD operations complete in <50ms
- **SC-002**: All tc tests pass

## sys.call Interface

```typescript
// Create concept
sys.call("/mind/concepts/create", { name: "AuthService", type: "Entity" })

// Success result
{
  status: "success",
  result: {
    id: 1,
    name: "AuthService",
    type: "Entity"
  },
  errors: null,
  meta: { path: "/mind/concepts/create", timestamp, duration_ms }
}

// Get concept
sys.call("/mind/concepts/get", { id: 1 })

// Success result
{
  status: "success",
  result: {
    id: 1,
    name: "AuthService",
    type: "Entity"
  },
  errors: null,
  meta: { path: "/mind/concepts/get", timestamp, duration_ms }
}

// List concepts
sys.call("/mind/concepts/list", {})
sys.call("/mind/concepts/list", { type: "Entity" })

// Success result
{
  status: "success",
  result: {
    concepts: [
      { id: 1, name: "AuthService", type: "Entity" },
      { id: 2, name: "Do not modify", type: "Caveat" }
    ],
    total: 2
  },
  errors: null,
  meta: { path: "/mind/concepts/list", timestamp, duration_ms }
}

// Update concept
sys.call("/mind/concepts/update", { id: 1, name: "AuthenticationService" })

// Success result
{
  status: "success",
  result: {
    id: 1,
    name: "AuthenticationService",
    type: "Entity"
  },
  errors: null,
  meta: { path: "/mind/concepts/update", timestamp, duration_ms }
}

// Delete concept
sys.call("/mind/concepts/delete", { id: 1 })

// Success result
{
  status: "success",
  result: {
    deleted: true
  },
  errors: null,
  meta: { path: "/mind/concepts/delete", timestamp, duration_ms }
}

// Error (not found)
{
  status: "error",
  result: null,
  errors: {
    id: [{ code: "not_found", message: "concept not found" }]
  },
  meta: { path: "/mind/concepts/get", timestamp, duration_ms }
}

// Error (mind not initialized)
{
  status: "error",
  result: null,
  errors: {
    mind: [{ code: "not_initialized", message: "mind not initialized (run brane mind init)" }]
  },
  meta: { path: "/mind/concepts/create", timestamp, duration_ms }
}
```

## CLI Interface

```bash
# Create concept
brane mind concept create "AuthService" --type Entity
brane mind concept create "Do not modify" --type Caveat

# Get concept
brane mind concept get 1

# List concepts
brane mind concept list
brane mind concept list --type Entity

# Update concept
brane mind concept update 1 --name "AuthenticationService"

# Delete concept
brane mind concept delete 1

# Raw mode
brane call /mind/concepts/create '{"name": "AuthService", "type": "Entity"}'
brane call /mind/concepts/get '{"id": 1}'
brane call /mind/concepts/list
brane call /mind/concepts/list '{"type": "Entity"}'
brane call /mind/concepts/update '{"id": 1, "name": "AuthenticationService"}'
brane call /mind/concepts/delete '{"id": 1}'
```

## Implementation Notes

### ID Generation

Use a counter stored in schema_meta:
```datalog
# Get next ID
?[next_id] := *schema_meta['concept_next_id', val], next_id = to_int(val)

# Increment counter
?[key, value] <- [['concept_next_id', $new_id]]
:put schema_meta { key => value }
```

### Datalog Queries

```datalog
# Create
?[id, name, type] <- [[$id, $name, $type]]
:put concepts { id, name, type }

# Get by ID
?[id, name, type] := *concepts[id, name, type], id = $id

# List all
?[id, name, type] := *concepts[id, name, type]

# List by type
?[id, name, type] := *concepts[id, name, type], type = $type

# Update
?[id, name, type] <- [[$id, $name, $type]]
:put concepts { id, name, type }

# Delete
?[id, name, type] := *concepts[id, name, type], id = $id
:rm concepts { id, name, type }
```
