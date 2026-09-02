# brane graph dump: the claims + authority feature

Produced by querying mind.db. This is the entire specification available to you.

## Concepts

- **1. ClaimsRelation** (Entity)
- **2. AuthoritiesRelation** (Entity)
- **3. ClaimsCreate** (Entity)
- **4. ClaimsGet** (Entity)
- **5. ClaimsList** (Entity)
- **6. ClaimsConflicts** (Entity)
- **7. ClaimsDelete** (Entity)
- **8. AuthoritiesCreate** (Entity)
- **9. AuthoritiesList** (Entity)
- **10. AuthoritiesDelete** (Entity)
- **11. ConflictGroup** (Entity)
- **12. ContradictionsRule** (Rule)
- **13. ClaimCascade** (Entity)
- **14. SchemaMigration** (Entity)
- **15. AuthorityTier** (Entity)
- **16. CozoStringEscaping** (Caveat)
- **17. RulesCreateHandler** (Entity)

## Edges

- ClaimsCreate —DEPENDS_ON→ ClaimsRelation
- ClaimsCreate —DEPENDS_ON→ AuthoritiesRelation
- ClaimsList —DEPENDS_ON→ ClaimsRelation
- ClaimsConflicts —DEPENDS_ON→ ConflictGroup
- ClaimsConflicts —DEPENDS_ON→ ClaimsRelation
- ContradictionsRule —DEPENDS_ON→ ClaimsRelation
- ClaimCascade —DEPENDS_ON→ ClaimsRelation
- SchemaMigration —DEPENDS_ON→ ClaimsRelation
- SchemaMigration —DEPENDS_ON→ AuthoritiesRelation
- AuthoritiesCreate —DEPENDS_ON→ AuthoritiesRelation
- AuthorityTier —DEPENDS_ON→ AuthoritiesRelation
- CozoStringEscaping —DEPENDS_ON→ ClaimsRelation
- ContradictionsRule —DEPENDS_ON→ CozoStringEscaping
- ClaimsCreate —DEPENDS_ON→ CozoStringEscaping
- RulesCreateHandler —DEPENDS_ON→ CozoStringEscaping

## Claims


### ClaimsRelation (concept 1)

- `cozo_relation` — the CozoDB relation is declared as :create claims { id: Int, subject_type: String, subject_id: Int, predicate: String, assertion: String, authority: String, source: String, created_at: String }
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/data-model.md`
- `created_at_format` — created_at is an ISO 8601 timestamp generated server-side
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/data-model.md`
- `field_caps` — predicate max 256 chars, assertion max 4096, source max 1024, all measured after trim, all non-empty after trim
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/research.md D10`
- `id_allocation` — id is a sequential handle allocated the same way annotations and episodes allocate theirs
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/data-model.md`
- `idempotency` — no two rows share the tuple (subject_type, subject_id, predicate, assertion, authority, source); enforced by a pre-insert lookup comparing stored trimmed values
  - authority: **product** (rank 30) · source: `specs/067-claim-authority/spec.md FR-008`
- `immutability` — claims are immutable once written; there is no update path, correction is delete then re-assert
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/spec.md Assumptions`
- `key_semantics` — the declaration has no => so all 8 columns form the composite key; id uniqueness is enforced by the allocator, not the schema
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/data-model.md`
- `normalization` — predicate, assertion, authority and source are trimmed at write time and stored trimmed, so every downstream comparison is exact equality
  - authority: **product** (rank 30) · source: `specs/067-claim-authority/spec.md FR-016b`
- `storage` — claims are first-class records with fields: id (Int), subject_type (String), subject_id (Int), predicate (String), assertion (String), authority (String), source (String), created_at (String)
  - authority: **product** (rank 30) · source: `specs/067-claim-authority/spec.md FR-001`

### AuthoritiesRelation (concept 2)

- `cozo_relation` — the CozoDB relation is declared as :create authorities { name: String => rank: Int, description: String }
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/data-model.md`
- `name_cap` — tier name max 64 chars, non-empty after trim
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/research.md D10`
- `rank_ties_allowed` — ranks need not be unique; two tiers may tie, which is what produces unresolved conflict groups
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/data-model.md`
- `rank_validation` — rank must be a non-negative integer; non-integer or negative is a validation error
  - authority: **product** (rank 30) · source: `specs/067-claim-authority/spec.md FR-004`
- `seed_descriptions` — seeded descriptions are: observation='Recorded from experience; non-binding by default', implementation='What the code actually does', product='Product intent', legal='Legal or regulatory constraint', manual='Direct human assertion; highest standing'
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/data-model.md`
- `seeded_defaults` — init seeds five tiers: observation rank 10, implementation rank 20, product rank 30, legal rank 40, manual rank 100
  - authority: **product** (rank 30) · source: `specs/067-claim-authority/spec.md FR-005`
- `storage` — the authority registry stores tiers, each with a unique name, an integer rank (higher = more authoritative), and a description
  - authority: **product** (rank 30) · source: `specs/067-claim-authority/spec.md FR-004`

### ClaimsCreate (concept 3)

- `envelope` — all operations follow the sys.call Result envelope, POD only, snake_case field names
  - authority: **product** (rank 30) · source: `specs/067-claim-authority/spec.md FR-017`
- `error_authority` — an unregistered tier returns code not_found on authority with message 'authority tier not registered: <name>'
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/contracts/claims.md`
- `error_blank` — a field that is empty after trim returns code invalid on that field with message '<field> must not be empty'
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/spec.md FR-016b`
- `error_missing` — a missing required field returns code required with message '<field> is required' on that field
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/contracts/claims.md`
- `error_subject_missing` — a subject that does not exist returns code not_found on subject_id with message '<subject_type> not found: <id>'
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/contracts/claims.md`
- `error_subject_type` — an invalid subject_type returns code invalid on subject_type with message 'subject_type must be one of: concept, edge'
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/contracts/claims.md`
- `error_too_long` — a field over its cap returns code invalid on that field with message '<field> exceeds <N> characters'
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/contracts/claims.md`
- `idempotent_result` — created is false when an identical claim already existed; the existing row is returned unchanged including its original id and created_at
  - authority: **product** (rank 30) · source: `specs/067-claim-authority/spec.md 2.2`
- `params` — params are subject_type, subject_id, predicate, assertion, authority, source - all required
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/contracts/claims.md`
- `path` — the handler is registered at sys.call path /mind/claims/create
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/contracts/claims.md`
- `result` — result is the claim fields plus rank plus a boolean created flag
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/contracts/claims.md`
- `source_is_identity` — source is part of the identity tuple: the same assertion from two different sources is two claims, which is corroboration
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/research.md D4`
- `subject_dispatch` — subject_type is concept or edge; validation must check the matching relation, not always concepts
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/contracts/claims.md`
- `subject_validation` — the subject must exist before a claim is written
  - authority: **product** (rank 30) · source: `specs/067-claim-authority/spec.md FR-002`

### ClaimsGet (concept 4)

- `error_not_found` — an unknown id returns code not_found on id with message 'claim not found: <id>'
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/contracts/claims.md`
- `params` — params is id, required
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/contracts/claims.md`
- `path` — the handler is registered at sys.call path /mind/claims/get
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/contracts/claims.md`
- `result` — result is a single claim object with joined rank, same shape as create minus the created flag
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/contracts/claims.md`

### ClaimsList (concept 5)

- `empty_is_success` — no matches returns an empty list with count 0 and status success, not an error
  - authority: **product** (rank 30) · source: `specs/067-claim-authority/spec.md FR-018`
- `no_overwrite` — competing claims are stored side by side; nothing is overwritten, merged, or given precedence at write time
  - authority: **product** (rank 30) · source: `specs/067-claim-authority/spec.md FR-007`
- `ordering` — claims are ordered by rank descending, then id ascending
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/contracts/claims.md`
- `params` — params are all optional and AND-combined: subject_type, subject_id, predicate, authority, resolve (bool, default false), limit (int, default 100)
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/contracts/claims.md`
- `path` — the handler is registered at sys.call path /mind/claims/list
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/contracts/claims.md`
- `resolve_no_writes` — requesting a resolved view performs no writes and does not remove or hide the losing claims from unresolved queries
  - authority: **product** (rank 30) · source: `specs/067-claim-authority/spec.md SC-002`
- `resolve_projection` — with resolve true, one claim per (subject_type, subject_id, predicate) group is returned - the highest-rank one - and resolution is per group, not a global maximum
  - authority: **product** (rank 30) · source: `specs/067-claim-authority/spec.md FR-011`
- `resolve_tie` — with resolve true, a tie at the top rank between different assertions returns all tied claims for that group
  - authority: **product** (rank 30) · source: `specs/067-claim-authority/spec.md 4.2`
- `result` — result is { claims: [...], count: N, resolved: bool }
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/contracts/claims.md`
- `subject_id_alone` — subject_id given without subject_type matches claims on either subject type
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/contracts/claims.md`

### ClaimsConflicts (concept 6)

- `empty_is_success` — no conflicts returns an empty list with count 0 and status success
  - authority: **product** (rank 30) · source: `specs/067-claim-authority/spec.md FR-018`
- `no_truncation` — conflict groups are returned whole; there is no silent truncation
  - authority: **product** (rank 30) · source: `specs/067-claim-authority/spec.md edge cases`
- `params` — params are all optional filters: subject_type, subject_id, predicate
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/contracts/claims.md`
- `path` — the handler is registered at sys.call path /mind/claims/conflicts
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/contracts/claims.md`
- `result` — result is { conflicts: [group...], count: N }
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/contracts/claims.md`

### ClaimsDelete (concept 7)

- `error_not_found` — an unknown id returns code not_found on id with message 'claim not found: <id>'
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/contracts/claims.md`
- `params` — params is id, required
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/contracts/claims.md`
- `path` — the handler is registered at sys.call path /mind/claims/delete
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/contracts/claims.md`
- `removal_mechanics` — claims is an all-key relation, so removal needs the full 8-column row: read the row by id, then remove it
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/contracts/claims.md`
- `result` — result is { id: <id>, deleted: true }
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/contracts/claims.md`

### AuthoritiesCreate (concept 8)

- `description_preserved` — an omitted description on an update preserves the existing description rather than blanking it
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/contracts/authorities.md`
- `error_name_cap` — a name over 64 chars returns code invalid on name with message 'name exceeds 64 characters'
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/contracts/authorities.md`
- `error_rank` — a non-integer or negative rank returns code invalid on rank with message 'rank must be a non-negative integer'
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/contracts/authorities.md`
- `error_required` — a missing name or rank returns code required on that field with message '<field> is required'
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/contracts/authorities.md`
- `no_rewrite` — updating a rank does not rewrite claims; they pick up the new rank on the next read
  - authority: **product** (rank 30) · source: `specs/067-claim-authority/spec.md FR-012`
- `params` — params are name (required), rank (required), description (optional)
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/contracts/authorities.md`
- `path` — the handler is registered at sys.call path /mind/authorities/create
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/contracts/authorities.md`
- `result` — result is { name, rank, description, created }
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/contracts/authorities.md`
- `upsert` — re-registering an existing name updates it rather than duplicating; created is false in that case
  - authority: **product** (rank 30) · source: `specs/067-claim-authority/spec.md FR-006`

### AuthoritiesList (concept 9)

- `ordering` — ordered by rank descending, then name ascending
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/contracts/authorities.md`
- `params` — takes no params
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/contracts/authorities.md`
- `path` — the handler is registered at sys.call path /mind/authorities/list
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/contracts/authorities.md`
- `result` — result is { authorities: [{name, rank, description}...], count: N }
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/contracts/authorities.md`

### AuthoritiesDelete (concept 10)

- `error_not_found` — an unknown tier returns code not_found on name with message 'authority tier not found: <name>'
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/contracts/authorities.md`
- `error_referenced` — deleting a tier that any claim references returns code conflict on name with message 'authority tier is referenced by <N> claim: <name>' (singular for one) and deletes nothing
  - authority: **product** (rank 30) · source: `specs/067-claim-authority/spec.md FR-006`
- `params` — params is name, required
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/contracts/authorities.md`
- `path` — the handler is registered at sys.call path /mind/authorities/delete
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/contracts/authorities.md`
- `result` — result is { name, deleted: true }
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/contracts/authorities.md`

### ConflictGroup (concept 11)

- `agreement` — the same assertion from two authorities is agreement, not a conflict, and produces no group
  - authority: **product** (rank 30) · source: `specs/067-claim-authority/spec.md 3.3`
- `claim_ordering` — claims within a group are ordered by rank descending, then id ascending
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/data-model.md`
- `definition` — a group is a conflict when one (subject_type, subject_id, predicate) holds two or more distinct assertions
  - authority: **product** (rank 30) · source: `specs/067-claim-authority/spec.md FR-010`
- `derived` — a conflict group is derived per request, never stored
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/data-model.md`
- `edge_subjects` — edge subjects produce conflict groups here even though the built-in contradictions rule is concept-only
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/contracts/claims.md`
- `group_ordering` — groups are ordered by subject_type ascending, then subject_id ascending, then predicate ascending
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/contracts/claims.md`
- `resolution` — resolution is the single highest-rank claim, carrying id, assertion, authority and rank
  - authority: **product** (rank 30) · source: `specs/067-claim-authority/spec.md FR-010`
- `shape` — a group carries subject_type, subject_id, predicate, claims (each with id, assertion, authority, rank, source, created_at), resolution, and unresolved
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/data-model.md`
- `tie_unresolved` — if two or more claims tie at the top rank with different assertions, resolution is null and unresolved is true; ties are never broken by recency, id, or insertion order
  - authority: **product** (rank 30) · source: `specs/067-claim-authority/spec.md 3.4`

### ContradictionsRule (concept 12)

- `body` — the rule body is: contradictions[id, name] := *concepts[id, name, _, _, _], *claims[c1, 'concept', id, pred, a1, _, _, _], *claims[c2, 'concept', id, pred, a2, _, _, _], c1 < c2, a1 != a2
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/data-model.md`
- `builtin` — a built-in Datalog rule named contradictions ships alongside cycles and orphans
  - authority: **product** (rank 30) · source: `specs/067-claim-authority/spec.md FR-013`
- `contract` — it returns [id, name] concept pairs, the fixed contract consumed by /mind/rules/query, /mind/verify and pr-verify
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/data-model.md`
- `description` — its registered description is 'Detects concepts carrying competing claims (contradiction)'
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/data-model.md`
- `fires_when_resolved` — the rule flags every contradiction including ones that resolve cleanly by rank; it reports that the graph disagrees with itself, not whether the disagreement has a winner
  - authority: **product** (rank 30) · source: `specs/067-claim-authority/spec.md US6`
- `protected` — it is a built-in and must be protected from deletion and overwrite like cycles and orphans
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/spec.md FR-013`
- `scope` — the rule covers concept subjects only; an edge id would be indistinguishable from a concept id in the [id, name] contract
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/research.md D7`

### ClaimCascade (concept 13)

- `concept_delete` — deleting a concept removes claims on the concept AND claims on every edge that the deletion cascades away
  - authority: **product** (rank 30) · source: `specs/067-claim-authority/spec.md FR-015`
- `concept_delete_report` — concept delete reports the count as cascade.claims_removed
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/contracts/claims.md`
- `edge_delete` — deleting an edge removes claims with subject_type edge and matching subject_id, reported as claims_removed
  - authority: **product** (rank 30) · source: `specs/067-claim-authority/spec.md FR-015`
- `extract` — re-extraction removes claims for replaced concepts and edges
  - authority: **product** (rank 30) · source: `specs/067-claim-authority/spec.md FR-015`
- `prune` — prune removes claims for every concept and edge it prunes; it deletes directly, bypassing the delete handlers
  - authority: **product** (rank 30) · source: `specs/067-claim-authority/spec.md FR-015`
- `single_seam` — all concept and edge removal flows through one cascade function so no path can forget
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/data-model.md`

### SchemaMigration (concept 14)

- `additive` — the migration creates both relations, seeds the five tiers, and inserts the contradictions rule; no existing relation is touched
  - authority: **product** (rank 30) · source: `specs/067-claim-authority/spec.md FR-016`
- `no_data_loss` — the migration preserves every existing concept, edge, provenance record, annotation, rule and episode
  - authority: **product** (rank 30) · source: `specs/067-claim-authority/spec.md SC-006`
- `parity` — a freshly initialized 1.13.0 database and a migrated 1.12.0 database must be indistinguishable: same relations, same seeded tiers, same built-in rules
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/data-model.md`
- `version` — the schema version moves from 1.12.0 to 1.13.0
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/data-model.md`

### AuthorityTier (concept 15)

- `missing_tier` — a claim whose tier is absent from the registry reads with rank null, sorts last, and never wins a resolution
  - authority: **manual** (rank 100) · source: `specs/067-claim-authority/data-model.md`
- `rank_read_time` — rank is looked up from the registry at read time and never copied onto a claim, so re-ranking a tier changes resolution without rewriting any claim
  - authority: **product** (rank 30) · source: `specs/067-claim-authority/spec.md FR-012`
- `strictness` — the authority tier on a claim must already be registered; unregistered tiers are rejected
  - authority: **product** (rank 30) · source: `specs/067-claim-authority/spec.md FR-003`
- `vocabulary` — predicate and assertion are never validated against any vocabulary - strict about authority, loose about vocabulary
  - authority: **product** (rank 30) · source: `specs/067-claim-authority/spec.md FR-003`

### CozoStringEscaping (concept 16)

- `alternative` — Bound query parameters - db.run(script, params) with $name placeholders - sidestep escaping entirely and round-trip quotes, backslashes and newlines correctly.
  - authority: **observation** (rank 10) · source: `incident: brane #113, rules/create parse failure`
- `blast_radius` — Every code path that interpolates a user-supplied string into a Cozo query must use one of the two correct approaches. SQL-style doubling silently rejects any value containing an apostrophe.
  - authority: **observation** (rank 10) · source: `incident: brane #113, rules/create parse failure`
- `detection` — The failure surfaces as: The query parser has encountered unexpected input / end of input at N..N
  - authority: **observation** (rank 10) · source: `incident: brane #113, rules/create parse failure`
- `rule` — CozoDB string literals use backslash escapes, not SQL-style doubling. 'it''s' is a parse error; 'it\'s' is correct.
  - authority: **observation** (rank 10) · source: `incident: brane #113, rules/create parse failure`
- `why_unnoticed` — The bug predates claims and was unreachable until claims existed, because no rule body had ever contained a quote character.
  - authority: **observation** (rank 10) · source: `incident: brane #113, rules/create parse failure`

### RulesCreateHandler (concept 17)

- `defect` — It interpolates rule name, description and body into single-quoted Cozo literals using SQL-style doubling (.replace(/'/g, "''")), which CozoDB rejects.
  - authority: **observation** (rank 10) · source: `incident: brane #113, rules/create parse failure`
- `file` — The handler lives at src/handlers/mind/rules/create.ts
  - authority: **observation** (rank 10) · source: `incident: brane #113, rules/create parse failure`
- `obligation` — Shipping the claims feature REQUIRES correcting this handler. A user-defined rule that joins *claims must contain the literal 'concept', so claims makes the latent bug reachable. Regenerating claims without fixing rules/create leaves a failing system.
  - authority: **observation** (rank 10) · source: `incident: brane #113, rules/create parse failure`
- `verification` — A rule whose body contains a single-quoted literal must be creatable and queryable end to end.
  - authority: **observation** (rank 10) · source: `incident: brane #113, rules/create parse failure`

## Authority registry

- **manual** rank 100 — Direct human assertion; highest standing
- **legal** rank 40 — Legal or regulatory constraint
- **product** rank 30 — Product intent
- **implementation** rank 20 — What the code actually does
- **observation** rank 10 — Recorded from experience; non-binding by default
