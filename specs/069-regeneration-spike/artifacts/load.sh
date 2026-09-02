#!/usr/bin/env bash
#
# load.sh - build the claims-feature graph in a scratch brane workspace.
#
# DISCIPLINE: every claim below is derived from specs/067-claim-authority/*.md
# only. Nothing from the implementation. Putting implementation knowledge in
# here would rig the experiment - the whole point is to find out what the
# implementation knew that the spec did not.
#
set -e

BRANE=${BRANE:-/home/drawohara/gh/ahoward/brane/bin/brane}

concept() { echo "{\"name\": \"$1\", \"type\": \"$2\"}" | $BRANE /mind/concepts/create > /dev/null; }
edge()    { echo "{\"source\": $1, \"target\": $2, \"relation\": \"$3\"}" | $BRANE /mind/edges/create > /dev/null; }

# claim <concept_id> <predicate> <assertion> <authority> <source>
claim() {
  python3 - "$@" <<'PY' | $BRANE /mind/claims/create > /dev/null
import json, sys
print(json.dumps({
  "subject_type": "concept", "subject_id": int(sys.argv[1]),
  "predicate": sys.argv[2], "assertion": sys.argv[3],
  "authority": sys.argv[4], "source": sys.argv[5]
}))
PY
}

echo '{}' | $BRANE /body/init > /dev/null
echo '{}' | $BRANE /mind/init > /dev/null

# ---------------------------------------------------------------- concepts

concept ClaimsRelation Entity        #  1
concept AuthoritiesRelation Entity   #  2
concept ClaimsCreate Entity          #  3
concept ClaimsGet Entity             #  4
concept ClaimsList Entity            #  5
concept ClaimsConflicts Entity       #  6
concept ClaimsDelete Entity          #  7
concept AuthoritiesCreate Entity     #  8
concept AuthoritiesList Entity       #  9
concept AuthoritiesDelete Entity     # 10
concept ConflictGroup Entity         # 11
concept ContradictionsRule Rule      # 12
concept ClaimCascade Entity          # 13
concept SchemaMigration Entity       # 14
concept AuthorityTier Entity         # 15

edge 3 1 DEPENDS_ON
edge 3 2 DEPENDS_ON
edge 5 1 DEPENDS_ON
edge 6 11 DEPENDS_ON
edge 6 1 DEPENDS_ON
edge 12 1 DEPENDS_ON
edge 13 1 DEPENDS_ON
edge 14 1 DEPENDS_ON
edge 14 2 DEPENDS_ON
edge 8 2 DEPENDS_ON
edge 15 2 DEPENDS_ON

SPEC="specs/067-claim-authority/spec.md"
DM="specs/067-claim-authority/data-model.md"
CC="specs/067-claim-authority/contracts/claims.md"
CA="specs/067-claim-authority/contracts/authorities.md"
RS="specs/067-claim-authority/research.md"

# ------------------------------------------------- the claims relation (1)

claim 1 storage "claims are first-class records with fields: id (Int), subject_type (String), subject_id (Int), predicate (String), assertion (String), authority (String), source (String), created_at (String)" product "$SPEC FR-001"
claim 1 cozo_relation "the CozoDB relation is declared as :create claims { id: Int, subject_type: String, subject_id: Int, predicate: String, assertion: String, authority: String, source: String, created_at: String }" manual "$DM"
claim 1 key_semantics "the declaration has no => so all 8 columns form the composite key; id uniqueness is enforced by the allocator, not the schema" manual "$DM"
claim 1 id_allocation "id is a sequential handle allocated the same way annotations and episodes allocate theirs" manual "$DM"
claim 1 immutability "claims are immutable once written; there is no update path, correction is delete then re-assert" manual "$SPEC Assumptions"
claim 1 idempotency "no two rows share the tuple (subject_type, subject_id, predicate, assertion, authority, source); enforced by a pre-insert lookup comparing stored trimmed values" product "$SPEC FR-008"
claim 1 normalization "predicate, assertion, authority and source are trimmed at write time and stored trimmed, so every downstream comparison is exact equality" product "$SPEC FR-016b"
claim 1 field_caps "predicate max 256 chars, assertion max 4096, source max 1024, all measured after trim, all non-empty after trim" manual "$RS D10"
claim 1 created_at_format "created_at is an ISO 8601 timestamp generated server-side" manual "$DM"

# ------------------------------------------- the authorities relation (2)

claim 2 storage "the authority registry stores tiers, each with a unique name, an integer rank (higher = more authoritative), and a description" product "$SPEC FR-004"
claim 2 cozo_relation "the CozoDB relation is declared as :create authorities { name: String => rank: Int, description: String }" manual "$DM"
claim 2 seeded_defaults "init seeds five tiers: observation rank 10, implementation rank 20, product rank 30, legal rank 40, manual rank 100" product "$SPEC FR-005"
claim 2 seed_descriptions "seeded descriptions are: observation='Recorded from experience; non-binding by default', implementation='What the code actually does', product='Product intent', legal='Legal or regulatory constraint', manual='Direct human assertion; highest standing'" manual "$DM"
claim 2 rank_validation "rank must be a non-negative integer; non-integer or negative is a validation error" product "$SPEC FR-004"
claim 2 rank_ties_allowed "ranks need not be unique; two tiers may tie, which is what produces unresolved conflict groups" manual "$DM"
claim 2 name_cap "tier name max 64 chars, non-empty after trim" manual "$RS D10"

# ------------------------------------------------------ authority tier (15)

claim 15 rank_read_time "rank is looked up from the registry at read time and never copied onto a claim, so re-ranking a tier changes resolution without rewriting any claim" product "$SPEC FR-012"
claim 15 strictness "the authority tier on a claim must already be registered; unregistered tiers are rejected" product "$SPEC FR-003"
claim 15 vocabulary "predicate and assertion are never validated against any vocabulary - strict about authority, loose about vocabulary" product "$SPEC FR-003"
claim 15 missing_tier "a claim whose tier is absent from the registry reads with rank null, sorts last, and never wins a resolution" manual "$DM"

# ----------------------------------------------------- /mind/claims/create (3)

claim 3 path "the handler is registered at sys.call path /mind/claims/create" manual "$CC"
claim 3 params "params are subject_type, subject_id, predicate, assertion, authority, source - all required" manual "$CC"
claim 3 result "result is the claim fields plus rank plus a boolean created flag" manual "$CC"
claim 3 idempotent_result "created is false when an identical claim already existed; the existing row is returned unchanged including its original id and created_at" product "$SPEC 2.2"
claim 3 subject_validation "the subject must exist before a claim is written" product "$SPEC FR-002"
claim 3 subject_dispatch "subject_type is concept or edge; validation must check the matching relation, not always concepts" manual "$CC"
claim 3 error_missing "a missing required field returns code required with message '<field> is required' on that field" manual "$CC"
claim 3 error_subject_type "an invalid subject_type returns code invalid on subject_type with message 'subject_type must be one of: concept, edge'" manual "$CC"
claim 3 error_subject_missing "a subject that does not exist returns code not_found on subject_id with message '<subject_type> not found: <id>'" manual "$CC"
claim 3 error_authority "an unregistered tier returns code not_found on authority with message 'authority tier not registered: <name>'" manual "$CC"
claim 3 error_too_long "a field over its cap returns code invalid on that field with message '<field> exceeds <N> characters'" manual "$CC"
claim 3 error_blank "a field that is empty after trim returns code invalid on that field with message '<field> must not be empty'" manual "$SPEC FR-016b"
claim 3 source_is_identity "source is part of the identity tuple: the same assertion from two different sources is two claims, which is corroboration" manual "$RS D4"

# -------------------------------------------------------- /mind/claims/get (4)

claim 4 path "the handler is registered at sys.call path /mind/claims/get" manual "$CC"
claim 4 params "params is id, required" manual "$CC"
claim 4 result "result is a single claim object with joined rank, same shape as create minus the created flag" manual "$CC"
claim 4 error_not_found "an unknown id returns code not_found on id with message 'claim not found: <id>'" manual "$CC"

# ------------------------------------------------------- /mind/claims/list (5)

claim 5 path "the handler is registered at sys.call path /mind/claims/list" manual "$CC"
claim 5 params "params are all optional and AND-combined: subject_type, subject_id, predicate, authority, resolve (bool, default false), limit (int, default 100)" manual "$CC"
claim 5 result "result is { claims: [...], count: N, resolved: bool }" manual "$CC"
claim 5 ordering "claims are ordered by rank descending, then id ascending" manual "$CC"
claim 5 no_overwrite "competing claims are stored side by side; nothing is overwritten, merged, or given precedence at write time" product "$SPEC FR-007"
claim 5 resolve_projection "with resolve true, one claim per (subject_type, subject_id, predicate) group is returned - the highest-rank one - and resolution is per group, not a global maximum" product "$SPEC FR-011"
claim 5 resolve_tie "with resolve true, a tie at the top rank between different assertions returns all tied claims for that group" product "$SPEC 4.2"
claim 5 resolve_no_writes "requesting a resolved view performs no writes and does not remove or hide the losing claims from unresolved queries" product "$SPEC SC-002"
claim 5 empty_is_success "no matches returns an empty list with count 0 and status success, not an error" product "$SPEC FR-018"
claim 5 subject_id_alone "subject_id given without subject_type matches claims on either subject type" manual "$CC"

# -------------------------------------------------- /mind/claims/conflicts (6)

claim 6 path "the handler is registered at sys.call path /mind/claims/conflicts" manual "$CC"
claim 6 params "params are all optional filters: subject_type, subject_id, predicate" manual "$CC"
claim 6 result "result is { conflicts: [group...], count: N }" manual "$CC"
claim 6 no_truncation "conflict groups are returned whole; there is no silent truncation" product "$SPEC edge cases"
claim 6 empty_is_success "no conflicts returns an empty list with count 0 and status success" product "$SPEC FR-018"

# ------------------------------------------------------- conflict group (11)

claim 11 derived "a conflict group is derived per request, never stored" manual "$DM"
claim 11 definition "a group is a conflict when one (subject_type, subject_id, predicate) holds two or more distinct assertions" product "$SPEC FR-010"
claim 11 agreement "the same assertion from two authorities is agreement, not a conflict, and produces no group" product "$SPEC 3.3"
claim 11 shape "a group carries subject_type, subject_id, predicate, claims (each with id, assertion, authority, rank, source, created_at), resolution, and unresolved" manual "$DM"
claim 11 claim_ordering "claims within a group are ordered by rank descending, then id ascending" manual "$DM"
claim 11 group_ordering "groups are ordered by subject_type ascending, then subject_id ascending, then predicate ascending" manual "$CC"
claim 11 resolution "resolution is the single highest-rank claim, carrying id, assertion, authority and rank" product "$SPEC FR-010"
claim 11 tie_unresolved "if two or more claims tie at the top rank with different assertions, resolution is null and unresolved is true; ties are never broken by recency, id, or insertion order" product "$SPEC 3.4"
claim 11 edge_subjects "edge subjects produce conflict groups here even though the built-in contradictions rule is concept-only" manual "$CC"

# ----------------------------------------------------- /mind/claims/delete (7)

claim 7 path "the handler is registered at sys.call path /mind/claims/delete" manual "$CC"
claim 7 params "params is id, required" manual "$CC"
claim 7 result "result is { id: <id>, deleted: true }" manual "$CC"
claim 7 error_not_found "an unknown id returns code not_found on id with message 'claim not found: <id>'" manual "$CC"
claim 7 removal_mechanics "claims is an all-key relation, so removal needs the full 8-column row: read the row by id, then remove it" manual "$CC"

# ------------------------------------------------ /mind/authorities/create (8)

claim 8 path "the handler is registered at sys.call path /mind/authorities/create" manual "$CA"
claim 8 params "params are name (required), rank (required), description (optional)" manual "$CA"
claim 8 result "result is { name, rank, description, created }" manual "$CA"
claim 8 upsert "re-registering an existing name updates it rather than duplicating; created is false in that case" product "$SPEC FR-006"
claim 8 description_preserved "an omitted description on an update preserves the existing description rather than blanking it" manual "$CA"
claim 8 no_rewrite "updating a rank does not rewrite claims; they pick up the new rank on the next read" product "$SPEC FR-012"
claim 8 error_rank "a non-integer or negative rank returns code invalid on rank with message 'rank must be a non-negative integer'" manual "$CA"
claim 8 error_required "a missing name or rank returns code required on that field with message '<field> is required'" manual "$CA"
claim 8 error_name_cap "a name over 64 chars returns code invalid on name with message 'name exceeds 64 characters'" manual "$CA"

# -------------------------------------------------- /mind/authorities/list (9)

claim 9 path "the handler is registered at sys.call path /mind/authorities/list" manual "$CA"
claim 9 params "takes no params" manual "$CA"
claim 9 result "result is { authorities: [{name, rank, description}...], count: N }" manual "$CA"
claim 9 ordering "ordered by rank descending, then name ascending" manual "$CA"

# ------------------------------------------------ /mind/authorities/delete (10)

claim 10 path "the handler is registered at sys.call path /mind/authorities/delete" manual "$CA"
claim 10 params "params is name, required" manual "$CA"
claim 10 result "result is { name, deleted: true }" manual "$CA"
claim 10 error_not_found "an unknown tier returns code not_found on name with message 'authority tier not found: <name>'" manual "$CA"
claim 10 error_referenced "deleting a tier that any claim references returns code conflict on name with message 'authority tier is referenced by <N> claim: <name>' (singular for one) and deletes nothing" product "$SPEC FR-006"

# ------------------------------------------------- contradictions rule (12)

claim 12 builtin "a built-in Datalog rule named contradictions ships alongside cycles and orphans" product "$SPEC FR-013"
claim 12 description "its registered description is 'Detects concepts carrying competing claims (contradiction)'" manual "$DM"
claim 12 contract "it returns [id, name] concept pairs, the fixed contract consumed by /mind/rules/query, /mind/verify and pr-verify" manual "$DM"
claim 12 body "the rule body is: contradictions[id, name] := *concepts[id, name, _, _, _], *claims[c1, 'concept', id, pred, a1, _, _, _], *claims[c2, 'concept', id, pred, a2, _, _, _], c1 < c2, a1 != a2" manual "$DM"
claim 12 scope "the rule covers concept subjects only; an edge id would be indistinguishable from a concept id in the [id, name] contract" manual "$RS D7"
claim 12 fires_when_resolved "the rule flags every contradiction including ones that resolve cleanly by rank; it reports that the graph disagrees with itself, not whether the disagreement has a winner" product "$SPEC US6"
claim 12 protected "it is a built-in and must be protected from deletion and overwrite like cycles and orphans" manual "$SPEC FR-013"

# ------------------------------------------------------- claim cascade (13)

claim 13 single_seam "all concept and edge removal flows through one cascade function so no path can forget" manual "$DM"
claim 13 concept_delete "deleting a concept removes claims on the concept AND claims on every edge that the deletion cascades away" product "$SPEC FR-015"
claim 13 concept_delete_report "concept delete reports the count as cascade.claims_removed" manual "$CC"
claim 13 edge_delete "deleting an edge removes claims with subject_type edge and matching subject_id, reported as claims_removed" product "$SPEC FR-015"
claim 13 prune "prune removes claims for every concept and edge it prunes; it deletes directly, bypassing the delete handlers" product "$SPEC FR-015"
claim 13 extract "re-extraction removes claims for replaced concepts and edges" product "$SPEC FR-015"

# ---------------------------------------------------- schema migration (14)

claim 14 version "the schema version moves from 1.12.0 to 1.13.0" manual "$DM"
claim 14 additive "the migration creates both relations, seeds the five tiers, and inserts the contradictions rule; no existing relation is touched" product "$SPEC FR-016"
claim 14 parity "a freshly initialized 1.13.0 database and a migrated 1.12.0 database must be indistinguishable: same relations, same seeded tiers, same built-in rules" manual "$DM"
claim 14 no_data_loss "the migration preserves every existing concept, edge, provenance record, annotation, rule and episode" product "$SPEC SC-006"

# --------------------------------------------------------------- envelope

claim 3 envelope "all operations follow the sys.call Result envelope, POD only, snake_case field names" product "$SPEC FR-017"

echo "loaded"
