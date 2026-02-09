# Feature Specification: Vector Search

**Feature Branch**: `021-vector-search`
**Created**: 2026-01-30
**Status**: Draft
**Input**: User description: "Vector embeddings for concepts enabling semantic similarity search. Generate embeddings when concepts are created/updated, store in mind.db, provide /mind/search endpoint for finding semantically similar concepts."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Semantic Concept Search (Priority: P1)

A user wants to find concepts by meaning rather than exact name matching. They search for "authentication" and find related concepts like "AuthService", "LoginHandler", "UserCredentials" even if those exact terms weren't in the query.

**Why this priority**: This is the core value proposition - semantic search enables finding relevant concepts without knowing exact names, which is critical for AI agents building context.

**Independent Test**: Can be fully tested by creating concepts, then searching with semantically related queries and verifying relevant concepts are returned with similarity scores.

**Acceptance Scenarios**:

1. **Given** a mind.db with concepts "AuthService", "LoginHandler", "DatabasePool", **When** user searches for "user authentication", **Then** AuthService and LoginHandler are returned with high similarity scores, DatabasePool with lower score.
2. **Given** a mind.db with concepts, **When** user searches with limit parameter, **Then** only the top N most similar concepts are returned.
3. **Given** an empty mind.db, **When** user searches for anything, **Then** empty results are returned (not an error).

---

### User Story 2 - Automatic Embedding Generation (Priority: P2)

When concepts are created or updated, embeddings are automatically generated and stored without requiring explicit user action. This ensures the knowledge graph is always searchable.

**Why this priority**: Without embeddings, search cannot work. This is the prerequisite for US1 but can be implemented and tested independently.

**Independent Test**: Can be tested by creating concepts and verifying embeddings are stored in mind.db, then updating concepts and verifying embeddings are refreshed.

**Acceptance Scenarios**:

1. **Given** an initialized mind.db, **When** a concept is created via /mind/concepts/create, **Then** an embedding vector is generated and stored.
2. **Given** a concept with an existing embedding, **When** the concept name is updated, **Then** the embedding is regenerated to reflect the new name.
3. **Given** the LLM/embedding provider is unavailable, **When** a concept is created, **Then** the concept is created successfully but without an embedding (graceful degradation).

---

### User Story 3 - Local Embedding Generation (Priority: P3)

Embeddings are generated locally using a small, quantized model that runs on CPU. No external API calls, no costs, works offline.

**Why this priority**: Local generation is the implementation choice, but the system works regardless of how embeddings are generated. This story covers the "how" rather than the "what".

**Independent Test**: Can be tested by generating embeddings without network access and verifying they are produced correctly.

**Acceptance Scenarios**:

1. **Given** no network connection, **When** a concept is created, **Then** embeddings are still generated successfully.
2. **Given** a concept name, **When** embeddings are generated, **Then** the operation completes in under 100ms on typical hardware.
3. **Given** the same concept name, **When** embeddings are generated multiple times, **Then** identical vectors are produced (deterministic).

---

### Edge Cases

- How does system handle very long concept names exceeding model input limits?
  - Truncate to model's max input length (typically 512 tokens, plenty for concept names)
- What happens during bulk concept imports?
  - Process embeddings sequentially; local generation is fast enough (~50ms each)
- How does search handle concepts without embeddings (legacy data or failed generation)?
  - Concepts without embeddings are excluded from vector search results but remain queryable by exact name
- What if the embedding model fails to load?
  - Graceful degradation: concepts created without embeddings, warning logged

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST store embedding vectors in the concepts relation in mind.db
- **FR-002**: System MUST automatically generate embeddings when concepts are created via /mind/concepts/create
- **FR-003**: System MUST regenerate embeddings when concepts are updated via /mind/concepts/update
- **FR-004**: System MUST provide /mind/search endpoint accepting a query string and returning similar concepts
- **FR-005**: System MUST return similarity scores (0.0-1.0) with each search result
- **FR-006**: System MUST generate embeddings locally without external API calls
- **FR-007**: System MUST gracefully handle embedding model unavailability (create concept without embedding)
- **FR-008**: System MUST support limit parameter on /mind/search to control result count
- **FR-009**: System MUST use the same embedding model for both concept storage and query embedding
- **FR-010**: System MUST use a small, quantized model suitable for CPU execution (no GPU required)

### Key Entities

- **Concept (extended)**: Existing concept entity gains a `vector` field storing the embedding (384-dimensional, matching all-MiniLM-L6-v2 output)
- **Embedding**: Float array representing semantic meaning, stored inline with concept
- **Search Result**: Concept plus similarity score, ordered by relevance
- **HNSW Index**: CozoDB vector index on concepts for fast approximate nearest neighbor search

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can find semantically related concepts without knowing exact names
- **SC-002**: Search returns results ranked by similarity score
- **SC-003**: 95% of concept creates complete successfully even when embedding generation fails
- **SC-004**: Search queries return results within user-perceptible time for graphs up to 10,000 concepts

## Assumptions

- CozoDB supports storing float vectors and HNSW indexing (confirmed in docs)
- CozoDB supports cosine distance for similarity search
- Transformers.js (or similar) can run quantized ONNX models in Bun
- all-MiniLM-L6-v2 model produces 384-dimensional embeddings
- Local embedding generation is fast enough (~20-50ms per concept on CPU)
- Mock mode (BRANE_EMBED_MOCK=1) will generate deterministic mock embeddings for testing

## Design Rationale

**Why local embeddings instead of API-based?**

Vector search in Brane is used to find "entry points" into the knowledge graph. Once anchor concepts are found, Datalog graph traversal expands to related nodes. This means:

1. We need "good enough" semantic similarity, not state-of-the-art
2. Embedding quality matters less than graph structure for final results
3. Zero cost and offline operation are more valuable than marginal quality improvements

A small local model (384 dims) is ideal for this use case.
