# Data Model: 025-lens-config

## Schema Version

**Current**: 1.5.0
**Target**: 1.6.0

## New CozoDB Relations

### lens_meta

Stores lens metadata (name, version, description).

```
:create lens_meta {
  key: String =>
  value: String
}
```

**Keys**:
- `name` - lens name (kebab-case)
- `version` - semver string
- `description` - human-readable description

### golden_types

Stores golden concept types from lens config.

```
:create golden_types {
  type: String =>
  description: String,
  authority: String
}
```

**Fields**:
- `type` - unique type name (primary key)
- `description` - what this type represents
- `authority` - "lens" (from import) or "manual" (from bless)

### golden_relations

Stores golden edge relations from lens config.

```
:create golden_relations {
  rel: String =>
  description: String,
  symmetric: Bool,
  authority: String
}
```

**Fields**:
- `rel` - unique relation name (primary key)
- `description` - what this relation represents
- `symmetric` - true if A→B implies B→A
- `authority` - "lens" or "manual"

### consolidation_map

Stores mappings from detected types to golden types.

```
:create consolidation_map {
  source_type: String =>
  target_type: String
}
```

**Fields**:
- `source_type` - detected type (primary key)
- `target_type` - golden type to consolidate to

**Constraint**: `target_type` should exist in `golden_types` (enforced at application level)

### type_usage

Tracks usage statistics for all concept types.

```
:create type_usage {
  type: String =>
  count: Int,
  first_seen: String,
  last_seen: String,
  golden: Bool
}
```

**Fields**:
- `type` - type name (primary key)
- `count` - number of concepts with this type
- `first_seen` - ISO timestamp of first use
- `last_seen` - ISO timestamp of last use
- `golden` - true if type exists in golden_types

### relation_usage

Tracks usage statistics for all edge relations.

```
:create relation_usage {
  rel: String =>
  count: Int,
  first_seen: String,
  last_seen: String,
  golden: Bool
}
```

**Fields**:
- `rel` - relation name (primary key)
- `count` - number of edges with this relation
- `first_seen` - ISO timestamp of first use
- `last_seen` - ISO timestamp of last use
- `golden` - true if relation exists in golden_relations

## TypeScript Interfaces (POD)

```typescript
// Lens configuration (YAML ↔ POD)
interface LensConfig {
  name:          string
  version:       string
  description?:  string
  concepts:      GoldenType[]
  relations:     GoldenRelation[]
  consolidation?: Record<string, string>  // source → target
}

interface GoldenType {
  type:        string
  description: string
  authority?:  "lens" | "manual"  // defaults to "lens" on import
}

interface GoldenRelation {
  rel:         string
  description: string
  symmetric?:  boolean  // defaults to false
  authority?:  "lens" | "manual"
}

// Usage statistics
interface TypeUsage {
  type:       string
  count:      number
  first_seen: string  // ISO timestamp
  last_seen:  string  // ISO timestamp
  golden:     boolean
}

interface RelationUsage {
  rel:        string
  count:      number
  first_seen: string
  last_seen:  string
  golden:     boolean
}

// Stats result
interface LensStats {
  types:     TypeUsage[]
  relations: RelationUsage[]
}
```

## Default Lens (Seeded on Init)

```yaml
name: default
version: 1.0.0
description: Default lens for code analysis

concepts:
  - type: Entity
    description: A code component (service, module, class)
  - type: Caveat
    description: A constraint or warning about code behavior
  - type: Rule
    description: A governance rule for verification

relations:
  - rel: DEPENDS_ON
    description: Source requires target to function
    symmetric: false
  - rel: CONFLICTS_WITH
    description: Mutual exclusion constraint
    symmetric: true
  - rel: DEFINED_IN
    description: Concept is defined in a file
    symmetric: false
```

## Migration Notes

1. **Additive only** - No changes to existing relations
2. **Check on init** - `/mind/init` checks for `lens_meta`, creates if missing
3. **Seed default** - Default lens is inserted if no lens exists
4. **Version bump** - `schema_meta.version` updated to "1.6.0"

## Queries

### Check if lens exists

```datalog
?[name] := *lens_meta['name', name]
```

### Get all golden types

```datalog
?[type, description, authority] := *golden_types[type, description, authority]
```

### Check if type is golden

```datalog
?[type] := *golden_types[type, _, _], type = 'Entity'
```

### Get usage stats (non-golden only)

```datalog
?[type, count, first_seen, last_seen] :=
  *type_usage[type, count, first_seen, last_seen, golden],
  golden = false
```

### Upsert type usage

```datalog
?[type, count, first_seen, last_seen, golden] :=
  *type_usage[type, old_count, old_first, _, _],
  type = 'Character',
  count = old_count + 1,
  first_seen = old_first,
  last_seen = '2026-01-31T12:00:00Z',
  golden = false

?[type, count, first_seen, last_seen, golden] :=
  not *type_usage['Character', _, _, _, _],
  type = 'Character',
  count = 1,
  first_seen = '2026-01-31T12:00:00Z',
  last_seen = '2026-01-31T12:00:00Z',
  golden = false

:put type_usage { type => count, first_seen, last_seen, golden }
```
