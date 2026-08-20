# Contract: `/mind/claims/*`

All paths return the standard envelope:

```json
{ "status": "success" | "error", "result": T | null, "errors": ErrorMap | null,
  "meta": { "path": "...", "timestamp": "...", "duration_ms": 0 } }
```

Error codes used: `required`, `invalid`, `not_found`, `not_initialized`.

---

## `/mind/claims/create`

Assert a claim. Idempotent on the full 5-tuple (D4).

**Params**

| field | type | required | notes |
|---|---|---|---|
| `subject_type` | string | yes | `"concept"` or `"edge"` |
| `subject_id` | int | yes | must exist |
| `predicate` | string | yes | free-form, trimmed then stored, ≤ 256 after trim |
| `assertion` | string | yes | free-form, trimmed then stored, ≤ 4096 after trim |
| `authority` | string | yes | trimmed; must be a registered tier |
| `source` | string | yes | opaque provenance, trimmed then stored, ≤ 1024 after trim |

All four are trimmed at the boundary (FR-016b) so every downstream comparison — idempotency, conflict
grouping, and Datalog — sees identical strings.

**Result**

```json
{
  "id": 1,
  "subject_type": "concept",
  "subject_id": 1,
  "predicate": "refund_window",
  "assertion": "30 days",
  "authority": "product",
  "rank": 30,
  "source": "dna/product/prd.md",
  "created_at": "2026-08-19T00:00:00.000Z",
  "created": true
}
```

`created` is `false` when an identical claim already existed (idempotent re-assertion); the existing
row is returned unchanged, including its original `id` and `created_at`.

**Errors**

| condition | field | code |
|---|---|---|
| missing any required field | that field | `required` |
| `subject_type` not `concept`/`edge` | `subject_type` | `invalid` |
| subject does not exist | `subject_id` | `not_found` |
| authority tier not registered | `authority` | `not_found` |
| field exceeds cap or empty after trim | that field | `invalid` |
| mind.db not initialized | `mind` | `not_initialized` |

---

## `/mind/claims/get`

**Params**: `{ "id": 1 }` (required)

**Result**: a single claim object, same shape as create's result minus `created`.

**Errors**: `id` `required`; `id` `not_found`.

---

## `/mind/claims/list`

**Params** (all optional; AND-combined)

| field | type | notes |
|---|---|---|
| `subject_type` | string | `"concept"` or `"edge"` |
| `subject_id` | int | matches claims on either subject type unless `subject_type` is also given |
| `predicate` | string | exact match |
| `authority` | string | tier name, exact match |
| `resolve` | bool | default `false`. When `true`, returns only the highest-rank claim per `(subject_type, subject_id, predicate)` |
| `limit` | int | default 100 |

**Result**

```json
{
  "claims": [
    { "id": 2, "subject_type": "concept", "subject_id": 1, "predicate": "refund_window",
      "assertion": "14 days", "authority": "legal", "rank": 40,
      "source": "legal/policy.md", "created_at": "..." }
  ],
  "count": 1,
  "resolved": false
}
```

Ordering: `rank` descending, then `id` ascending.

With `resolve: true`, `resolved` is `true` and resolution is per `(subject_type, subject_id,
predicate)` group — **not** a global maximum. Ties at the top rank return **all** tied claims for that
group (spec 4.2); the list shape carries no per-group flag, so a caller who needs to know a group is
unresolved asks `/mind/claims/conflicts`. Resolution performs **no writes** (SC-002).

Empty match → `{"claims": [], "count": 0, "resolved": false}` with `status: "success"` (FR-018).

---

## `/mind/claims/conflicts`

Groups where one subject+predicate carries two or more distinct assertions.

**Params** (all optional)

| field | type | notes |
|---|---|---|
| `subject_type` | string | filter |
| `subject_id` | int | filter |
| `predicate` | string | filter |

**Result**

```json
{
  "conflicts": [
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
  ],
  "count": 1
}
```

Tie at top rank → `"resolution": null, "unresolved": true`.
No conflicts → `{"conflicts": [], "count": 0}`, `status: "success"`.
Groups are never truncated (spec edge case).

Group ordering: `subject_type` ascending, then `subject_id` ascending, then `predicate` ascending.
Claims within a group: `rank` descending, then `id` ascending. Edge subjects produce conflict groups
here even though the built-in `contradictions` rule is concept-only (research D7).

---

## `/mind/claims/delete`

**Params**: `{ "id": 1 }` (required)

**Result**: `{ "id": 1, "deleted": true }`

**Errors**: `id` `required`; `id` `not_found`.

**Implementation note**: `claims` is an all-key relation, so `:rm` needs the full 8-column row. Read the
row by `id`, then remove it — the same read-then-remove shape as `annotations/delete.ts`.

---

## Cascade shape changes on existing paths

Claims cascade wherever their subject is removed (D8), and the affected handlers report it:

| path | change |
|---|---|
| `/mind/concepts/delete` | `cascade` object gains `claims_removed` — counts claims on the concept **and** on the edges that deletion cascades away |
| `/mind/edges/delete` | result gains `claims_removed` alongside `deleted` |
| `/mind/prune` | prunes claims for pruned concepts and edges |

These change locked fixtures; see research D11.
