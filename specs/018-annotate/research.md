# Research: Manual Annotations

**Feature**: 018-annotate
**Date**: 2026-01-28

## Design Decisions

### 1. Authority Representation

**Decision**: Store authority as string "infinity" not numeric value

**Rationale**:
- PRD specifies "authority: infinity" literally
- String avoids IEEE float infinity edge cases
- Clear semantic meaning in JSON output
- Future: could support numeric authority levels if needed (0.0-1.0, then "infinity")

**Alternatives Rejected**:
- Float infinity: JSON serialization issues, unclear semantics
- Max int: Arbitrary, loses "infinite" meaning
- Boolean `is_manual`: Less expressive, harder to extend

### 2. Annotation Types

**Decision**: Three types - caveat (default), note, todo

**Rationale**:
- `caveat`: Warning/constraint - "Do not touch", "Legacy system"
- `note`: Informational - "Refactored in Q2", "See design doc"
- `todo`: Action item - "Needs tests", "Review before merge"
- Default to `caveat` per PRD focus on constraints

**Alternatives Rejected**:
- Free-form tags: Over-complicates, no clear semantics
- Single type: Loses useful categorization
- More types: YAGNI, three covers common cases

### 3. Schema Migration

**Decision**: Add `annotations` relation in handler, bump schema version to 1.3.0

**Rationale**:
- CozoDB allows adding relations without migration
- Version bump signals schema change
- Lazy creation: relation created on first annotation create if missing
- No data migration needed (new relation)

**Schema**:
```
:create annotations {
  id: Int,
  target: Int,           # concept_id
  text: String,
  type: String,          # caveat, note, todo
  authority: String,     # "infinity"
  created_at: String     # ISO timestamp
}
```

### 4. Orphaned Annotations

**Decision**: Allow orphaned annotations (target concept deleted)

**Rationale**:
- Annotations represent human intent, should persist
- Deleting concept doesn't invalidate the annotation's message
- List endpoint can filter to show only valid targets if needed
- Simpler than cascading deletes or foreign key constraints

### 5. Timestamp Handling

**Decision**: Use ISO 8601 string format, set on create only

**Rationale**:
- CozoDB doesn't have native datetime type
- ISO 8601 is sortable as string
- No updated_at (annotations are immutable except delete)
- Consistent with provenance pattern

### 6. Text Length Limit

**Decision**: 4096 characters max

**Rationale**:
- Long enough for detailed annotations
- Short enough to prevent abuse
- Matches common text field limits
- Easy to validate in handler

## Implementation Notes

### mind.ts Additions

```typescript
// Annotation types
export const ANNOTATION_TYPES = ["caveat", "note", "todo"] as const
export type AnnotationType = typeof ANNOTATION_TYPES[number]

export function is_valid_annotation_type(type: string): type is AnnotationType {
  return ANNOTATION_TYPES.includes(type as AnnotationType)
}

// ID counter
export async function get_next_annotation_id(db: CozoDb): Promise<number>

// Annotation exists check
export async function annotation_exists(db: CozoDb, id: number): Promise<boolean>

// Ensure annotations relation exists
export async function ensure_annotations_relation(db: CozoDb): Promise<void>
```

### Handler Patterns

Follow existing patterns from concepts/edges:
- Validate required params first
- Open mind.db with `open_mind()`
- Check `is_mind_error()` for initialization errors
- Use try/catch for CozoDB operations
- Always close db in finally or after operation
- Return Result envelope

## References

- PRD Section 3.4: Memory: The "Write-Back"
- Existing patterns: `src/handlers/mind/concepts/create.ts`
- Constitution Principle VI: Simplicity
