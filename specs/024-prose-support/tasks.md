# 024-prose-support Tasks

## Task 1: Update mind.ts - Remove Type Restrictions
**File:** `src/lib/mind.ts`
**Action:** Make `is_valid_concept_type()` and `is_valid_edge_relation()` accept any non-empty string

```typescript
// Keep constants for documentation/suggestions
export const CONCEPT_TYPES = ["Entity", "Caveat", "Rule"] as const
export const EDGE_RELATIONS = ["DEPENDS_ON", "CONFLICTS_WITH", "DEFINED_IN"] as const

// Make validators permissive
export function is_valid_concept_type(type: string): boolean {
  return typeof type === "string" && type.length > 0
}

export function is_valid_edge_relation(relation: string): boolean {
  return typeof relation === "string" && relation.length > 0
}
```

**Test:** Run existing tests - should all pass

---

## Task 2: Update CLI Help - concept.ts
**File:** `src/cli/commands/concept.ts`
**Action:** Update help text for `--type`

```typescript
// Line 19, change:
type: { type: "string", alias: "t", description: "Entity | Rule | File", required: true }
// To:
type: { type: "string", alias: "t", description: "Concept type (freeform)", required: true }
```

---

## Task 3: Update CLI Help - edge.ts
**File:** `src/cli/commands/edge.ts`
**Action:** Update help text for `--rel`

```typescript
// Line 20, change:
rel: { type: "string", alias: "r", description: "Relation (DEPENDS_ON|IMPLEMENTS|CONTAINS)", required: true }
// To:
rel: { type: "string", alias: "r", description: "Relationship (freeform)", required: true }
```

---

## Task 4: Add Test - Custom Concept Type
**Location:** `tests/mind/concepts/create/`
**New Case:** `05-success-custom-type`

**input.json:**
```json
{"name": "Hamlet", "type": "Character"}
```

**expected.json:**
```json
{
  "status": "success",
  "result": {
    "id": 1,
    "name": "Hamlet",
    "type": "Character"
  },
  "errors": null
}
```

---

## Task 5: Add Test - Custom Edge Relation
**Location:** `tests/mind/edges/create/`
**New Case:** `04-success-custom-relation`

**input.json:**
```json
{"source": 1, "target": 2, "relation": "LOVES"}
```

**expected.json:**
```json
{
  "status": "success",
  "result": {
    "id": 1,
    "source": 1,
    "target": 2,
    "relation": "LOVES",
    "weight": 1
  },
  "errors": null
}
```

**setup.sh:**
```bash
init_mind
create_concept "Romeo" "Character"
create_concept "Juliet" "Character"
```

---

## Task 6: Create Example - 09-prose-novel.sh
**File:** `examples/09-prose-novel.sh`
**Content:** Model Hamlet - characters, relationships, themes, structure
**Expected Output:** Shows freeform types (Character, Theme, Act, Scene) and relations (HATES, LOVES, DRIVEN_BY)

---

## Task 7: Create Example - 10-prose-research.sh
**File:** `examples/10-prose-research.sh`
**Content:** Model academic research - authors, theories, papers, citations
**Expected Output:** Shows freeform types (Author, Theory, Paper, Study) and relations (AUTHORED, CITES, REFUTES, CONFIRMS)

---

## Task 8: Create Example - 11-prose-philosophy.sh
**File:** `examples/11-prose-philosophy.sh`
**Content:** Model philosophical ideas - thinkers, ideas, influences
**Expected Output:** Shows freeform types (Thinker, Idea) and relations (STUDENT_OF, INFLUENCED_BY, CRITIQUES, EXTENDS)

---

## Task 9: Run Full Test Suite
**Command:** `bun run test`
**Expected:** 226+ tests pass (all existing + new)

---

## Task 10: Run All Examples
**Command:** `./examples/run-all.sh`
**Expected:** 12/12 pass (00-11)

---

## Dependencies

```
Task 1 → Tasks 2, 3 (must remove restrictions before CLI changes matter)
Task 1 → Tasks 4, 5 (tests need permissive validators)
Tasks 4, 5 → Tasks 6, 7, 8 (unit tests before integration examples)
Tasks 1-8 → Task 9 (full suite after all changes)
Task 9 → Task 10 (unit tests before example scripts)
```

## Acceptance Criteria

1. `brane concept create --name X --type AnyString` succeeds
2. `brane edge create --from 1 --to 2 --rel AnyString` succeeds
3. All 226 existing tests pass (no regression)
4. New custom type/relation tests pass
5. Example scripts 09-11 pass and demonstrate prose modeling
6. CLI help shows "(freeform)" not enum lists
