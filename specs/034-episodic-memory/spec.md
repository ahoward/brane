# Feature Specification: Episodic Memory

**Feature Branch**: `034-episodic-memory`
**Created**: 2026-03-26
**Status**: Draft
**Input**: User description: "Episodic memory for AI agents — timestamped episodes relation in mind.db with CRUD handlers and semantic search"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Record an Episode (Priority: P1)

An AI agent (e.g., Claude Code via MCP) encounters something noteworthy during a task — a decision it made, a fact it learned, a preference it discovered, or an event that occurred. The agent records this as an episode in brane's knowledge graph, including what it observed and the context in which it happened. The episode is automatically embedded for future semantic retrieval.

**Why this priority**: Without the ability to create episodes, no other episodic memory features work. This is the write path — the foundation.

**Independent Test**: Create an episode with observation text, agent ID, and context. Verify it's stored with an auto-generated ID, timestamp, and embedding.

**Acceptance Scenarios**:

1. **Given** an initialized mind.db, **When** an agent creates an episode with observation "User prefers snake_case naming" and context "code review", **Then** the episode is stored with a unique ID, the current timestamp, and an auto-generated embedding.
2. **Given** an initialized mind.db, **When** an agent creates an episode with tags ["preference", "style"], **Then** the tags are stored and retrievable.
3. **Given** an initialized mind.db, **When** an agent creates an episode linked to an existing concept (source_concept_id), **Then** the link is stored and retrievable.
4. **Given** an initialized mind.db, **When** an agent creates an episode without a required observation field, **Then** the system returns a validation error.

---

### User Story 2 — Retrieve Episodes (Priority: P1)

An agent or user lists and filters episodes to review what has been recorded. They can filter by agent ID, tags, and time range to narrow down relevant memories.

**Why this priority**: Equally critical to creation — agents need to read back their memories to learn from experience. Useless to record without retrieval.

**Independent Test**: Create several episodes with different agents, tags, and timestamps. List with various filters and verify correct results.

**Acceptance Scenarios**:

1. **Given** episodes from multiple agents, **When** listing with an agent_id filter, **Then** only episodes from that agent are returned.
2. **Given** episodes with various tags, **When** listing with a tag filter, **Then** only episodes containing that tag are returned.
3. **Given** episodes spanning multiple days, **When** listing with a time range (after/before), **Then** only episodes within that range are returned.
4. **Given** an episode ID, **When** getting that specific episode, **Then** all fields including tags and linked concept are returned.
5. **Given** no episodes exist, **When** listing episodes, **Then** an empty list is returned with total count 0.

---

### User Story 3 — Search Episodes by Meaning (Priority: P2)

An agent searches for relevant past experiences using natural language. For example, "authentication issues" should surface episodes about login failures, token expiry, and auth middleware — even if those exact words weren't used in the observation text.

**Why this priority**: Semantic search transforms episodes from a log into a learning system. Agents can find relevant experience without knowing exact keywords.

**Independent Test**: Create episodes about different topics. Search with a query that's semantically related but uses different words. Verify relevant episodes are ranked higher.

**Acceptance Scenarios**:

1. **Given** episodes about various topics, **When** searching with a semantic query, **Then** results are ranked by relevance with similarity scores.
2. **Given** a search query, **When** a limit is specified, **Then** at most that many results are returned.
3. **Given** a search query with an agent_id filter, **When** searching, **Then** only episodes from that agent are considered.
4. **Given** no episodes match the query, **When** searching, **Then** an empty results list is returned.

---

### User Story 4 — Delete Episodes (Priority: P3)

An agent or user removes episodes that are no longer relevant, incorrect, or sensitive. Deletion is by episode ID.

**Why this priority**: Necessary for data hygiene but lower priority than creation and retrieval. Most agents will create far more than they delete.

**Independent Test**: Create an episode, delete it by ID, verify it's gone and get-by-ID returns not found.

**Acceptance Scenarios**:

1. **Given** an existing episode, **When** deleting by ID, **Then** the episode is removed and subsequent get returns not found.
2. **Given** a non-existent episode ID, **When** deleting, **Then** a not-found error is returned.
3. **Given** a missing ID parameter, **When** deleting, **Then** a validation error is returned.

---

### Edge Cases

- What happens when creating an episode with an invalid source_concept_id (concept doesn't exist)? Return a validation error; do not create the episode.
- What happens when the embedding service fails during episode creation? Create the episode with a null vector (graceful degradation, same as concepts).
- What happens when filtering by multiple criteria simultaneously (agent_id + tags + time range)? All filters are AND-combined.
- What happens when an episode has an empty tags list vs. no tags at all? Both are valid; empty list and null/missing are equivalent (no tags).
- What happens when the time range filter has invalid date formats? Return a validation error.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow creating episodes with required fields: observation (text) and agent_id (string).
- **FR-002**: System MUST auto-generate a unique sequential ID and ISO 8601 timestamp for each episode.
- **FR-003**: System MUST automatically generate an embedding vector from the observation text on create.
- **FR-004**: System MUST support optional fields on create: context, outcome, tags (list of strings), source_concept_id (link to existing concept).
- **FR-005**: System MUST validate that source_concept_id references an existing concept, if provided.
- **FR-006**: System MUST support listing episodes with filters: agent_id, tag (single tag match), after (ISO timestamp), before (ISO timestamp).
- **FR-007**: System MUST support getting a single episode by ID, returning all fields.
- **FR-008**: System MUST support deleting an episode by ID.
- **FR-009**: System MUST support semantic search over episodes using a text query, returning results ranked by similarity score.
- **FR-010**: System MUST support limiting search and list results with a configurable limit parameter.
- **FR-011**: System MUST upgrade existing mind.db databases to the new schema version via the migration system (no data loss).
- **FR-012**: System MUST gracefully handle embedding failures by storing episodes with a null vector (episodes are still retrievable by ID, list, and filters — just not by semantic search).

### Key Entities

- **Episode**: A timestamped record of an agent's experience. Has: ID, agent_id, timestamp, observation, context, outcome, tags, embedding vector, optional link to a concept.
- **Agent ID**: A free-form string label identifying which agent created the episode. No registry — just a convention (e.g., "claude-code", "gemini-review").

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Agents can create, retrieve, list, search, and delete episodes through a consistent interface, with all operations completing in under 1 second for databases with up to 10,000 episodes.
- **SC-002**: Semantic search returns relevant episodes in the top 5 results when the query is semantically related to the observation text.
- **SC-003**: All existing tests (334+) continue to pass after the episodes feature is added — no regressions.
- **SC-004**: Episodes with all filter combinations (agent_id, tag, time range) return correct results with zero false positives.
- **SC-005**: The schema migration from v1.7.0 to v1.8.0 preserves all existing concepts, edges, provenance, annotations, and rules.

## Assumptions

- Agent IDs are free-form strings with no validation beyond non-empty. No agent registry or authentication.
- Timestamps are always UTC ISO 8601 strings, generated server-side on create (not user-supplied).
- Tags are simple strings with no hierarchy or validation beyond non-empty.
- Episodes are not versioned — updates are not supported (create new, delete old).
- The embedding model and dimension are the same as used for concepts (model2vec, 256 dims).
- Semantic search uses the same HNSW cosine similarity approach as concept search.
