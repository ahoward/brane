# Feature Specification: mind-init

**Feature Branch**: `009-mind-init`
**Created**: 2026-01-27
**Status**: Draft
**Input**: Initialize CozoDB mind.db with schema

## User Scenarios & Testing

### User Story 1 - Initialize Mind Database (Priority: P1)

A developer wants to enable semantic reasoning in their brane project.
After running `brane init`, when they run `brane mind init`, brane creates
`mind.db` using CozoDB with the required schema for concepts, edges, and
provenance tracking.

**Why this priority**: Core functionality - without mind.db, no semantic features work.

**Independent Test**: Run mind init, verify mind.db exists with correct schema.

**Acceptance Scenarios**:

1. **Given** an initialized brane project, **When** `brane mind init` is called,
   **Then** mind.db is created with concepts, edges, and provenance relations.

2. **Given** mind.db already exists, **When** mind init is called again,
   **Then** operation is idempotent (no error, no data loss).

3. **Given** brane is not initialized, **When** mind init is called,
   **Then** error is returned with code `not_initialized`.

---

### User Story 2 - Schema Verification (Priority: P2)

A developer wants to verify their mind.db has the correct schema.
They run `brane mind status` and see schema version and relation info.

**Why this priority**: Useful for debugging and upgrades, but not essential
for initial functionality.

**Independent Test**: Initialize mind, run status, verify schema info returned.

**Acceptance Scenarios**:

1. **Given** mind.db exists, **When** status is called,
   **Then** schema version and relation counts are returned.

---

### Edge Cases

- What happens when `.brane/` is not initialized?
  → Return error with code `not_initialized`

- What happens when mind.db already exists?
  → Idempotent success, do not recreate or lose data

- What happens with corrupted mind.db?
  → Return error with code `corrupted`, suggest re-init with --force

## Requirements

### Functional Requirements

- **FR-001**: System MUST create mind.db using CozoDB with RocksDB backend
- **FR-002**: System MUST create `concepts` relation with id, name, type, vector
- **FR-003**: System MUST create `edges` relation with source, target, relation, weight
- **FR-004**: System MUST create `provenance` relation linking concepts to body files
- **FR-005**: System MUST store schema version for future migrations
- **FR-006**: System MUST be idempotent (safe to run multiple times)
- **FR-007**: System MUST require initialized `.brane/` directory

### Key Entities

- **concepts**: Semantic entities in the knowledge graph
  - `id`: Unique identifier (integer)
  - `name`: Human-readable name (string)
  - `type`: Entity type (Entity, Caveat, Rule)
  - `vector`: Embedding vector (float array, optional for now)

- **edges**: Relationships between concepts
  - `source`: Source concept ID
  - `target`: Target concept ID
  - `relation`: Relationship type (DEPENDS_ON, CONFLICTS_WITH, DEFINED_IN)
  - `weight`: Relationship strength (float)

- **provenance**: Links concepts to body files
  - `concept_id`: Concept ID
  - `file_url`: File URL from body.db

- **schema_meta**: Schema version tracking
  - `key`: Metadata key
  - `value`: Metadata value

## Success Criteria

### Measurable Outcomes

- **SC-001**: Mind init completes in <1s
- **SC-002**: All tc tests pass
- **SC-003**: Schema can be queried via CozoDB Datalog

## sys.call Interface

```typescript
// Initialize mind.db
sys.call("/mind/init", {})

// Force re-initialize (destroys existing data)
sys.call("/mind/init", { force: true })

// Success result
{
  status: "success",
  result: {
    path: "/project/.brane/mind.db",
    created: true,
    schema_version: "1.0.0"
  },
  errors: null,
  meta: { path: "/mind/init", timestamp, duration_ms }
}

// Idempotent success (already exists)
{
  status: "success",
  result: {
    path: "/project/.brane/mind.db",
    created: false,
    schema_version: "1.0.0"
  },
  errors: null,
  meta: { path: "/mind/init", timestamp, duration_ms }
}

// Error (not initialized)
{
  status: "error",
  result: null,
  errors: {
    brane: [{ code: "not_initialized", message: "brane not initialized (run brane init)" }]
  },
  meta: { path: "/mind/init", timestamp, duration_ms }
}
```

## CLI Interface

```bash
# Initialize mind.db
brane mind init

# Force re-initialize (warning: destroys data)
brane mind init --force

# Raw mode
brane call /mind/init
brane call /mind/init '{"force": true}'
```

## Implementation Notes

### CozoDB Setup

```typescript
import { CozoDb } from 'cozo-node'

// Use RocksDB for persistence (or SQLite as fallback)
const db = new CozoDb('rocksdb', '.brane/mind.db')
```

### Schema Definition (Datalog)

```datalog
# Schema version tracking
:create schema_meta { key: String => value: String }

# Core concepts relation
:create concepts {
  id: Int,
  name: String,
  type: String,
  =>
  vector: [Float]?
}

# Edges between concepts
:create edges {
  source: Int,
  target: Int,
  relation: String,
  =>
  weight: Float default 1.0
}

# Provenance linking concepts to body files
:create provenance {
  concept_id: Int,
  file_url: String
}

# Insert schema version
?[key, value] <- [['version', '1.0.0']]
:put schema_meta { key => value }
```

### Idempotence Check

Before creating relations, check if they exist:
```datalog
::relations
```

If `concepts` relation exists, skip creation.

### Storage Backend Choice

Use RocksDB if available (better performance), fall back to SQLite if not.
The cozo-node package includes prebuilt binaries with RocksDB support.
