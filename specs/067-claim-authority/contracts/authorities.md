# Contract: `/mind/authorities/*`

Standard envelope. Error codes: `required`, `invalid`, `not_found`, `conflict`, `not_initialized`.

---

## `/mind/authorities/list`

**Params**: none.

**Result**

```json
{
  "authorities": [
    { "name": "manual",         "rank": 100, "description": "Direct human assertion; highest standing" },
    { "name": "legal",          "rank": 40,  "description": "Legal or regulatory constraint" },
    { "name": "product",        "rank": 30,  "description": "Product intent" },
    { "name": "implementation", "rank": 20,  "description": "What the code actually does" },
    { "name": "observation",    "rank": 10,  "description": "Recorded from experience; non-binding by default" }
  ],
  "count": 5
}
```

Ordered by `rank` descending, then `name` ascending. A freshly initialized mind.db returns exactly these
five seeded tiers (FR-005, spec 5.1).

---

## `/mind/authorities/create`

Register a tier, or update one that already exists (upsert — spec 5.3).

**Params**

| field | type | required | notes |
|---|---|---|---|
| `name` | string | yes | ≤ 64, non-empty after trim |
| `rank` | int | yes | non-negative integer |
| `description` | string | no | defaults to `""` |

**Result**

```json
{ "name": "security", "rank": 35, "description": "Security review finding", "created": true }
```

`created` is `false` when an existing tier was updated. Updating a rank does **not** rewrite claims —
they pick up the new rank on the next read (FR-012, D2).

**Errors**

| condition | field | code |
|---|---|---|
| missing `name` or `rank` | that field | `required` |
| `rank` non-integer or negative | `rank` | `invalid` |
| `name` empty after trim or over cap | `name` | `invalid` |
| mind.db not initialized | `mind` | `not_initialized` |

---

## `/mind/authorities/delete`

**Params**: `{ "name": "security" }` (required)

**Result**: `{ "name": "security", "deleted": true }`

**Errors**

| condition | field | code |
|---|---|---|
| missing `name` | `name` | `required` |
| tier does not exist | `name` | `not_found` |
| one or more claims reference the tier | `name` | `conflict` — message names the referencing claim count; nothing is deleted (D8, spec 5.4) |
