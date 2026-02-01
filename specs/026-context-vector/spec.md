# Feature Specification: Context Vector Search

**Feature Branch**: `026-context-vector`
**Created**: 2026-02-01
**Status**: Draft
**Input**: User description: "Integrate vector search into /context/query for anchor concept finding"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Semantic Anchor Finding (Priority: P1) 🎯 MVP

Users query for context using natural language and receive semantically relevant concepts as anchors, not just exact name matches. This enables finding "AuthService" when searching for "login" or "DatabasePool" when searching for "connections".

**Why this priority**: The current substring-based search misses semantically related concepts, severely limiting the utility of context queries for AI agents and users exploring unfamiliar codebases.

**Independent Test**: Run `brane context "authentication"` in a codebase with concepts like "AuthService", "LoginController", "SessionManager" and verify all are returned as relevant anchors despite not containing "authentication" in their names.

**Acceptance Scenarios**:

1. **Given** concepts exist with names semantically related to a query term, **When** user queries with that term, **Then** semantically similar concepts are returned even without exact name matches
2. **Given** a query matches both exact names and semantic similarity, **When** user queries, **Then** exact matches are prioritized but semantic matches are also included
3. **Given** the embedding service fails, **When** user queries, **Then** system falls back to substring matching with a warning (graceful degradation)

---

### User Story 2 - Hybrid Search Mode (Priority: P2)

Users can choose between search modes: "semantic" (vector only), "exact" (substring only), or "hybrid" (combined). This allows fine-tuning based on use case - quick exact lookups vs exploratory semantic discovery.

**Why this priority**: Power users need control over search behavior for different workflows. Some contexts require precision (debugging specific component), others require discovery (understanding a domain).

**Independent Test**: Run `brane context "auth" --mode exact` returns only concepts with "auth" in name; `brane context "auth" --mode semantic` returns conceptually related items.

**Acceptance Scenarios**:

1. **Given** mode is "exact", **When** user queries, **Then** only substring matches are returned (current behavior)
2. **Given** mode is "semantic", **When** user queries, **Then** only vector similarity matches are returned
3. **Given** mode is "hybrid" (default), **When** user queries, **Then** both exact and semantic matches are combined with deduplication

---

### Edge Cases

- What happens when query embedding fails? System falls back to exact matching with informational message
- What happens when no concepts have embeddings (pre-021 data)? System falls back to exact matching
- What happens with empty or very short queries? Exact matching for queries under 3 characters (embeddings unreliable)
- How does system handle concepts without vectors? They are only matched via exact search, not penalized

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST use vector similarity search as the primary anchor-finding mechanism in `/context/query`
- **FR-002**: System MUST support a `mode` parameter with values "semantic", "exact", or "hybrid" (default: "hybrid")
- **FR-003**: System MUST combine exact name matches with semantic matches in hybrid mode, removing duplicates
- **FR-004**: System MUST fall back to exact matching when embedding generation fails
- **FR-005**: System MUST maintain backward compatibility - existing queries without mode parameter work as before or better
- **FR-006**: System MUST include similarity scores in results when using semantic search
- **FR-007**: System MUST short-circuit to exact-only mode for queries shorter than 3 characters

### Key Entities

- **Query**: User's search term plus optional mode parameter
- **AnchorConcept**: A concept found via search, with relevance type ("exact", "semantic", or "both") and optional similarity score
- **SearchMode**: Enumeration of "exact", "semantic", "hybrid"

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Semantic queries return relevant concepts that substring matching would miss (e.g., "login" finds "AuthService")
- **SC-002**: Query response time remains under 500ms for typical queries (10-50 concepts in graph)
- **SC-003**: Hybrid mode returns a superset of exact-only mode results (no regression)
- **SC-004**: System gracefully handles embedding failures with fallback behavior (no errors thrown to user)

## Assumptions

- Vector embeddings are already populated for concepts (via 021-vector-search feature)
- The existing `/mind/search` implementation provides the pattern for vector similarity queries
- Local embedding generation (fastembed-js) is available and working
- HNSW index `concepts:semantic` exists in mind.db schema v1.5.0+
