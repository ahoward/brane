# Data Model: Manual Annotations

**Feature**: 018-annotate
**Date**: 2026-01-28

## Entities

### Annotation

A manual note attached to a concept with infinite authority.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | integer | yes | Unique identifier (auto-increment) |
| target | integer | yes | Concept ID this annotation applies to |
| text | string | yes | Annotation content (max 4096 chars) |
| type | string | yes | One of: caveat, note, todo |
| authority | string | yes | Always "infinity" |
| created_at | string | yes | ISO 8601 timestamp |

### Relationships

```
Annotation --[target]--> Concept
```

- One annotation targets exactly one concept
- One concept can have many annotations
- Deleting a concept does NOT delete its annotations (orphan allowed)

## CozoDB Schema

```datalog
:create annotations {
  id: Int,
  target: Int,
  text: String,
  type: String,
  authority: String,
  created_at: String
}
```

## Type Constants

```typescript
export const ANNOTATION_TYPES = ["caveat", "note", "todo"] as const
export type AnnotationType = typeof ANNOTATION_TYPES[number]

// Authority is always this constant string
export const ANNOTATION_AUTHORITY = "infinity"
```

## Validation Rules

| Field | Rule |
|-------|------|
| target | Must reference existing concept |
| text | Required, 1-4096 characters |
| type | Must be one of ANNOTATION_TYPES, defaults to "caveat" |
| authority | Always "infinity" (set by system, not user) |
| created_at | Set by system to current ISO timestamp |

## Example Data

### Create Request
```json
{
  "target": 1,
  "text": "Do not touch - legacy authentication system",
  "type": "caveat"
}
```

### Stored Annotation
```json
{
  "id": 1,
  "target": 1,
  "text": "Do not touch - legacy authentication system",
  "type": "caveat",
  "authority": "infinity",
  "created_at": "2026-01-28T12:00:00.000Z"
}
```

## Queries

### List all annotations
```datalog
?[id, target, text, type, authority, created_at] :=
  *annotations[id, target, text, type, authority, created_at]
```

### Filter by target
```datalog
?[id, target, text, type, authority, created_at] :=
  *annotations[id, target, text, type, authority, created_at],
  target = 1
```

### Filter by type
```datalog
?[id, target, text, type, authority, created_at] :=
  *annotations[id, target, text, type, authority, created_at],
  type = 'caveat'
```

### Get by ID
```datalog
?[id, target, text, type, authority, created_at] :=
  *annotations[id, target, text, type, authority, created_at],
  id = 1
```
