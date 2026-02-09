# 024-prose-support Implementation Plan

## Phase 1: Remove Type/Relation Restrictions

### 1.1 Update mind.ts
Remove validation functions or make them permissive:
- `is_valid_concept_type()` → always returns true for non-empty string
- `is_valid_edge_relation()` → always returns true for non-empty string
- Keep constants as SUGGESTIONS (for docs/examples), not ENFORCEMENT

### 1.2 Update handlers/mind/concepts/create.ts
- Remove lines 44-51 (is_valid_concept_type check)
- Keep name/type required validation

### 1.3 Update handlers/mind/edges/create.ts
- Remove lines 57-64 (is_valid_edge_relation check)
- Keep source/target/relation required validation

## Phase 2: Update CLI Help Text

### 2.1 Update cli/commands/concept.ts
```typescript
// Before:
type: { type: "string", alias: "t", description: "Entity | Rule | File", required: true }

// After:
type: { type: "string", alias: "t", description: "Concept type (freeform)", required: true }
```

### 2.2 Update cli/commands/edge.ts
```typescript
// Before:
rel: { type: "string", alias: "r", description: "Relation (DEPENDS_ON|IMPLEMENTS|CONTAINS)", required: true }

// After:
rel: { type: "string", alias: "r", description: "Relationship (freeform)", required: true }
```

## Phase 3: Add tc Tests

### 3.1 mind/concepts/create/ tests
Add test cases:
- `05-success-custom-type` - type: "Character"
- `06-success-custom-type-multi-word` - type: "Plot Device"

### 3.2 mind/edges/create/ tests
Add test cases:
- `04-success-custom-relation` - relation: "LOVES"
- `05-success-custom-relation-lower` - relation: "supports"

## Phase 4: Create Prose Example Scripts

### 4.1 examples/09-prose-novel.sh
```bash
#!/usr/bin/env bash
#
# 09-prose-novel.sh — modeling narrative structure
#
# Characters, relationships, chapters, themes
#

set -e
source "$(dirname "$0")/lib/common.sh"
setup_workspace

brane init > /dev/null

# ─────────────────────────────────────────────────────────────────────────────
# characters
# ─────────────────────────────────────────────────────────────────────────────

run brane concept create --name "Hamlet" --type Character
run brane concept create --name "Claudius" --type Character
run brane concept create --name "Ophelia" --type Character
run brane concept create --name "Gertrude" --type Character

# relationships
run brane edge create --from 1 --to 2 --rel HATES
run brane edge create --from 1 --to 3 --rel LOVES
run brane edge create --from 2 --to 4 --rel MARRIED_TO
run brane edge create --from 1 --to 4 --rel SON_OF

# ─────────────────────────────────────────────────────────────────────────────
# themes
# ─────────────────────────────────────────────────────────────────────────────

run brane concept create --name "Revenge" --type Theme
run brane concept create --name "Madness" --type Theme
run brane concept create --name "Mortality" --type Theme

run brane edge create --from 1 --to 5 --rel DRIVEN_BY
run brane edge create --from 1 --to 6 --rel EXHIBITS
run brane edge create --from 7 --to 1 --rel HAUNTS

# ─────────────────────────────────────────────────────────────────────────────
# structure
# ─────────────────────────────────────────────────────────────────────────────

run brane concept create --name "Act I" --type Act
run brane concept create --name "The Ghost Scene" --type Scene

run brane edge create --from 9 --to 8 --rel CONTAINED_IN
run brane edge create --from 9 --to 5 --rel INTRODUCES

run brane concept list
run brane edge list
```

### 4.2 examples/10-prose-research.sh
```bash
#!/usr/bin/env bash
#
# 10-prose-research.sh — modeling academic knowledge
#
# Papers, theories, citations, authors
#

set -e
source "$(dirname "$0")/lib/common.sh"
setup_workspace

brane init > /dev/null

# ─────────────────────────────────────────────────────────────────────────────
# foundational work
# ─────────────────────────────────────────────────────────────────────────────

run brane concept create --name "Einstein" --type Author
run brane concept create --name "Bohr" --type Author
run brane concept create --name "Special Relativity" --type Theory
run brane concept create --name "Quantum Mechanics" --type Theory

run brane edge create --from 1 --to 3 --rel AUTHORED
run brane edge create --from 2 --to 4 --rel DEVELOPED

# ─────────────────────────────────────────────────────────────────────────────
# papers and citations
# ─────────────────────────────────────────────────────────────────────────────

run brane concept create --name "EPR Paradox (1935)" --type Paper
run brane concept create --name "Bell's Theorem (1964)" --type Paper
run brane concept create --name "Aspect Experiment (1982)" --type Study

run brane edge create --from 5 --to 4 --rel CHALLENGES
run brane edge create --from 6 --to 5 --rel CITES
run brane edge create --from 6 --to 5 --rel REFUTES
run brane edge create --from 7 --to 6 --rel CONFIRMS

# ─────────────────────────────────────────────────────────────────────────────
# relationships
# ─────────────────────────────────────────────────────────────────────────────

run brane edge create --from 1 --to 2 --rel DEBATED_WITH
run brane edge create --from 3 --to 4 --rel CONFLICTS_WITH

run brane search "quantum"
```

### 4.3 examples/11-prose-philosophy.sh
```bash
#!/usr/bin/env bash
#
# 11-prose-philosophy.sh — modeling philosophical ideas
#
# Thinkers, ideas, influences, critiques
#

set -e
source "$(dirname "$0")/lib/common.sh"
setup_workspace

brane init > /dev/null

# ─────────────────────────────────────────────────────────────────────────────
# thinkers
# ─────────────────────────────────────────────────────────────────────────────

run brane concept create --name "Plato" --type Thinker
run brane concept create --name "Aristotle" --type Thinker
run brane concept create --name "Kant" --type Thinker
run brane concept create --name "Kastrup" --type Thinker

run brane edge create --from 2 --to 1 --rel STUDENT_OF
run brane edge create --from 3 --to 2 --rel INFLUENCED_BY

# ─────────────────────────────────────────────────────────────────────────────
# ideas
# ─────────────────────────────────────────────────────────────────────────────

run brane concept create --name "Theory of Forms" --type Idea
run brane concept create --name "Hylomorphism" --type Idea
run brane concept create --name "Transcendental Idealism" --type Idea
run brane concept create --name "Analytical Idealism" --type Idea

run brane edge create --from 1 --to 5 --rel PROPOSED
run brane edge create --from 2 --to 6 --rel PROPOSED
run brane edge create --from 3 --to 7 --rel PROPOSED
run brane edge create --from 4 --to 8 --rel PROPOSED

# ─────────────────────────────────────────────────────────────────────────────
# philosophical relationships
# ─────────────────────────────────────────────────────────────────────────────

run brane edge create --from 6 --to 5 --rel CRITIQUES
run brane edge create --from 7 --to 5 --rel SYNTHESIZES
run brane edge create --from 8 --to 7 --rel EXTENDS
run brane edge create --from 8 --to 5 --rel ECHOES

run brane search "idealism"
```

## Phase 5: Update Existing Tests

Review existing tests - they should all still pass since we're only REMOVING restrictions, not changing valid inputs.

## Phase 6: Run Full Test Suite

1. `bun run test` - all 226 + new tests pass
2. `./examples/run-all.sh` - all 12 examples pass

## Implementation Order

1. mind.ts - core change
2. handlers - remove validation
3. Add tc tests
4. Run tests (should pass)
5. CLI help text
6. Example scripts
7. Run examples
8. Full test suite

## Verification Checklist

- [ ] `brane concept create --name X --type Character` works
- [ ] `brane edge create --from 1 --to 2 --rel LOVES` works
- [ ] `brane --help` shows freeform for type/rel
- [ ] All 226 existing tests pass
- [ ] New custom type/relation tests pass
- [ ] Examples 09-11 pass
- [ ] `./examples/run-all.sh` all green
