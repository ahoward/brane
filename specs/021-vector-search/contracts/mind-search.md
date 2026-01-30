# Contract: /mind/search

## Overview

Search for concepts by semantic similarity using vector embeddings.

## Endpoint

```
POST /mind/search
```

## Input

```typescript
interface SearchParams {
  query: string      // Required: text to search for
  limit?: number     // Optional: max results (default: 10)
}
```

## Output

### Success

```typescript
{
  status: "success",
  result: {
    matches: [
      {
        id: number,
        name: string,
        type: string,
        score: number  // 0.0-1.0, higher = more similar
      }
    ]
  },
  errors: null,
  meta: { path, timestamp, duration_ms }
}
```

### Error Cases

| Code | Condition |
|------|-----------|
| `not_initialized` | mind.db doesn't exist |
| `query_required` | query param is missing/empty |
| `invalid_limit` | limit is not a positive integer |
| `embedding_failed` | Failed to generate query embedding |

## Examples

### Basic Search

**Input:**
```json
{
  "query": "user authentication"
}
```

**Output:**
```json
{
  "status": "success",
  "result": {
    "matches": [
      { "id": 1, "name": "AuthService", "type": "Entity", "score": 0.89 },
      { "id": 2, "name": "LoginHandler", "type": "Entity", "score": 0.82 },
      { "id": 5, "name": "UserCredentials", "type": "Entity", "score": 0.71 }
    ]
  },
  "errors": null,
  "meta": { "path": "/mind/search", "timestamp": "...", "duration_ms": 45 }
}
```

### With Limit

**Input:**
```json
{
  "query": "database",
  "limit": 2
}
```

**Output:**
```json
{
  "status": "success",
  "result": {
    "matches": [
      { "id": 10, "name": "DatabasePool", "type": "Entity", "score": 0.95 },
      { "id": 11, "name": "QueryBuilder", "type": "Entity", "score": 0.78 }
    ]
  },
  "errors": null,
  "meta": { "path": "/mind/search", "timestamp": "...", "duration_ms": 32 }
}
```

### Empty Results

**Input:**
```json
{
  "query": "quantum physics"
}
```

**Output:**
```json
{
  "status": "success",
  "result": {
    "matches": []
  },
  "errors": null,
  "meta": { "path": "/mind/search", "timestamp": "...", "duration_ms": 28 }
}
```

### Error: Missing Query

**Input:**
```json
{}
```

**Output:**
```json
{
  "status": "error",
  "result": null,
  "errors": {
    "query": [{ "code": "required", "message": "query is required" }]
  },
  "meta": { "path": "/mind/search", "timestamp": "...", "duration_ms": 1 }
}
```

## Behavior Notes

1. **Concepts without embeddings** are excluded from results (no error)
2. **Empty mind.db** returns empty matches array (not an error)
3. **Score** is cosine similarity, normalized to 0.0-1.0 range
4. **Results** are ordered by score descending
5. **Mock mode** (`BRANE_EMBED_MOCK=1`) uses deterministic embeddings
