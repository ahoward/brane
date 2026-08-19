# Phase 0 Research: Claim + Authority Model

**Feature**: `067-claim-authority` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Ten decisions. Three of them resolve items the spec deferred to this phase (D2, D3, D6).

---

## D1 — Two relations, not one

**Decision**: `claims` (Int-keyed, one row per assertion) and `authorities` (String-keyed by tier name).

**Rationale**: Claims are append-heavy and identified by surrogate ID like concepts/edges/episodes.
Tiers are a small keyed lookup like `golden_types`. Both precedents already exist in the schema; no new
pattern is invented.

**Alternatives rejected**:
- One relation with the rank inlined → breaks FR-012 (re-ranking would require rewriting every claim).
- Tiers as a TypeScript constant → breaks FR-006 (project-defined tiers). See plan Complexity Tracking.

---

## D2 — Rank is joined at read time *(resolves a spec deferral)*

**Decision**: `claims` stores the authority tier **name** only. Rank comes from `authorities` on every
read (list, get, conflicts, rules).

**Rationale**: FR-012 and spec edge case "authority rank changed after claims exist". Copying rank into
the claim row would freeze the graph's precedence at write time and make re-ranking a migration.

**Cost**: one extra join per read. Cheap — `authorities` is a handful of rows.

**Consequence for Datalog**: a rule that needs rank must join `*claims` → `*authorities` itself. The
built-in `contradictions` rule deliberately does **not** — it reports that a concept disagrees with
itself, independent of who wins (D7). User-defined rules are free to join for rank; the join is
validated in data-model.md.

---

## D3 — Conflict comparison is trim-then-exact, case-sensitive *(resolves a spec deferral)*

**Decision**: `predicate`, `assertion`, `authority`, and `source` are **trimmed at write time and
stored trimmed** (FR-016b). Every comparison downstream — conflict grouping, idempotency, and Datalog —
is then plain exact equality on stored values, **case-sensitive**.

Two claims conflict when `subject_type`, `subject_id`, and `predicate` are equal and `assertion` differs.

**Why trim at write, not at read**: the conflict endpoint compares in TypeScript and the built-in rule
compares in Datalog (`a1 != a2`). Trimming in only one of them makes `"30 days"` and `"30 days "`
agreement to one read path and a violation to the other — SC-004 fails and the two arms of the feature
disagree about what a contradiction is. Normalizing once, at the boundary, removes the whole class of
divergence. It also makes the D4 idempotency tuple unambiguous: it compares stored values.

**Rationale**: "Loose about vocabulary" means brane does not decide that `30 Days` and `30 days` mean
the same thing — that is a semantic judgment, and guessing it wrong silently *hides* a conflict, which
is the exact failure mode this feature exists to prevent. Trimming is safe (whitespace carries no
meaning); case folding is not.

**Trade-off accepted**: `30 days` vs `one month` is two claims and no detected conflict. Already
recorded as a known limitation in spec Out of Scope. Semantic conflict detection is a later feature.

**Alternatives rejected**:
- Case-insensitive → silently merges assertions that may differ in meaning (`ID` vs `id` in a schema
  claim).
- Full normalization (units, synonyms) → out of scope; needs a vocabulary layer that does not exist.

---

## D4 — Idempotency by pre-insert lookup on the 5-tuple *(resolves a spec deferral)*

**Decision**: Before inserting, query for an existing claim matching
`(subject_type, subject_id, predicate, assertion, authority, source)`. If found, return it unchanged
with the same success envelope. Otherwise allocate the next ID and insert.

**Rationale**: FR-008 and spec scenario 2.2. A pre-insert lookup is one query and needs no new column.

**Alternatives rejected**:
- Content hash column → an extra field and a hashing decision for a constraint one query already
  enforces. YAGNI.
- Cozo composite primary key on the 5-tuple → loses the stable Int ID that `get`/`delete`/cascade all
  need, and makes long assertion strings part of the key.

**Note**: `source` is part of the identity tuple. The same assertion from two different sources is two
claims — that is corroboration, and the spec keeps it (scenario 2.3 for authority; same logic for source).

---

## D5 — Resolution is a TypeScript projection, not a Datalog aggregate

**Decision**: `list` with `resolve: true` and `conflicts` both fetch the relevant claim rows (joined
with rank) in one query, then group and rank in TypeScript.

**Rationale**: The tie rule (equal top rank → no winner, `unresolved: true`) is awkward and opaque in
Datalog and trivial in TypeScript. Constitution VI favors the readable version. Grouping in memory also
keeps `conflicts` returning whole groups with no silent truncation (spec edge case).

**Revisit if**: SC-007 (< 1s at 10k claims) fails. Recorded as a risk in the plan.

---

## D6 — Default tiers seeded at ranks with gaps

**Decision**: Seed five tiers on init and on migration:

| tier | rank | description |
|---|---|---|
| `observation` | 10 | Recorded from experience; non-binding by default |
| `implementation` | 20 | What the code actually does |
| `product` | 30 | Product intent |
| `legal` | 40 | Legal or regulatory constraint |
| `manual` | 100 | Direct human assertion; highest standing |

**Rationale**: Covers FR-005's required minimum and the vision doc's refund scenario exactly
(product < legal, implementation below both). Steps of 10 let a project insert `security` at 35 without
renumbering (spec Assumptions). `manual` at 100 mirrors the `infinity` authority annotations already
carry, without changing annotations.

**Note**: `observation` sitting lowest is the hook #114 needs — "most observations stay observations".
This feature does not act on that; it just makes the ordering available.

---

## D7 — Built-in `contradictions` rule joins claims to concepts

**Decision**: Ship a third built-in rule alongside `cycles` and `orphans`:

```datalog
contradictions[id, name] :=
  *concepts[id, name, _, _, _],
  *claims[c1, 'concept', id, pred, a1, _, _, _],
  *claims[c2, 'concept', id, pred, a2, _, _, _],
  c1 < c2,
  a1 != a2
```

**Rationale**: FR-013 and user story 6. Rules return `[id, name]` concept pairs — that is the fixed
contract `verify`, `pr-verify`, and `/mind/rules/query` all consume (see `execute_rule` in
`src/handlers/mind/verify.ts`). Matching that contract means claims plug into the existing validator arm
with zero changes to verify.

**`c1 < c2`** dedupes the symmetric pair so each contradicting concept appears once.

**Scope note**: the rule covers concept subjects only. Edge-subject contradictions are representable and
queryable via `/mind/claims/conflicts`, but the `[id, name]` rule contract has no room for an edge — edge
IDs would collide with concept IDs in the violations list. Documented as a known gap; a rules-contract
change is its own feature.

**Validated**: the rule body and the D2 rank join were executed against an in-memory CozoDB with the
exact relation shapes from data-model.md. The rule returned only the contradicting concept and omitted
a concept whose two claims agreed; the rank join ordered legal(40) > product(30) > implementation(20).
Syntax and semantics confirmed before implementation.

**Scope**: the rule flags every contradiction, including ones that resolve cleanly by rank (quickstart
step 6 shows `verify` failing while `legal` wins). That is intended — the rule answers "does this graph
disagree with itself", and rank-aware filtering is what `/mind/claims/conflicts` is for. A rank-aware
rule variant is bigger, needs the authorities join, and has no requirement asking for it.

**Coupling risk**: the rule body hardcodes the 8-column `claims` arity. #114 adding a column must update
this rule body in the same migration.

**Correction to an earlier assumption**: built-in rules are seeded by raw `:put` in `init.ts` and are
**not** syntax-validated — `validate_rule_syntax` runs only in `/mind/rules/create`. A broken built-in
surfaces at query time as a per-rule `error` string that `execute_rule` catches, which is quiet. The
safety net is therefore a test, not a runtime check: the tc suite asserts `contradictions` executes
without an `error` field, so an arity break fails the suite loudly. #114 inherits that test.

---

## D8 — Cascade on subject deletion, refuse on tier deletion

**Decision**: Deleting a concept or edge deletes its claims. Deleting an authority tier that any claim
references returns an error and changes nothing.

**Rationale**: FR-015 and FR-006. Asymmetric on purpose — a claim about a deleted concept is meaningless
and cannot be repaired, while a claim under a deleted tier is meaningful and *would* be corrupted by
losing its standing. Refusing the tier deletion is the only option that never orphans a claim.

**Two traps found while reviewing the existing deletion paths, both of which naive cascades miss:**

1. **Concept deletion already cascades edges.** `concepts/delete.ts` removes every edge touching the
   concept with a direct `:rm edges`. A cascade that only deletes `subject_type = "concept"` claims
   leaves the claims on those removed edges dangling. Concept deletion must delete claims on the
   cascaded edge IDs too.
2. **`prune` and re-extraction delete concepts and edges without going through the delete handlers**
   (`src/handlers/mind/prune.ts`, `src/handlers/calabi/extract.ts`). Annotations already dangle on those
   paths — an existing bug this feature must not copy, because a claim store whose rows outlive their
   subjects is exactly the integrity failure the feature exists to prevent.

**Consequence**: cascade logic lives in one lib function, `cascade_claims(db, subject_type, ids)`, called
from all four sites rather than reimplemented per handler. That is a deliberate small expansion of scope
over "just the two delete handlers" — justified because the alternative ships a known dangling-data path
on day one.

---

## D9 — Migration v1.12.0 → v1.13.0

**Decision**: One migration step: create `claims`, create `authorities`, seed the five default tiers,
insert the `contradictions` built-in rule. No existing relation is touched.

**Rationale**: Reuses the existing backup/restore harness in `src/lib/migrate.ts`. Additive-only, so
restore-on-failure is cheap and the SC-006 preservation guarantee is structural rather than tested by
hope.

**Care**: `init.ts` (`SCHEMA_QUERIES` + `BUILTIN_RULES`) and `migrate.ts` must produce byte-identical
schemas. A fresh init and a migrated db must be indistinguishable — the existing suite's precedent.

---

## D10 — Field caps

**Decision**: `predicate` ≤ 256 chars, `assertion` ≤ 4096 chars, `source` ≤ 1024 chars, tier `name`
≤ 64 chars. All non-empty after trim.

**Rationale**: 4096 matches `ANNOTATION_MAX_TEXT_LENGTH` — same discipline, same reason (bound the row,
reject the pathological input at the top of the handler per the guard-early convention). The other caps
are sized to their role: a predicate is a label, a source is a URL or identifier.

---

## D11 — Existing fixtures must change, and that is not a test rewrite

**Decision**: Adding a third built-in rule and bumping the schema version breaks locked fixtures that
pin the old values. Those fixtures are updated as an explicit, human-approved task — not quietly.

Affected (verified against the tree; tc's `deep_match` requires exact key sets and values):

| fixture | pins |
|---|---|
| `tests/mind/verify/data/{00,01,02,03,06}-*/result.json` | `rules_passed: 2`, enumerates `cycles` + `orphans` |
| `tests/mind/rules/list/data/{00,01}-*/result.json` | counts `2` and `3` |
| `tests/mind/init/data/{00,01,02}-*/result.json` | `schema_version: "1.12.0"` |
| `tests/mind/concepts/delete/data/00-success-delete/result.json` | cascade shape, gains `claims_removed` |

**Rationale**: constitution IV forbids changing tests after review without human approval. These changes
are mechanical consequences of a version bump and a new built-in, not adjustments to make a failing
implementation pass — but the distinction has to be *stated and approved*, not assumed. SC-005 is worded
to match.

---

## D12 — Cascade result shape

**Decision**: `/mind/concepts/delete` gains `claims_removed` in its existing `cascade` object.
`/mind/edges/delete` gains a `claims_removed` field alongside `deleted`.

**Rationale**: the concept handler already reports `edges_removed`, `annotations_removed`, and
`provenance_removed`; claims belong in the same place. Silence about a cascade the caller cannot
otherwise observe is worse than a fixture update.

---

## Resolved unknowns

Nothing remains marked NEEDS CLARIFICATION. The three spec-level deferrals (case sensitivity, rank
storage, idempotency mechanism) are decided in D3, D2, and D4.
