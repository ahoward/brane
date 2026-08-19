# Quickstart: The Refund Contradiction

The scenario from `dna/product/vision-spec-machine.md`: product says 30-day refunds, legal says 14, the
implementation shows 45. Three claims, three authorities, three sources — represented, not hidden.

```bash
brane init
```

## 1. The subject

```bash
brane concept create --name RefundWindow --type Entity
# => { "id": 1, "name": "RefundWindow", "type": "Entity" }
```

## 2. Three claims, three authorities

```bash
brane claim create --concept 1 --predicate refund_window \
  --assertion "30 days" --authority product --source dna/product/prd.md

brane claim create --concept 1 --predicate refund_window \
  --assertion "14 days" --authority legal --source legal/policy.md

brane claim create --concept 1 --predicate refund_window \
  --assertion "45 days" --authority implementation --source src/billing.ts
```

Nothing was overwritten. Three rows exist.

## 3. All three are still there

```bash
brane claim list --concept 1
```

```json
{
  "claims": [
    { "id": 2, "assertion": "14 days", "authority": "legal",          "rank": 40, "source": "legal/policy.md" },
    { "id": 1, "assertion": "30 days", "authority": "product",        "rank": 30, "source": "dna/product/prd.md" },
    { "id": 3, "assertion": "45 days", "authority": "implementation", "rank": 20, "source": "src/billing.ts" }
  ],
  "count": 3,
  "resolved": false
}
```

## 4. The contradiction, named

```bash
brane claim conflicts
```

```json
{
  "conflicts": [{
    "subject_type": "concept", "subject_id": 1, "predicate": "refund_window",
    "claims": [ /* all three */ ],
    "resolution": { "id": 2, "assertion": "14 days", "authority": "legal", "rank": 40 },
    "unresolved": false
  }],
  "count": 1
}
```

Legal wins by rank. Product and implementation are **still in the group** — the conflict did not
disappear because it was resolved.

## 5. One answer, when you need one

```bash
brane claim list --concept 1 --resolve
# => 14 days / legal

brane claim list --concept 1
# => all three, unchanged. Resolution wrote nothing.
```

## 6. The validator arm sees it

```bash
brane verify --rules contradictions
```

```json
{
  "passed": false,
  "summary": { "rules_passed": 0, "rules_failed": 1, "total_violations": 1 },
  "rules": [{ "name": "contradictions", "passed": false,
              "violations": [{ "id": 1, "name": "RefundWindow" }], "error": null }]
}
```

`pr-verify` consumes the same rule. A change that introduces an unresolved contradiction can now fail a
PR.

## 7. Re-ranking, without rewriting history

Your org decides security outranks legal:

```bash
brane authority create --name security --rank 45 --description "Security review finding"
brane claim create --concept 1 --predicate refund_window \
  --assertion "7 days" --authority security --source security/audit-2026-08.md

brane claim conflicts
# => four claims in the group, resolution is now security / 7 days
```

No claim row was rewritten. Rank is joined at read time.

## 8. Ties do not resolve

```bash
brane authority create --name legal_eu --rank 40 --description "EU legal constraint"
brane claim create --concept 1 --predicate refund_window \
  --assertion "30 days" --authority legal_eu --source legal/eu.md
brane authority create --name security --rank 20   # demote security below the tie

brane claim conflicts
# => "resolution": null, "unresolved": true
```

Two tiers at rank 40 disagree. Brane does not pick. A human does — that is #114.

---

## sys.call equivalents

Every CLI command above is a thin wrapper:

```bash
echo '{"subject_type":"concept","subject_id":1,"predicate":"refund_window",
       "assertion":"30 days","authority":"product","source":"dna/product/prd.md"}' \
  | brane /mind/claims/create

echo '{"subject_id":1}'                | brane /mind/claims/conflicts
echo '{"subject_id":1,"resolve":true}' | brane /mind/claims/list
echo '{}'                              | brane /mind/authorities/list
```
