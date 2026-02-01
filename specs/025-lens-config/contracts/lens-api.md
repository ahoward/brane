# Lens API Contracts

All endpoints follow the standard Result envelope:

```typescript
{
  status:  "success" | "error",
  result:  T | null,
  errors:  ErrorMap | null,
  meta:    { path: string, timestamp: string, duration_ms: number }
}
```

---

## `/lens/show`

Returns the current lens configuration.

### Request

```json
{}
```

No parameters required.

### Success Response

```json
{
  "status": "success",
  "result": {
    "name": "default",
    "version": "1.0.0",
    "description": "Default lens for code analysis",
    "concepts": [
      { "type": "Entity", "description": "A code component", "authority": "lens" },
      { "type": "Caveat", "description": "A constraint or warning", "authority": "lens" }
    ],
    "relations": [
      { "rel": "DEPENDS_ON", "description": "Source requires target", "symmetric": false, "authority": "lens" }
    ],
    "consolidation": {}
  },
  "errors": null,
  "meta": { "path": "/lens/show", "timestamp": "...", "duration_ms": 5 }
}
```

### Error Response (not initialized)

```json
{
  "status": "error",
  "result": null,
  "errors": {
    "mind": [{ "code": "not_initialized", "message": "mind not initialized (run brane init)" }]
  },
  "meta": { "path": "/lens/show", "timestamp": "...", "duration_ms": 1 }
}
```

---

## `/lens/import`

Import a lens configuration from a YAML file.

### Request

```json
{
  "path": "./my-lens.yml",
  "mode": "merge"
}
```

**Fields**:
- `path` (required) - path to YAML file
- `mode` (optional) - "merge" (default) or "replace"

### Success Response

```json
{
  "status": "success",
  "result": {
    "name": "code-analysis",
    "version": "1.0.0",
    "concepts_imported": 5,
    "relations_imported": 3,
    "consolidation_rules": 2
  },
  "errors": null,
  "meta": { "path": "/lens/import", "timestamp": "...", "duration_ms": 15 }
}
```

### Error Responses

**File not found**:
```json
{
  "status": "error",
  "result": null,
  "errors": {
    "path": [{ "code": "not_found", "message": "file not found: ./missing.yml" }]
  },
  "meta": { "path": "/lens/import", "timestamp": "...", "duration_ms": 1 }
}
```

**Invalid YAML**:
```json
{
  "status": "error",
  "result": null,
  "errors": {
    "yaml": [{ "code": "parse_error", "message": "invalid YAML at line 5: unexpected token" }]
  },
  "meta": { "path": "/lens/import", "timestamp": "...", "duration_ms": 2 }
}
```

**Missing required field**:
```json
{
  "status": "error",
  "result": null,
  "errors": {
    "name": [{ "code": "required", "message": "name is required" }]
  },
  "meta": { "path": "/lens/import", "timestamp": "...", "duration_ms": 2 }
}
```

---

## `/lens/export`

Export the current lens configuration as YAML.

### Request

```json
{}
```

No parameters required.

### Success Response

```json
{
  "status": "success",
  "result": {
    "yaml": "name: default\nversion: 1.0.0\ndescription: Default lens for code analysis\nconcepts:\n  - type: Entity\n    description: A code component\n..."
  },
  "errors": null,
  "meta": { "path": "/lens/export", "timestamp": "...", "duration_ms": 8 }
}
```

---

## `/lens/stats`

Return usage statistics for types and relations.

### Request

```json
{
  "candidates_only": false
}
```

**Fields**:
- `candidates_only` (optional) - if true, only return non-golden entries

### Success Response

```json
{
  "status": "success",
  "result": {
    "types": [
      { "type": "Entity", "count": 42, "golden": true, "first_seen": "2026-01-15T10:00:00Z", "last_seen": "2026-01-31T09:00:00Z" },
      { "type": "Character", "count": 18, "golden": false, "first_seen": "2026-01-20T14:00:00Z", "last_seen": "2026-01-31T08:00:00Z" }
    ],
    "relations": [
      { "rel": "DEPENDS_ON", "count": 35, "golden": true, "first_seen": "2026-01-15T10:00:00Z", "last_seen": "2026-01-31T09:00:00Z" },
      { "rel": "LOVES", "count": 7, "golden": false, "first_seen": "2026-01-25T16:00:00Z", "last_seen": "2026-01-30T11:00:00Z" }
    ]
  },
  "errors": null,
  "meta": { "path": "/lens/stats", "timestamp": "...", "duration_ms": 3 }
}
```

### With `candidates_only: true`

```json
{
  "status": "success",
  "result": {
    "types": [
      { "type": "Character", "count": 18, "golden": false, "first_seen": "...", "last_seen": "..." }
    ],
    "relations": [
      { "rel": "LOVES", "count": 7, "golden": false, "first_seen": "...", "last_seen": "..." }
    ]
  },
  "errors": null,
  "meta": { "path": "/lens/stats", "timestamp": "...", "duration_ms": 2 }
}
```

---

## `/lens/bless`

Promote a detected type or relation to golden status.

### Request (type)

```json
{
  "type": "Character",
  "description": "A person in the narrative"
}
```

### Request (relation)

```json
{
  "rel": "LOVES",
  "description": "Romantic or familial affection",
  "symmetric": true
}
```

**Fields**:
- `type` or `rel` (one required) - the type/relation to bless
- `description` (required) - human-readable description
- `symmetric` (optional, relations only) - defaults to false

### Success Response (type)

```json
{
  "status": "success",
  "result": {
    "type": "Character",
    "description": "A person in the narrative",
    "authority": "manual"
  },
  "errors": null,
  "meta": { "path": "/lens/bless", "timestamp": "...", "duration_ms": 5 }
}
```

### Success Response (relation)

```json
{
  "status": "success",
  "result": {
    "rel": "LOVES",
    "description": "Romantic or familial affection",
    "symmetric": true,
    "authority": "manual"
  },
  "errors": null,
  "meta": { "path": "/lens/bless", "timestamp": "...", "duration_ms": 5 }
}
```

### Error Responses

**Missing description**:
```json
{
  "status": "error",
  "result": null,
  "errors": {
    "description": [{ "code": "required", "message": "description is required" }]
  },
  "meta": { "path": "/lens/bless", "timestamp": "...", "duration_ms": 1 }
}
```

**Neither type nor rel provided**:
```json
{
  "status": "error",
  "result": null,
  "errors": {
    "params": [{ "code": "invalid", "message": "must provide either type or rel" }]
  },
  "meta": { "path": "/lens/bless", "timestamp": "...", "duration_ms": 1 }
}
```
