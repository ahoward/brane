# Research: Vector Search

## Decision 1: Embedding Library

**Decision**: Use `fastembed-js` for local embedding generation.

**Rationale**:
- Zero API cost (runs locally via ONNX Runtime)
- Works offline
- Simple API: `embeddingModel.queryEmbed(text)` returns `number[]`
- Default model (BGE) is top of MTEB leaderboard
- MIT licensed

**Alternatives Considered**:

| Option | Pros | Cons | Rejected Because |
|--------|------|------|------------------|
| Transformers.js | Official HuggingFace, more models | Larger, more complex setup | fastembed is simpler, purpose-built |
| OpenAI API | Best quality | Costs money, needs network | Cost and offline requirement |
| Claude API | Good quality | Costs money, needs network | Cost and offline requirement |

**Sources**:
- [fastembed npm](https://www.npmjs.com/package/fastembed)
- [fastembed-js GitHub](https://github.com/Anush008/fastembed-js)

## Decision 2: Embedding Dimensions

**Decision**: Use 384 dimensions (BGESmallEN model).

**Rationale**:
- Smaller than 1536 = faster search, less storage
- "Good enough" for finding graph entry points
- CozoDB supports any dimension via HNSW index config

**Alternatives Considered**:

| Option | Dims | Quality | Rejected Because |
|--------|------|---------|------------------|
| BGEBaseEN | 768 | Higher | Overkill for entry point finding |
| OpenAI ada-002 | 1536 | Highest | Costs money, we don't need best quality |

## Decision 3: Vector Storage

**Decision**: Store vectors in CozoDB `concepts` relation with HNSW index.

**Rationale**:
- CozoDB natively supports HNSW vector indexing
- Vectors stored inline with concepts (no separate table)
- Cosine distance for similarity

**Implementation**:

```datalog
# Schema change (mind/init.ts)
:create concepts {
  id: Int,
  name: String,
  type: String,
  vector: <F32; 384>?  # nullable for graceful degradation
}

# Create HNSW index
::hnsw create concepts:semantic {
  dim: 384,
  m: 50,
  dtype: F32,
  fields: [vector],
  distance: Cosine,
  ef_construction: 100
}
```

**Sources**:
- [CozoDB Vector Search Docs](https://docs.cozodb.org/en/latest/vector.html)

## Decision 4: Mock Mode

**Decision**: Use `BRANE_EMBED_MOCK=1` environment variable for testing.

**Rationale**:
- Consistent with existing `BRANE_LLM_MOCK` pattern
- Deterministic embeddings for reproducible tests
- No model download during CI

**Mock Implementation**:
- Generate deterministic vector from text hash
- Same input always produces same output
- Vectors are valid (normalized, correct dimension)

## Decision 5: Graceful Degradation

**Decision**: Concept creation succeeds even if embedding fails.

**Rationale**:
- Constitution Principle VI (Simplicity) - don't over-complicate
- Concepts without embeddings are still useful (exact name queries, graph traversal)
- Search simply excludes concepts with null vectors

**Implementation**:
- `vector` field is nullable in schema
- Embedding errors logged but don't fail concept creation
- `/mind/search` filters to `vector != null`

## Performance Estimates

| Operation | Expected Time | Notes |
|-----------|---------------|-------|
| Embedding generation | ~50ms | fastembed on CPU |
| Search (1k concepts) | <10ms | HNSW is O(log n) |
| Search (10k concepts) | <50ms | HNSW scales well |
| Model first load | ~2s | One-time, cached |

## Bun Compatibility

fastembed-js uses `onnxruntime-node` which is compatible with Bun's Node.js compatibility layer. No special configuration needed.

Confirmed: [Transformers.js docs](https://huggingface.co/blog/transformersjs-v3) list Bun as supported runtime.
