# Data Model: Vector Search

## Schema Changes

### mind.db Schema v1.5.0

**Changed Relation: `concepts`**

```datalog
# Before (v1.4.0)
:create concepts {
  id: Int,
  name: String,
  type: String
}

# After (v1.5.0)
:create concepts {
  id: Int,
  name: String,
  type: String,
  vector: <F32; 384>?   # NEW: nullable embedding vector
}
```

**New Index: `concepts:semantic`**

```datalog
::hnsw create concepts:semantic {
  dim: 384,
  m: 50,
  dtype: F32,
  fields: [vector],
  distance: Cosine,
  ef_construction: 100
}
```

### schema_meta Updates

```datalog
?[key, value] <- [['version', '1.5.0']]
:put schema_meta { key => value }

?[key, value] <- [['embedding_dim', '384']]
:put schema_meta { key => value }

?[key, value] <- [['embedding_model', 'BGESmallEN']]
:put schema_meta { key => value }
```

## Entity Definitions

### Concept (extended)

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | Int | No | Unique identifier |
| name | String | No | Human-readable name |
| type | String | No | Entity, Caveat, or Rule |
| vector | `<F32; 384>` | Yes | Embedding vector (384 floats) |

**Notes**:
- `vector` is nullable to support graceful degradation
- Concepts without vectors are excluded from similarity search
- Concepts without vectors are still queryable by exact name

### SearchResult (new, output only)

| Field | Type | Description |
|-------|------|-------------|
| id | Int | Concept ID |
| name | String | Concept name |
| type | String | Concept type |
| score | Float | Similarity score (0.0-1.0) |

**Notes**:
- Score is cosine similarity normalized to 0-1 range
- Results ordered by score descending
- Does not include vector field (too large for output)

## Migration Strategy

### Existing Concepts

Existing concepts will have `vector: null` after schema upgrade. Options:

1. **Lazy migration**: Generate embeddings on next update
2. **Batch migration**: New `/mind/embeddings/generate` command (future)
3. **No migration**: Concepts without embeddings work fine, just not searchable

**Decision**: Option 1 (lazy) for MVP. Option 2 can be added later if needed.

## CozoDB Vector Operations

### Inserting with Vector

```datalog
?[id, name, type, vector] <- [[1, 'AuthService', 'Entity', [0.1, 0.2, ...]]]
:put concepts { id, name, type, vector }
```

### Searching by Vector

```datalog
# Using HNSW index for approximate nearest neighbors
?[id, name, type, score] :=
  ~concepts:semantic { id, name, type |
    query: $query_vector,
    k: $limit,
    ef: 50,
    bind_distance: score
  }
```

### Updating Vector

```datalog
?[id, vector] <- [[1, [0.1, 0.2, ...]]]
:put concepts { id => vector }
```
