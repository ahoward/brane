# Feature Specification: First-Class Claim + Authority Model

**Feature Branch**: `067-claim-authority`
**Created**: 2026-08-19
**Status**: Draft
**Issue**: [#113](https://github.com/ahoward/brane/issues/113) (umbrella [#112](https://github.com/ahoward/brane/issues/112))
**Vision**: `dna/product/vision-spec-machine.md` (v4.0), principles 1–2
**Input**: User description: "elevate brane from provenance + trust tiers to a first-class **claim** carrying **authority** (tier + source), so **contradiction is representable as data**"

## Why

Today brane can say *"a concept named `RefundWindow` exists, extracted from `billing.ts`"*. It cannot say
*"product asserts the refund window is 30 days, legal asserts 14, the implementation shows 45 — all three
at once, each with its own standing and source."*

Documents force one of those to win by structure. A spec machine represents all three and keeps the
contradiction visible. That is this feature.

The two principles being implemented:

1. **Strict about authority, loose about vocabulary** — the *tier* an assertion is made under is a
   registered, ranked, closed set. *What* is asserted (predicate + assertion text) is free-form.
2. **Contradiction is data, not a defect** — competing claims coexist. Resolution is a *query-time
   projection*, never a write-time deletion.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Assert a Claim (Priority: P1)

A human, an agent, or the extraction pipeline records an assertion about a concept or edge: what is
asserted, under which authority tier, and where it came from. The claim is stored alongside — not
merged into — whatever else the graph already holds about that subject.

**Why this priority**: The write path. Nothing else in the feature exists without it, and #114
(promotion gate) and #116 (production-as-teacher) both write through it.

**Independent Test**: Create a claim against an existing concept with predicate `refund_window`,
assertion `30 days`, authority `product`, source `dna/product/prd.md`. Verify it is stored with an
auto-generated ID, timestamp, and the resolved authority rank.

**Acceptance Scenarios**:

1. **Given** an initialized mind.db and an existing concept, **When** a claim is created with subject,
   predicate, assertion, authority, and source, **Then** it is stored with a unique ID and ISO 8601
   `created_at`, and is retrievable by ID.
2. **Given** an existing edge, **When** a claim is created with `subject_type: "edge"` and that edge's
   ID, **Then** the claim is stored against the edge.
3. **Given** a claim create with an authority tier that is not registered, **When** it is submitted,
   **Then** a validation error is returned and no claim is written.
4. **Given** a claim create referencing a subject ID that does not exist, **When** it is submitted,
   **Then** a validation error is returned and no claim is written.
5. **Given** a claim create missing `assertion`, `predicate`, `authority`, or `source`, **When** it is
   submitted, **Then** a validation error naming the missing field is returned.
6. **Given** an unregistered predicate string (any free-form text), **When** a claim is created,
   **Then** it succeeds — vocabulary is not validated.

---

### User Story 2 — Hold Contradiction Without Resolving It (Priority: P1)

Product says 30 days. Legal says 14. The implementation shows 45. All three are written. Nothing is
overwritten, deduplicated, or silently reconciled. A later reader sees three claims.

**Why this priority**: This *is* the feature. A claim store that collapses conflicts is just a
key-value store with extra ceremony.

**Independent Test**: Write three claims with the same subject and predicate, different assertions and
authorities. List claims for that subject and verify all three come back with their authorities and
sources intact.

**Acceptance Scenarios**:

1. **Given** three claims on the same subject+predicate with different assertions, **When** listing
   claims for that subject, **Then** all three are returned, each with its authority tier, rank, and
   source.
2. **Given** those three claims, **When** the same claim (identical subject, predicate, assertion,
   authority, source) is asserted a second time, **Then** it is not duplicated — the existing claim is
   returned unchanged (idempotent re-assertion).
3. **Given** two claims with the same subject, predicate, and assertion but *different* authorities,
   **Then** both are retained — agreement from two authorities is two claims, not one.
4. **Given** a claim written by a low-authority source and a later claim by a high-authority source,
   **When** listing, **Then** the low-authority claim still exists and is still returned.

---

### User Story 3 — See the Conflicts (Priority: P1)

A user or agent asks: *where does this graph contradict itself?* The answer is a list of conflict
groups — each a subject+predicate with two or more distinct assertions — showing every competing claim
and which one wins by authority, with the conflict still visible.

**Why this priority**: Contradiction that cannot be queried is contradiction that is hidden. This is
the read path that makes principle 2 real.

**Independent Test**: Write the 30/14/45 refund claims, then query conflicts. Verify one conflict group
comes back containing three claims, with `legal` (highest rank) marked as the resolution and the other
two present and unmarked.

**Acceptance Scenarios**:

1. **Given** claims 30d/product, 14d/legal, 45d/implementation on one subject+predicate, **When**
   querying conflicts, **Then** one conflict group is returned containing all three claims.
2. **Given** that conflict group, **Then** the highest-rank claim is identified as the resolution and
   every competing claim remains present in the group.
3. **Given** two claims on the same subject+predicate with *identical* assertions, **When** querying
   conflicts, **Then** no conflict group is returned — same assertion is agreement, not conflict.
4. **Given** two claims with the same subject+predicate, different assertions, and *equal* authority
   rank, **When** querying conflicts, **Then** the group is returned with `resolution: null` and
   `unresolved: true` — a tie is not broken arbitrarily.
5. **Given** a graph with no competing claims, **When** querying conflicts, **Then** an empty list with
   count 0 is returned.
6. **Given** conflicts across many subjects, **When** querying with a subject filter, **Then** only
   that subject's conflict groups are returned.

---

### User Story 4 — Resolve by Authority on Demand (Priority: P2)

An agent that needs *one* answer asks for the resolved view: for each subject+predicate, the claim with
the highest authority rank. Resolution is a projection over the same immutable claims — asking for it
never mutates the store.

**Why this priority**: Consumers (context queries, generation in #115) need a single answer sometimes.
But it must be derived, not stored, or contradiction leaks away.

**Independent Test**: With the three refund claims present, request the resolved view and verify a
single 14-day/legal claim comes back; then list claims again and verify all three are still there.

**Acceptance Scenarios**:

1. **Given** competing claims, **When** listing with `resolve: true`, **Then** one claim per
   subject+predicate is returned — the highest-rank one.
2. **Given** competing claims at equal top rank, **When** listing with `resolve: true`, **Then** all
   tied claims are returned for that subject+predicate and the group is flagged unresolved.
3. **Given** a resolved list has been requested, **When** listing without `resolve`, **Then** every
   original claim is still present — resolution has no write side effect.

---

### User Story 5 — Manage the Authority Registry (Priority: P2)

Authority tiers are a small, ordered, explicit set. Brane ships defaults; a project can add its own
(`security`, `compliance`, `sre`) with a rank. Tiers cannot be referenced before they are registered.

**Why this priority**: "Strict about authority" requires a registry to be strict against. Ships with
usable defaults so the feature works out of the box.

**Independent Test**: List authorities on a fresh mind.db and verify the seeded defaults with their
ranks. Register a new tier, use it on a claim, and verify the claim carries the new tier's rank.

**Acceptance Scenarios**:

1. **Given** a freshly initialized mind.db, **When** listing authorities, **Then** the seeded default
   tiers are returned in rank order.
2. **Given** a new tier registered with a name, rank, and description, **When** a claim is created
   under it, **Then** the claim succeeds and carries that rank.
3. **Given** an attempt to register a tier whose name already exists, **When** submitted, **Then** the
   tier is updated (rank/description) rather than duplicated, and existing claims under that tier
   reflect the new rank on read.
4. **Given** an attempt to delete a tier that claims reference, **When** submitted, **Then** an error is
   returned and the tier is retained — no orphaned claims.
5. **Given** a tier registered with a non-integer or negative rank, **When** submitted, **Then** a
   validation error is returned.

---

### User Story 6 — Rules Can Reason Over Claims (Priority: P2)

Datalog rules — the validator layer brane already ships — can join against claims and authority. A
built-in `contradictions` rule surfaces every concept that carries competing claims, so `verify` and
`pr-verify` can fail a change that introduces an unresolved contradiction.

**Why this priority**: Connects the new model to the enforcement arm that already exists. Without it,
claims are inert data.

**Independent Test**: Write competing claims on a concept, run the built-in `contradictions` rule via
the existing rules-query path, and verify the concept is returned.

**Acceptance Scenarios**:

1. **Given** a concept with competing claims, **When** the built-in `contradictions` rule is queried,
   **Then** that concept is in the matches.
2. **Given** a concept whose claims all agree, **When** the rule is queried, **Then** it is not in the
   matches.
3. **Given** a user-defined rule body referencing the claims relation and authority rank, **When**
   created and queried, **Then** it executes and returns concept matches.
4. **Given** competing claims exist, **When** `verify` runs, **Then** the `contradictions` rule
   participates in the report like any other rule.

---

### User Story 7 — Delete a Claim (Priority: P3)

A claim entered in error is removable by ID.

**Why this priority**: Hygiene. Deliberately minimal — *retraction with audit* is #114's promotion/
demotion gate, not this feature.

**Independent Test**: Create a claim, delete by ID, verify get returns not found and conflicts recompute
without it.

**Acceptance Scenarios**:

1. **Given** an existing claim, **When** deleting by ID, **Then** it is removed and get returns not found.
2. **Given** a non-existent claim ID, **When** deleting, **Then** a not-found error is returned.
3. **Given** a deleted claim that was one of three in a conflict group, **When** querying conflicts,
   **Then** the group reflects the two remaining claims.
4. **Given** a concept is deleted, **When** claims referenced it, **Then** its claims are removed with it
   (same cascade behavior as annotations).

---

### Edge Cases

- **Subject does not exist** → validation error on create; never a dangling claim.
- **Unregistered authority tier** → validation error on create. Strict, by design.
- **Free-form predicate/assertion** → always accepted. Loose, by design.
- **Tie at top authority rank** → no winner. `resolution: null`, `unresolved: true`. Never break ties by
  recency, ID order, or insertion order.
- **Authority rank changed after claims exist** → resolution recomputes on next read; stored claims are
  untouched. Rank is looked up, not copied into the claim row.
- **Same claim asserted twice** → idempotent, no duplicate row.
- **Assertion text exceeding the length cap** → validation error (same cap discipline as annotations).
- **Claim against an edge whose endpoints are later deleted** → claim is removed with the edge.
- **Very large conflict group** (many authorities on one predicate) → returned whole; no silent truncation.
- **Existing databases** → migration adds the relations and seeds defaults without touching existing data.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST store claims as first-class records with: unique ID, subject type
  (`concept` | `edge`), subject ID, predicate, assertion, authority tier, source, and `created_at`.
- **FR-002**: System MUST validate that the subject exists before writing a claim.
- **FR-003**: System MUST validate that the authority tier is registered before writing a claim, and
  MUST NOT validate predicate or assertion vocabulary.
- **FR-004**: System MUST persist an authority registry of tiers, each with a unique name, an integer
  rank (higher = more authoritative), and a description.
- **FR-005**: System MUST seed the registry on init with a default ordered set of tiers covering at
  minimum: observation (lowest), implementation, product, legal, and manual/human (highest).
- **FR-006**: System MUST support registering, updating, listing, and deleting authority tiers, and MUST
  refuse deletion of a tier that any claim references.
- **FR-007**: System MUST store competing claims (same subject + predicate, different assertion) side by
  side without overwrite, merge, or precedence applied at write time.
- **FR-008**: System MUST treat re-assertion of an identical claim (same subject, predicate, assertion,
  authority, source) as idempotent — no duplicate row.
- **FR-009**: System MUST support listing claims filtered by subject, subject type, predicate, and
  authority tier.
- **FR-010**: System MUST expose a conflict query returning conflict groups; each group carries its
  subject, predicate, all competing claims with authority tier and rank, the highest-rank claim as the
  resolution, and an `unresolved` flag when the top rank is tied.
- **FR-011**: System MUST support a resolved projection (highest-rank claim per subject+predicate) that
  performs no writes and does not remove or hide the losing claims from unresolved queries.
- **FR-012**: System MUST resolve authority rank at read time from the registry, so rank changes take
  effect without rewriting claims.
- **FR-013**: System MUST expose claims and authority rank to Datalog rules, and MUST ship a built-in
  `contradictions` rule matching concepts that carry competing claims.
- **FR-014**: System MUST support getting a claim by ID and deleting a claim by ID.
- **FR-015**: System MUST cascade claim deletion when the referenced concept or edge is deleted.
- **FR-016**: System MUST upgrade existing mind.db databases via the migration system with no data loss,
  seeding default authority tiers during migration.
- **FR-017**: All new operations MUST follow the sys.call Result envelope, POD-only, snake_case
  conventions in the constitution.
- **FR-018**: System MUST return an empty list with count 0 — not an error — for claim and conflict
  queries with no matches.

### Key Entities

- **Claim**: An assertion about a subject, made under an authority, from a source. Fields: `id`,
  `subject_type` (`concept` | `edge`), `subject_id`, `predicate` (free-form, e.g. `refund_window`),
  `assertion` (free-form, e.g. `30 days`), `authority` (registered tier name), `source` (provenance
  string: file URL, session, agent id, or human identifier), `created_at`.
- **Authority Tier**: A registered standing under which claims are made. Fields: `name` (unique),
  `rank` (integer, higher wins), `description`. Strict/closed set; project-extensible.
- **Conflict Group**: A derived (not stored) view: one subject+predicate with two or more distinct
  assertions, carrying every competing claim, the highest-rank resolution, and an `unresolved` flag.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The refund scenario round-trips end to end: three claims written (product=30d, legal=14d,
  implementation=45d), all three retrievable, one conflict group reported, `legal` identified as the
  resolution, and all three claims still present after resolution is requested.
- **SC-002**: Zero writes occur during any read path — claims, conflicts, and resolved views are
  byte-identical before and after any number of resolution queries.
- **SC-003**: An unregistered authority tier is rejected 100% of the time; a novel predicate string is
  accepted 100% of the time.
- **SC-004**: The built-in `contradictions` rule returns exactly the concepts carrying competing claims
  — no false positives on concepts whose claims agree.
- **SC-005**: All existing tests continue to pass — no regressions in concepts, edges, provenance,
  annotations, episodes, rules, verify, or lenses.
- **SC-006**: Migration from the current schema version preserves every existing concept, edge,
  provenance record, annotation, rule, and episode, and seeds the default authority tiers.
- **SC-007**: Claim, conflict, and resolved queries complete in under 1 second on a database holding
  10,000 claims.

## Out of Scope

Explicitly deferred so this feature stays foundational (constitution principle VI):

- **Binding / constraining claims and the promotion gate** — #114. Claims here are recorded, not
  enforced as requirements. No `binding` flag in this feature.
- **Retraction with audit trail and demotion** — #114.
- **Regeneration from claims** — #115.
- **Ingesting production signals as claims** — #116.
- **Automatic conflict resolution policies** beyond highest-rank (recency weighting, quorum, decay).
- **Semantic conflict detection** — conflict is exact-assertion mismatch on the same predicate, not
  embedding similarity. "30 days" vs "one month" is two claims, not a detected conflict. Noted as a
  known limitation for a later feature.
- **Claim-to-claim edges** (supports/contradicts links between claims). Subject is a concept or edge only.

## Assumptions

- Predicate and assertion are free-form strings. Normalization (casing, units, synonyms) is a later
  concern; the loose-vocabulary principle says do not enforce one now.
- `source` is an opaque provenance string, consistent with how the existing provenance relation stores
  `file_url`. It is not validated against body.db.
- Authority rank is a plain integer with room between defaults (e.g. steps of 10) so projects can insert
  tiers between shipped ones without renumbering.
- Annotations keep their existing `infinity` authority and are not migrated into claims by this feature;
  a future feature may unify them.
- Conflict detection compares assertions exactly (after trim). Case sensitivity is a clarification item
  for the plan phase.
- Claims are immutable once written — correcting one means delete + re-assert. Updating in place would
  erase the contradiction record this feature exists to keep.
