# 025-lens-config

## Problem

With 024-prose-support, Brane now accepts freeform concept types and edge relations. This is powerful but creates new problems:

1. **No schema guidance** — Users must invent their own ontology from scratch
2. **Typo fragmentation** — `DEPENDS_ON` vs `depends_on` vs `DependsOn` creates parallel universes
3. **Built-in rules break** — `cycles` rule only finds `DEPENDS_ON`, not user variants
4. **No shareability** — Two people analyzing "child safety" can't get consistent results
5. **No consolidation** — Document analysis might suggest "Character" while the user prefers "Person"

The goal: **Lenses** — shareable, seedable ontology configurations that guide (not constrain) the knowledge graph.

## Vision

A lens is a curated starting point that defines:
- **Golden concepts** — Preferred concept types with descriptions
- **Golden relations** — Preferred edge relations with semantics
- **Golden rules** — Datalog rules that operate on the golden schema
- **Consolidation hints** — How to map detected concepts to golden ones

Two security researchers running the same lens against the same codebase should get the same (or very similar) verification results.

## Use Cases

### 1. Code Analysis Lens
```yaml
# .brane/lens.yml
name: code-analysis
version: 1.0.0

concepts:
  - type: Entity
    description: A code component (service, module, class)
  - type: File
    description: A source file in the repository
  - type: Rule
    description: A governance rule that must be satisfied

relations:
  - rel: DEPENDS_ON
    description: Source requires target to function
    symmetric: false
  - rel: DEFINED_IN
    description: Concept is defined in a file
    symmetric: false
  - rel: CONFLICTS_WITH
    description: Mutual exclusion constraint
    symmetric: true

rules:
  - name: cycles
    builtin: true
  - name: orphans
    builtin: true
```

### 2. Child Safety Verification Lens
```yaml
name: child-safety-audit
version: 1.0.0

concepts:
  - type: DataFlow
    description: Movement of data through the system
  - type: UserInput
    description: Any input from users
  - type: AgeGate
    description: Age verification mechanism
  - type: ContentFilter
    description: Content moderation component
  - type: MinorData
    description: Data that could identify minors

relations:
  - rel: FLOWS_TO
    description: Data flows from source to target
  - rel: PROTECTED_BY
    description: Data is protected by a safety mechanism
  - rel: BYPASSES
    description: Path that circumvents a protection

rules:
  - name: unprotected-minor-data
    description: Minor data must flow through age gate or content filter
    body: |
      ?[id, name] :=
        *concepts[id, name, "MinorData", _],
        *edges[_, id, target, "FLOWS_TO", _],
        not *edges[_, id, _, "PROTECTED_BY", _]
```

### 3. Novel Structure Lens
```yaml
name: novel-structure
version: 1.0.0

concepts:
  - type: Character
    description: A person in the narrative
  - type: Location
    description: A place where scenes occur
  - type: Theme
    description: A recurring idea or motif
  - type: Chapter
    description: A structural division
  - type: Scene
    description: A unit of action

relations:
  - rel: APPEARS_IN
    description: Character appears in scene/chapter
  - rel: LOCATED_AT
    description: Scene takes place at location
  - rel: EMBODIES
    description: Character embodies a theme
  - rel: FORESHADOWS
    description: Earlier element hints at later one

consolidation:
  # Map detected types to golden types
  Person: Character
  Protagonist: Character
  Antagonist: Character
  Place: Location
  Setting: Location
```

## Core Concepts

### Golden vs Detected

| Property | Golden | Detected |
|----------|--------|----------|
| Source | Lens config | Document analysis / user input |
| Authority | High (preferred) | Low (suggestive) |
| Persistence | Survives re-analysis | May be replaced |
| Consolidation | Target | Source |

Golden concepts/relations are like manual annotations — they have precedence. Detected ones are suggestions that should consolidate toward golden when applicable.

### Consolidation

When document analysis detects a concept type "Protagonist", and the lens defines "Character" as golden with consolidation hint `Protagonist: Character`, the system should:

1. **Suggest** consolidation to the user
2. **Auto-consolidate** in strict mode
3. **Preserve both** in permissive mode (with link)

### Lens Inheritance

Lenses can extend other lenses:
```yaml
name: child-safety-audit-strict
extends: child-safety-audit
version: 1.0.0

# Additional rules for strict mode
rules:
  - name: no-direct-minor-contact
    description: No direct messaging to accounts without age verification
    body: |
      ?[id, name] := ...
```

### Shareable Verification

The killer feature: **reproducible verification**.

```bash
# Alice creates a lens for COPPA compliance
brane lens export coppa-v1.yml

# Bob imports and runs against his codebase
brane lens import coppa-v1.yml
brane verify

# Both get consistent results if their codebases have similar structure
```

## CLI Interface

### Lens Management
```bash
# Initialize with a lens (or use default)
brane init --lens code-analysis
brane init --lens ./custom-lens.yml
brane init  # uses built-in default lens

# View current lens
brane lens show

# Export lens (golden concepts, relations, rules)
brane lens export > my-lens.yml

# Import lens (merges or replaces)
brane lens import other-lens.yml
brane lens import other-lens.yml --replace

# List available built-in lenses
brane lens list
```

### Consolidation
```bash
# Show consolidation suggestions
brane consolidate --dry-run

# Apply consolidation (map detected → golden)
brane consolidate

# Interactive consolidation
brane consolidate -i
```

### Verification with Lens
```bash
# Verify using lens rules
brane verify

# Verify specific lens rules
brane verify --rules child-safety

# Compare two codebases with same lens
brane verify --compare /path/to/other/.brane
```

## Data Model

### New Relations in mind.db

```
# Lens metadata
:create lens_meta {
  key: String,
  value: String
}

# Golden concept types (from lens)
:create golden_types {
  type: String =>
  description: String,
  authority: String  # "lens" or "manual"
}

# Golden edge relations (from lens)
:create golden_relations {
  rel: String =>
  description: String,
  symmetric: Bool,
  authority: String
}

# Consolidation mappings
:create consolidation_map {
  source_type: String,
  target_type: String  # must exist in golden_types
}
```

### Lens File Format

```yaml
# .brane/lens.yml or standalone .yml file
name: string           # required, kebab-case
version: string        # semver
extends: string?       # optional parent lens name
description: string?

concepts:
  - type: string       # the golden type name
    description: string

relations:
  - rel: string        # the golden relation name
    description: string
    symmetric: bool?   # default false

rules:
  - name: string
    builtin: bool?     # if true, uses built-in implementation
    description: string?
    body: string?      # Datalog query (required if not builtin)

consolidation:
  # source_type: target_type
  DetectedType: GoldenType
```

## API Endpoints

### `/lens/show`
Returns current lens configuration.

### `/lens/import`
```json
{
  "path": "./lens.yml",
  "mode": "merge" | "replace"
}
```

### `/lens/export`
Returns lens as YAML string.

### `/consolidate/suggest`
Returns suggested consolidations based on current graph and lens.

### `/consolidate/apply`
```json
{
  "mappings": [
    { "source": "Protagonist", "target": "Character" }
  ]
}
```

## Implementation Phases

### Phase 1: Lens Storage
- New relations in mind.db schema
- `/lens/import` and `/lens/export` handlers
- `brane lens` CLI commands

### Phase 2: Golden Precedence
- Modify concept/edge creation to check golden types
- Warning (not error) when using non-golden type
- `--strict` flag to enforce golden-only

### Phase 3: Consolidation
- `/consolidate/suggest` with fuzzy matching
- `/consolidate/apply` to remap concepts
- Interactive CLI mode

### Phase 4: Shareable Verification
- Lens file includes rules
- `brane verify` uses lens rules by default
- Deterministic output for same lens + same graph

## Built-in Lenses

Ship with these lenses:

1. **default** — Current behavior (Entity, Caveat, Rule + DEPENDS_ON, etc.)
2. **code-analysis** — Software architecture focus
3. **prose** — Creative writing (Character, Theme, etc.)
4. **research** — Academic (Paper, Theory, Study, etc.)

## Non-Goals (This Spec)

- LLM-powered consolidation suggestions (future: Calabi integration)
- Lens marketplace / sharing platform
- Automatic lens inference from documents
- Version control for lenses (just use git)

## Success Criteria

1. `brane init --lens code-analysis` creates graph with golden types seeded
2. `brane lens show` displays current lens configuration
3. `brane lens export > lens.yml` produces valid, re-importable YAML
4. Non-golden types show warning (not error) on creation
5. `brane consolidate --dry-run` shows mapping suggestions
6. Two users with same lens get same `brane verify` output on same code

## Open Questions

1. **Consolidation granularity** — Type-level only, or instance-level too?
2. **Lens versioning** — How to handle lens upgrades on existing graphs?
3. **Rule parameterization** — Should rules accept parameters from lens config?
4. **Authority levels** — Binary (golden/detected) or graduated (lens < manual < locked)?

---

## References

- Disco system: Audience-based lenses for consistent multi-perspective analysis
- RO project: Hierarchical config with "deeper wins" precedence
- syntheticecho/pilots: `rids.yaml` as canonical registry, `seeds/` for golden concepts
- Brane annotations: `authority: infinity` pattern for manual precedence
