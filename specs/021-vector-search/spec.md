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

### User Story 3 - Configurable Embedding Provider (Priority: P3)

Users can configure which embedding provider to use (Claude or Gemini) via the existing .brane/config.json, allowing flexibility based on available API access.

**Why this priority**: Flexibility is valuable but not essential for MVP. The system can work with a single provider initially.

**Independent Test**: Can be tested by configuring different providers and verifying the correct API is called.

**Acceptance Scenarios**:

1. **Given** config.json with llm.provider set to "claude", **When** embeddings are generated, **Then** Claude's embedding API is used.
2. **Given** config.json with llm.provider set to "gemini", **When** embeddings are generated, **Then** Gemini's embedding API is used.
3. **Given** no config.json, **When** embeddings are generated, **Then** system auto-detects available provider (same logic as /calabi/scan).

---

### Edge Cases

- What happens when embedding dimension mismatch occurs between providers?
  - System stores embedding dimension in schema_meta and validates on generation
- How does system handle very long concept names exceeding embedding input limits?
  - Truncate to provider's max input length (document in success message if truncated)
- What happens during bulk concept imports?
  - Process embeddings sequentially to avoid rate limiting; batch where provider supports it
- How does search handle concepts without embeddings (created during provider outage)?
  - Concepts without embeddings are excluded from vector search results but remain queryable by exact name

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST store embedding vectors in the concepts relation in mind.db
- **FR-002**: System MUST automatically generate embeddings when concepts are created via /mind/concepts/create
- **FR-003**: System MUST regenerate embeddings when concepts are updated via /mind/concepts/update
- **FR-004**: System MUST provide /mind/search endpoint accepting a query string and returning similar concepts
- **FR-005**: System MUST return similarity scores (0.0-1.0) with each search result
- **FR-006**: System MUST support configuring embedding provider via .brane/config.json (llm.provider)
- **FR-007**: System MUST gracefully handle embedding provider unavailability (create concept without embedding)
- **FR-008**: System MUST support limit parameter on /mind/search to control result count
- **FR-009**: System MUST use the same embedding provider for both concept storage and query embedding

### Key Entities

- **Concept (extended)**: Existing concept entity gains a `vector` field storing the embedding (1536-dimensional for consistency with OpenAI/Claude dimensions)
- **Embedding**: Float array representing semantic meaning, stored inline with concept
- **Search Result**: Concept plus similarity score, ordered by relevance

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can find semantically related concepts without knowing exact names
- **SC-002**: Search returns results ranked by similarity score
- **SC-003**: 95% of concept creates complete successfully even when embedding generation fails
- **SC-004**: Search queries return results within user-perceptible time for graphs up to 10,000 concepts

## Assumptions

- CozoDB supports storing float vectors as a field type (Float arrays)
- CozoDB supports vector similarity operations (cosine distance) - if not, we implement in application layer
- Claude and Gemini both provide embedding APIs with similar dimension outputs
- Embedding dimension is 1536 (standard for many providers; can be configured in schema if needed)
- Mock mode (BRANE_LLM_MOCK=1) will generate deterministic mock embeddings for testing
