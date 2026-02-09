# Quickstart: 025-lens-config

## Overview

Lenses are shareable ontology configurations that define golden concept types, edge relations, and consolidation rules. Usage is silently tracked to surface candidates for blessing.

## Basic Usage

### View Current Lens

```bash
$ brane lens show

Name: default
Version: 1.0.0
Description: Default lens for code analysis

Golden Types:
  Entity    A code component (service, module, class)
  Caveat    A constraint or warning about code behavior
  Rule      A governance rule for verification

Golden Relations:
  DEPENDS_ON      Source requires target to function
  CONFLICTS_WITH  Mutual exclusion constraint (symmetric)
  DEFINED_IN      Concept is defined in a file
```

### Import a Custom Lens

Create `my-lens.yml`:

```yaml
name: novel-structure
version: 1.0.0
description: Lens for modeling novel structures

concepts:
  - type: Character
    description: A person in the narrative
  - type: Location
    description: A place where scenes occur
  - type: Theme
    description: A recurring idea or motif

relations:
  - rel: APPEARS_IN
    description: Character appears in scene/chapter
  - rel: LOVES
    description: Romantic or familial affection
    symmetric: true
  - rel: FORESHADOWS
    description: Earlier element hints at later one

consolidation:
  Person: Character
  Protagonist: Character
  Place: Location
```

Import it:

```bash
$ brane lens import my-lens.yml

Imported lens: novel-structure v1.0.0
  Concepts: 3
  Relations: 3
  Consolidation rules: 3
```

### Export Current Lens

```bash
$ brane lens export > exported-lens.yml
```

### View Usage Statistics

After creating some concepts and edges:

```bash
$ brane lens stats

TYPE           COUNT  GOLDEN  FIRST SEEN            LAST SEEN
Character      18     yes     2026-01-20T14:00:00Z  2026-01-31T08:00:00Z
Hero           5      no      2026-01-25T10:00:00Z  2026-01-30T15:00:00Z
Location       12     yes     2026-01-20T14:30:00Z  2026-01-31T07:00:00Z

RELATION       COUNT  GOLDEN  FIRST SEEN            LAST SEEN
LOVES          7      yes     2026-01-21T09:00:00Z  2026-01-31T06:00:00Z
BETRAYS        3      no      2026-01-28T11:00:00Z  2026-01-30T16:00:00Z
APPEARS_IN     25     yes     2026-01-20T15:00:00Z  2026-01-31T08:00:00Z
```

### Filter to Candidates Only

```bash
$ brane lens stats --candidates

TYPE           COUNT  FIRST SEEN            LAST SEEN
Hero           5      2026-01-25T10:00:00Z  2026-01-30T15:00:00Z

RELATION       COUNT  FIRST SEEN            LAST SEEN
BETRAYS        3      2026-01-28T11:00:00Z  2026-01-30T16:00:00Z
```

### Bless a Candidate as Golden

```bash
$ brane lens bless --type Hero --description "A protagonist or heroic character"

Blessed type: Hero
Description: A protagonist or heroic character
Authority: manual

$ brane lens bless --rel BETRAYS --description "Character betrays another" --symmetric

Blessed relation: BETRAYS
Description: Character betrays another
Symmetric: yes
Authority: manual
```

## Workflow Example

1. **Start with default lens**
   ```bash
   brane init  # Creates default lens
   ```

2. **Create concepts (usage tracked silently)**
   ```bash
   brane concept create --name "Hamlet" --type Character
   brane concept create --name "Claudius" --type Villain
   brane edge create --from 1 --to 2 --rel HATES
   ```

3. **Check what's being used**
   ```bash
   brane lens stats --candidates
   # Shows: Villain (not golden), HATES (not golden)
   ```

4. **Bless frequently-used types**
   ```bash
   brane lens bless --type Villain --description "An antagonist"
   brane lens bless --rel HATES --description "Strong negative emotion"
   ```

5. **Export and share**
   ```bash
   brane lens export > team-lens.yml
   # Share with teammates
   ```

6. **Teammate imports**
   ```bash
   brane lens import team-lens.yml
   # Now both have same golden types
   ```

## JSON Output

All commands support `--json` flag:

```bash
$ brane lens stats --json

{
  "status": "success",
  "result": {
    "types": [...],
    "relations": [...]
  },
  "errors": null,
  "meta": {...}
}
```
