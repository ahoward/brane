# Phase 1 Data Model: Claim + Authority

**Feature**: `067-claim-authority` | **Schema**: mind.db v1.12.0 → **v1.13.0**

---

## Relation: `claims`

```datalog
:create claims {
  id: Int,
  subject_type: String,
  subject_id: Int,
  predicate: String,
  assertion: String,
  authority: String,
  source: String,
  created_at: String
}
```

| Field | Type | Notes |
|---|---|---|
| `id` | Int | Surrogate PK. Sequential, allocated by `get_next_claim_id()` — same pattern as concepts/edges/episodes. |
| `subject_type` | String | `"concept"` or `"edge"`. Validated on write. |
| `subject_id` | Int | Must exist in `concepts` or `edges` per `subject_type`. |
| `predicate` | String | Free-form label, e.g. `refund_window`. **Never validated against a vocabulary.** ≤ 256 chars. |
| `assertion` | String | Free-form value, e.g. `30 days`. **Never validated.** ≤ 4096 chars. |
| `authority` | String | Tier **name**, must exist in `authorities`. Rank is *not* stored here (D2). |
| `source` | String | Opaque provenance: file URL, session id, agent id, or human identifier. Not validated against body.db. ≤ 1024 chars. |
| `created_at` | String | ISO 8601, server-generated. |

**Invariants**

1. `subject_type ∈ {"concept", "edge"}`.
2. The subject exists at write time (FR-002).
3. `authority` names a registered tier at write time (FR-003).
4. `predicate`, `assertion`, `authority`, `source` are non-empty after trim.
5. No two rows share the full tuple `(subject_type, subject_id, predicate, assertion, authority, source)` — idempotency (D4).
6. Rows are **immutable**. No update path. Correction = delete + re-assert (spec Assumptions).

**Arity coupling**: 8 columns. The built-in `contradictions` rule body positionally matches this shape.
Any future column (e.g. #114's `binding`) MUST update the rule body in the same migration.

---

## Relation: `authorities`

```datalog
:create authorities {
  name: String
  =>
  rank: Int,
  description: String
}
```

| Field | Type | Notes |
|---|---|---|
| `name` | String | PK. Tier identifier, e.g. `legal`. ≤ 64 chars, non-empty after trim. |
| `rank` | Int | Higher = more authoritative. Must be a non-negative integer. |
| `description` | String | Human-readable purpose. May be empty. |

**Invariants**

1. `name` is unique — re-registering an existing name is an **update**, not a duplicate (FR-006, spec 5.3).
2. `rank` is a non-negative integer; non-integer or negative is a validation error (spec 5.5).
3. A tier referenced by any claim cannot be deleted (FR-006, D8).
4. Ranks need not be unique — two tiers may tie, which is precisely what produces `unresolved` groups.

**Seeded on init and on migration** (D6):

| name | rank | description |
|---|---|---|
| `observation` | 10 | Recorded from experience; non-binding by default |
| `implementation` | 20 | What the code actually does |
| `product` | 30 | Product intent |
| `legal` | 40 | Legal or regulatory constraint |
| `manual` | 100 | Direct human assertion; highest standing |

---

## Derived: Conflict Group

**Not stored.** Computed per request by `/mind/claims/conflicts` and by `list` with `resolve: true`.

```json
{
  "subject_type": "concept",
  "subject_id": 1,
  "predicate": "refund_window",
  "claims": [
    { "id": 2, "assertion": "14 days", "authority": "legal",          "rank": 40, "source": "legal/policy.md",  "created_at": "..." },
    { "id": 1, "assertion": "30 days", "authority": "product",        "rank": 30, "source": "dna/product/prd.md", "created_at": "..." },
    { "id": 3, "assertion": "45 days", "authority": "implementation", "rank": 20, "source": "src/billing.ts",   "created_at": "..." }
  ],
  "resolution": { "id": 2, "assertion": "14 days", "authority": "legal", "rank": 40 },
  "unresolved": false
}
```

**Construction**

1. Fetch claims (filtered), left-joined to `authorities` for `rank`.
2. Group by `(subject_type, subject_id, predicate)`.
3. A group is a **conflict** when it holds ≥ 2 distinct trimmed `assertion` values (D3). Same assertion
   from two authorities is agreement — not a conflict (spec 3.3).
4. `claims` within a group are ordered by `rank` descending, then `id` ascending (stable output).
5. `resolution` = the single highest-rank claim. If two or more claims tie at the top rank *with
   different assertions*, `resolution` is `null` and `unresolved` is `true` (spec 3.4). Never break a tie.

**Missing tier edge case**: a claim whose tier was somehow removed (should be impossible per invariant 3)
reads with `rank: null` and sorts last; it never wins a resolution.

---

## Cascades and referential rules

| Event | Effect |
|---|---|
| `/mind/concepts/delete` | All claims with `subject_type = "concept"` and matching `subject_id` are removed. Mirrors the existing annotation cascade. |
| `/mind/edges/delete` | All claims with `subject_type = "edge"` and matching `subject_id` are removed. |
| `/mind/authorities/delete` on a referenced tier | **Refused.** Error, no change (D8). |
| `/mind/authorities/create` on an existing name | Rank/description updated in place. Existing claims reflect the new rank on the next read — no rewrite (D2, FR-012). |
| `/mind/claims/delete` | Removes one row. Conflict groups recompute on the next query (spec 7.3). |

---

## Built-in rule: `contradictions`

Registered alongside `cycles` and `orphans` in `BUILTIN_RULES` (init) and `BUILTIN_RULE_NAMES` (lib/mind.ts).

```datalog
contradictions[id, name] :=
  *concepts[id, name, _, _, _],
  *claims[c1, 'concept', id, pred, a1, _, _, _],
  *claims[c2, 'concept', id, pred, a2, _, _, _],
  c1 < c2,
  a1 != a2
```

Returns `[id, name]` — the fixed contract consumed by `/mind/rules/query`, `/mind/verify`, and
`pr-verify` (`execute_rule` in `src/handlers/mind/verify.ts`). No changes to those consumers.

**Known gap**: concept subjects only. Edge-subject contradictions are visible through
`/mind/claims/conflicts` but not through the rule, because the `[id, name]` contract cannot distinguish
an edge ID from a concept ID (D7).

---

## Schema version

`LATEST_VERSION` in `src/lib/migrate.ts`: `1.12.0` → `1.13.0`.
`SCHEMA_VERSION` in `src/handlers/mind/init.ts`: `1.12.0` → `1.13.0`.

A freshly initialized v1.13.0 database and a v1.12.0 database migrated to v1.13.0 MUST be
indistinguishable — same relations, same seeded tiers, same built-in rules.
