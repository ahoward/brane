# Research: 025-lens-config

## YAML Parsing in Bun/TypeScript

**Decision**: Use `js-yaml` package

**Rationale**:
- Most widely used YAML parser in Node/Bun ecosystem (30M+ weekly downloads)
- Supports YAML 1.1 and 1.2 specs
- Safe by default (no arbitrary code execution)
- Pure JavaScript, works in Bun without native bindings
- Well-typed with `@types/js-yaml`

**Alternatives Considered**:
- `yaml` (newer, YAML 1.2 only) - less adoption, more complex API
- Hand-rolled parser - violates YAGNI, error-prone

**Installation**: `bun add js-yaml && bun add -d @types/js-yaml`

## CozoDB Schema Migration Strategy

**Decision**: Additive migration with version bump

**Rationale**:
- Existing schema (v1.5.0) has `schema_meta` relation storing version
- New relations (`lens_meta`, `golden_types`, etc.) are additive
- No changes to existing relations (concepts, edges, rules, etc.)
- Check schema version on `/mind/init`, create new relations if missing
- Pattern matches existing `ensure_annotations_relation()` in mind.ts

**Migration Flow**:
1. On `/mind/init`, check if `lens_meta` relation exists
2. If not, create all lens-related relations
3. Seed default lens (Entity/Caveat/Rule + DEPENDS_ON/etc.)
4. Update `schema_meta.version` to "1.6.0"

**Alternatives Considered**:
- Separate migration command - extra complexity, users must remember
- Version check in every handler - performance overhead, scattered logic

## Usage Tracking Implementation

**Decision**: Inline tracking in concept/edge create/update handlers

**Rationale**:
- Simple, explicit, easy to understand
- No middleware/hook abstraction needed
- Usage is updated atomically with the main operation
- Follows YAGNI - no premature abstraction

**Implementation**:
```typescript
// In /mind/concepts/create handler, after successful insert:
await update_type_usage(db, concept.type)

// Helper function:
async function update_type_usage(db: CozoDb, type: string): Promise<void> {
  const now = new Date().toISOString()
  const is_golden = await is_golden_type(db, type)

  // Upsert: increment count, update last_seen
  await db.run(`
    ?[type, count, first_seen, last_seen, golden] :=
      *type_usage[type, old_count, old_first, _, _],
      type = '${type}',
      count = old_count + 1,
      first_seen = old_first,
      last_seen = '${now}',
      golden = ${is_golden}

    ?[type, count, first_seen, last_seen, golden] :=
      not *type_usage['${type}', _, _, _, _],
      type = '${type}',
      count = 1,
      first_seen = '${now}',
      last_seen = '${now}',
      golden = ${is_golden}

    :put type_usage { type => count, first_seen, last_seen, golden }
  `)
}
```

**Alternatives Considered**:
- Event system / hooks - over-engineering for this use case
- Batch updates on export - stale data between exports
- Separate tracking daemon - way too complex

## Default Lens Configuration

**Decision**: Seed on `brane init`, store in mind.db

**Rationale**:
- Users get a working lens immediately
- Matches existing behavior (Entity/Caveat/Rule work out of box)
- No external file dependency
- Can be overwritten with `brane lens import`

**Default Lens Content**:
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

## Lens File Discovery

**Decision**: Explicit path only, no auto-discovery

**Rationale**:
- `brane lens import ./path/to/lens.yml` - explicit is clear
- `brane init --lens ./path/to/lens.yml` - optional at init time
- No magic `.brane/lens.yml` auto-loading (confusing, implicit)
- Lens is stored in mind.db after import, not as a file

**Alternatives Considered**:
- Auto-load `.brane/lens.yml` on every operation - too magical
- Require lens file to exist - breaks existing usage

## Golden Type Authority

**Decision**: Binary (lens vs manual), no graduated levels

**Rationale**:
- Simpler to understand and implement
- "lens" = came from imported lens file
- "manual" = blessed via `brane lens bless`
- Both have equal precedence for consolidation purposes
- Can extend later if needed (YAGNI)

**Alternatives Considered**:
- Graduated levels (lens < manual < locked) - no use case yet
- Numeric priority - over-engineering

## CLI Command Structure

**Decision**: `brane lens <subcommand>` pattern

**Rationale**:
- Matches existing patterns (`brane concept`, `brane edge`, `brane rule`)
- Clear namespace separation
- Discoverable via `brane lens --help`

**Commands**:
```bash
brane lens show              # Display current lens config
brane lens import <file>     # Import lens from YAML
brane lens export            # Export lens to stdout (YAML)
brane lens stats             # Show usage statistics
brane lens stats --candidates  # Filter to non-golden only
brane lens bless --type X    # Promote type to golden
brane lens bless --rel X     # Promote relation to golden
```

## Error Handling

**Decision**: Standard Result envelope, fail gracefully

**Scenarios**:
- Invalid YAML syntax → error with parse details
- Missing required fields → error listing missing fields
- File not found → error with path
- mind.db not initialized → error (same as other handlers)
- Duplicate golden type → silent upsert (idempotent)

## Test Strategy

**Decision**: tc contract tests for all handlers

**Test Cases**:
```
tests/lens/
├── show/
│   ├── data/00-success-default-lens/
│   ├── data/01-success-custom-lens/
│   └── data/02-error-not-initialized/
├── import/
│   ├── data/00-success-basic/
│   ├── data/01-success-with-consolidation/
│   ├── data/02-error-invalid-yaml/
│   ├── data/03-error-missing-name/
│   └── data/04-error-file-not-found/
├── export/
│   ├── data/00-success-basic/
│   └── data/01-error-not-initialized/
├── stats/
│   ├── data/00-success-empty/
│   ├── data/01-success-with-usage/
│   ├── data/02-success-candidates-only/
│   └── data/03-error-not-initialized/
└── bless/
    ├── data/00-success-type/
    ├── data/01-success-relation/
    ├── data/02-error-missing-description/
    └── data/03-error-not-initialized/
```
