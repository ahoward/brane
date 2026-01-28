# Data Model: Define Datalog Rules

**Feature**: 016-rules-define
**Date**: 2026-01-28

## Entities

### Rule

A named Datalog query that can be executed against the knowledge graph.

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| name | String | Unique identifier | Primary key, required |
| description | String | Human-readable explanation | Required |
| body | String | Datalog query body | Required, valid syntax |
| builtin | Boolean | System rule flag | Default: false |

**Relationships**:
- Rules query `concepts` and `edges` relations
- Rules do not create foreign key relationships (read-only queries)

**State Transitions**:
- Created → Active (immediate, no draft state)
- Active → Deleted (custom rules only)
- Built-in rules cannot transition to Deleted

### RuleResult

The output of executing a rule (not persisted, returned from query).

| Field | Type | Description |
|-------|------|-------------|
| rule | String | Name of executed rule |
| matches | Array | List of matching concepts |
| count | Number | Total matches |

**Match Entry**:
| Field | Type | Description |
|-------|------|-------------|
| id | Number | Concept ID |
| name | String | Concept name |

## Schema Changes

### New Relation: `rules`

```datalog
:create rules {
  name: String,
  description: String,
  body: String,
  builtin: Bool default false
}
```

### Schema Version

Bump from `1.1.0` to `1.2.0` to indicate new relation.

### Built-in Rules (Seeded)

| Name | Description | Body (simplified) |
|------|-------------|-------------------|
| cycles | Detects circular dependencies | `cycles[id,name] := reachable[id,id]` |
| orphans | Detects disconnected concepts | `orphans[id,name] := no edges` |

## Validation Rules

### Rule Name
- Must be non-empty
- Must be unique across all rules (built-in and custom)
- Alphanumeric + underscore recommended (enforced by convention, not validation)

### Rule Body
- Must be valid CozoDB Datalog syntax
- Validated at creation time via `::explain`
- Must define output columns (typically `[id, name]` for concept rules)

### Deletion
- Custom rules (builtin=false): Can be deleted
- Built-in rules (builtin=true): Cannot be deleted, returns error

## Indexes

CozoDB handles indexing automatically for the `rules` relation based on the primary key (`name`).

## Migration Path

1. On `mind/init` or first rule access:
   - Check if `rules` relation exists
   - If not, create it
   - Check if built-in rules exist
   - If not, insert them
2. Update `schema_meta` version to `1.2.0`

This is idempotent and backward compatible.
