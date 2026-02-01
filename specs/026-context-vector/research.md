# Research: Context Vector Search

**Feature**: 026-context-vector
**Date**: 2026-02-01

## Research Questions

### Q1: How should vector search results be combined with exact matches?

**Decision**: Priority-based deduplication with "both" marker

**Rationale**:
- Exact name matches should rank higher than semantic-only matches (user intent is clear)
- Concepts matching both ways should be marked with `relevance: "both"` for transparency
- Semantic matches fill in the gaps that substring matching misses
- Score from vector search should be preserved for semantic matches

**Alternatives considered**:
1. Simple union (rejected: loses relevance information)
2. Interleaved ranking (rejected: more complex, less predictable)
3. Separate result arrays (rejected: duplicates concepts, complicates graph expansion)

### Q2: What is the optimal similarity threshold for semantic matches?

**Decision**: No hard threshold, rely on HNSW k-limit

**Rationale**:
- HNSW returns k nearest neighbors regardless of absolute distance
- Very low similarity scores are naturally ranked last
- User controls result count via `limit` parameter
- Threshold would be arbitrary and domain-dependent

**Alternatives considered**:
1. Fixed threshold 0.5 (rejected: too arbitrary, would miss relevant results)
2. Dynamic threshold based on score distribution (rejected: over-engineering for YAGNI)

### Q3: How should fallback work when embeddings fail?

**Decision**: Silent fallback to exact-only mode

**Rationale**:
- User should still get results (degraded but functional)
- No error thrown - just reduced capability
- Result structure unchanged (semantic matches simply absent)
- Matches existing pattern in `/mind/search` graceful degradation

**Alternatives considered**:
1. Return error (rejected: too disruptive for optional enhancement)
2. Warning in result meta (rejected: adds complexity, user may not care)

### Q4: What happens with short queries (<3 chars)?

**Decision**: Skip semantic search, use exact-only

**Rationale**:
- Very short strings produce unreliable embeddings
- Single letters/abbreviations are better matched exactly
- Avoids wasting compute on meaningless vectors

**Alternatives considered**:
1. Still try semantic (rejected: produces noise, wastes resources)
2. Different threshold (rejected: 3 chars is reasonable boundary)

## Existing Patterns

### From `/mind/search` (search.ts)

```typescript
// Generate embedding for query
const query_embedding = await generate_embedding(p.query)

if (query_embedding === null) {
  // Graceful failure
}

// HNSW search
const result = await db.run(`
  ?[id, name, type, distance] := ~concepts:semantic{
    id, name, type |
    query: vec(${vector_str}),
    k: ${limit},
    ef: 50,
    bind_distance: distance
  }
`)
```

### From current `/context/query` (query.ts)

```typescript
// Current: case-insensitive substring search
for (const [id, name, type] of all_concepts) {
  if (name.toLowerCase().includes(query_lower)) {
    direct_matches.push({ id, name, type, relevance: "direct" })
  }
}
```

## Implementation Strategy

1. **Add mode parameter** to QueryParams interface
2. **Refactor concept search** into separate functions:
   - `search_exact(query, limit)` - current substring logic
   - `search_semantic(db, query, limit)` - new vector search
   - `search_hybrid(db, query, limit)` - combines both
3. **Update ConceptResult** to include optional `score` field
4. **Update relevance field** to support "exact", "semantic", "both"
5. **Add mode to CLI** via `--mode` flag
