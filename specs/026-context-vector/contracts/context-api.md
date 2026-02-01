# API Contract: /context/query

**Version**: 2.0.0 (adds mode parameter and semantic search)
**Endpoint**: `/context/query`

## Request

```typescript
interface QueryParams {
  query:  string              // Required: search term
  depth?: number              // Optional: graph expansion depth (0-2, default: 1)
  limit?: number              // Optional: max concepts (1-50, default: 10)
  mode?:  "semantic" | "exact" | "hybrid"  // Optional: search mode (default: "hybrid")
}
```

### Mode Behavior

| Mode | Description |
|------|-------------|
| `hybrid` | Default. Combines exact substring matches with semantic similarity. Exact matches prioritized. |
| `exact` | Substring matching only (original behavior). Case-insensitive. |
| `semantic` | Vector similarity only. Requires query length ≥3 characters. |

## Response

```typescript
interface ContextResult {
  concepts: ConceptResult[]
  files:    FileResult[]
  graph:    GraphResult
}

interface ConceptResult {
  id:        number
  name:      string
  type:      string
  relevance: "exact" | "semantic" | "both" | "neighbor"
  score?:    number  // Only present for semantic/both matches (0.0-1.0)
}

interface FileResult {
  url:      string
  concepts: number[]
  preview:  string | null
}

interface GraphResult {
  nodes: number[]
  edges: EdgeResult[]
}

interface EdgeResult {
  source:   number
  target:   number
  relation: string
}
```

## Examples

### Hybrid Search (default)

**Request**:
```json
{"query": "authentication", "limit": 5}
```

**Response**:
```json
{
  "status": "success",
  "result": {
    "concepts": [
      {"id": 1, "name": "AuthService", "type": "Entity", "relevance": "semantic", "score": 0.847},
      {"id": 2, "name": "authentication_helper", "type": "Entity", "relevance": "both", "score": 0.912},
      {"id": 3, "name": "LoginController", "type": "Entity", "relevance": "semantic", "score": 0.723}
    ],
    "files": [...],
    "graph": {...}
  }
}
```

### Exact Mode

**Request**:
```json
{"query": "auth", "mode": "exact"}
```

**Response**:
```json
{
  "status": "success",
  "result": {
    "concepts": [
      {"id": 1, "name": "AuthService", "type": "Entity", "relevance": "exact"},
      {"id": 2, "name": "authentication_helper", "type": "Entity", "relevance": "exact"}
    ],
    "files": [...],
    "graph": {...}
  }
}
```

### Semantic Mode

**Request**:
```json
{"query": "login flow", "mode": "semantic"}
```

**Response**:
```json
{
  "status": "success",
  "result": {
    "concepts": [
      {"id": 1, "name": "AuthService", "type": "Entity", "relevance": "semantic", "score": 0.834},
      {"id": 4, "name": "SessionManager", "type": "Entity", "relevance": "semantic", "score": 0.756}
    ],
    "files": [...],
    "graph": {...}
  }
}
```

## Error Cases

### Query Too Short for Semantic

**Request**:
```json
{"query": "ab", "mode": "semantic"}
```

**Response**:
```json
{
  "status": "error",
  "result": null,
  "errors": {
    "query": [{"code": "too_short", "message": "semantic search requires query length >= 3"}]
  }
}
```

### Embedding Failure (Hybrid/Semantic)

System silently falls back to exact-only search. No error returned - just reduced semantic capability.

## Backward Compatibility

- Existing queries without `mode` parameter receive `hybrid` behavior
- `hybrid` mode includes all results that `exact` mode would return (superset)
- Response structure unchanged except for optional `score` field
- `relevance` field adds new values but existing code checking for "direct" should check for "exact" (breaking change documented)

### Migration Note

The `relevance: "direct"` value is renamed to `relevance: "exact"` for clarity. Clients should update pattern matching accordingly.
