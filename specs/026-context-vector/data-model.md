# Data Model: Context Vector Search

**Feature**: 026-context-vector
**Date**: 2026-02-01

## Overview

This feature modifies no database schema - it enhances query behavior using existing data structures.

## Existing Entities (Unchanged)

### concepts (CozoDB relation)

```
concepts[id, name, type, vector]
  id:     Int      # Primary key
  name:   String   # Concept name (searchable)
  type:   String   # Concept type
  vector: <F32; 384>?  # Optional embedding vector (added in 021-vector-search)
```

### concepts:semantic (HNSW index)

```
:hnsw concepts:semantic {
  dim: 384,
  m: 16,
  ef_construction: 100,
  fields: [vector],
  distance: Cosine,
  filter: vector != null
}
```

## Query Enhancement

### Input Parameters

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| query | string | Yes | - | Search term |
| depth | number | No | 1 | Graph expansion depth (0-2) |
| limit | number | No | 10 | Max concepts to return (1-50) |
| mode | string | No | "hybrid" | Search mode: "semantic", "exact", "hybrid" |

### Output Enhancements

**ConceptResult** adds:
- `relevance`: Changed from `"direct" | "neighbor"` to `"exact" | "semantic" | "both" | "neighbor"`
- `score`: Optional similarity score (0.0-1.0) for semantic matches

## Search Behavior by Mode

### exact mode
1. Load all concepts from mind.db
2. Filter by case-insensitive substring match on `name`
3. Mark results with `relevance: "exact"`
4. Expand graph per depth parameter

### semantic mode
1. Generate embedding for query (requires query.length >= 3)
2. Run HNSW search against `concepts:semantic` index
3. Mark results with `relevance: "semantic"`, include `score`
4. Expand graph per depth parameter

### hybrid mode (default)
1. Run exact search
2. Run semantic search
3. Merge results:
   - Concepts in both: `relevance: "both"`, include `score`
   - Concepts in exact only: `relevance: "exact"`
   - Concepts in semantic only: `relevance: "semantic"`, include `score`
4. Sort: exact/both first, then semantic by score
5. Expand graph per depth parameter

## Fallback Behavior

| Condition | Fallback |
|-----------|----------|
| Embedding generation fails | Use exact-only search |
| Query < 3 chars in hybrid mode | Use exact-only search |
| Query < 3 chars in semantic mode | Return error |
| No concepts have vectors | Use exact-only search |
