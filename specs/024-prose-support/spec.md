# 024-prose-support

## Problem

Brane currently limits concept types to `Entity | Caveat | Rule` and edge relations to `DEPENDS_ON | CONFLICTS_WITH | DEFINED_IN`. This works for code but kills prose modeling.

A writer modeling their novel can't express:
- Character LOVES Character
- Chapter FORESHADOWS Event
- Theme PERVADES Scene

A researcher can't express:
- Theory CONTRADICTS Theory
- Study SUPPORTS Hypothesis
- Author CITES Paper

The CLI must support arbitrary relationships with ULTRA POLS (Principle Of Least Surprise).

## Solution

**Remove type/relation enums.** Accept any string. Simple.

The change is minimal but profound:
1. Remove `is_valid_concept_type()` / `is_valid_edge_relation()` validation
2. Accept any non-empty string for `--type` and `--rel`
3. Update CLI help text to show these as freeform
4. Create prose-oriented examples showing the power

## CLI Interface (Human-First Design)

The interface stays exactly the same. Zero surprise. Just... no restrictions.

```bash
# Code (same as before)
brane concept create --name AuthService --type Entity
brane edge create --from 1 --to 2 --rel DEPENDS_ON

# Prose (now works!)
brane concept create --name "Hamlet" --type Character
brane concept create --name "Claudius" --type Character
brane edge create --from 1 --to 2 --rel HATES

# Research (now works!)
brane concept create --name "Quantum Entanglement" --type Theory
brane concept create --name "Bell Test 2022" --type Study
brane edge create --from 2 --to 1 --rel SUPPORTS
```

**Key UX Principle:** The CLI looks exactly the same. The only change is removing artificial limits. Users who were doing code get the same experience. Users who want prose... it just works.

## Examples to Create

### 09-prose-novel.sh
Model a novel's structure:
- Characters with relationships (LOVES, HATES, BETRAYS, TRUSTS)
- Chapters containing scenes
- Themes pervading narrative elements
- Plot points foreshadowing events

### 10-prose-research.sh
Model academic research:
- Papers citing papers
- Theories supporting/contradicting each other
- Authors collaborating
- Studies building on hypotheses

### 11-prose-philosophy.sh
Model philosophical concepts:
- Ideas influencing ideas
- Thinkers critiquing thinkers
- Movements emerging from movements
- Concepts entailing concepts

## Changes Required

### src/lib/mind.ts
- Keep `CONCEPT_TYPES` and `EDGE_RELATIONS` as **suggestions**, not restrictions
- Remove `is_valid_concept_type()` validation or make it always return true
- Remove `is_valid_edge_relation()` validation or make it always return true

### src/handlers/mind/concepts/create.ts
- Remove the type validation that returns error for unknown types

### src/handlers/mind/edges/create.ts
- Remove the relation validation that returns error for unknown relations

### src/cli/commands/concept.ts
- Update help text: `--type` description from "Entity | Rule | File" to "Concept type (freeform)"

### src/cli/commands/edge.ts
- Update help text: `--rel` description from "(DEPENDS_ON|IMPLEMENTS|CONTAINS)" to "Relationship type (freeform)"

### examples/
- 09-prose-novel.sh
- 10-prose-research.sh
- 11-prose-philosophy.sh

## Tests

### Mind Handler Tests
- Concept create with custom type "Character" succeeds
- Concept create with custom type "Theory" succeeds
- Edge create with custom relation "LOVES" succeeds
- Edge create with custom relation "CITES" succeeds
- Existing types (Entity, DEPENDS_ON) still work unchanged

### CLI Tests (whitebox scripts)
- 09-prose-novel.sh passes
- 10-prose-research.sh passes
- 11-prose-philosophy.sh passes

## Non-Goals

- Type/relation ontology management (define valid types upfront)
- Type inference from context
- Relation symmetry handling (LOVES implies LOVED_BY)
- Schema validation rules

These are all future features. Right now: remove the walls.

## Success Criteria

1. All existing 226 tests pass unchanged
2. New custom type/relation tests pass
3. Example scripts 09-11 pass
4. CLI help shows freeform (not enum) for type/rel
5. README updated to show prose examples
