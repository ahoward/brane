# Quickstart: Define Datalog Rules

**Feature**: 016-rules-define

## Overview

The rules system enables graph integrity checks using Datalog queries. Two built-in rules detect common issues (cycles and orphans), and custom rules can be defined for project-specific checks.

## Prerequisites

- Brane initialized (`brane init`)
- Mind initialized (`brane /mind/init`)
- Some concepts and edges in the graph (for meaningful queries)

## Quick Examples

### Check for Circular Dependencies

```bash
# Run the built-in cycles rule
brane /mind/rules/query '{"name": "cycles"}'

# Result (if cycles exist)
{
  "status": "success",
  "result": {
    "rule": "cycles",
    "matches": [
      {"id": 1, "name": "AuthService"},
      {"id": 2, "name": "UserService"}
    ],
    "count": 2
  }
}
```

### Check for Orphaned Concepts

```bash
# Run the built-in orphans rule
brane /mind/rules/query '{"name": "orphans"}'

# Result (if orphans exist)
{
  "status": "success",
  "result": {
    "rule": "orphans",
    "matches": [
      {"id": 42, "name": "UnusedHelper"}
    ],
    "count": 1
  }
}
```

### List All Available Rules

```bash
brane /mind/rules/list '{}'

# Result
{
  "status": "success",
  "result": {
    "rules": [
      {"name": "cycles", "description": "Detects circular dependencies", "builtin": true},
      {"name": "orphans", "description": "Detects disconnected concepts", "builtin": true}
    ],
    "count": 2
  }
}
```

### Create a Custom Rule

```bash
# Define a rule that finds high-dependency concepts (more than 3 dependents)
brane /mind/rules/create '{
  "name": "high_dependency",
  "description": "Concepts with more than 3 things depending on them",
  "body": "high_dependency[id, name, count] := *concepts[id, name, _], count = count(dep_id : *edges[_, dep_id, id, \"DEPENDS_ON\", _]), count > 3"
}'
```

### Delete a Custom Rule

```bash
brane /mind/rules/delete '{"name": "high_dependency"}'
```

## Common Workflows

### Pre-commit Check

Run all integrity rules before committing:

```bash
# Check for cycles (should return empty)
brane /mind/rules/query '{"name": "cycles"}'

# Check for orphans (review if unexpected)
brane /mind/rules/query '{"name": "orphans"}'
```

### Custom Governance Rule

Define a rule for your project's specific constraints:

```bash
# Example: Find concepts that CONFLICT_WITH deprecated concepts
brane /mind/rules/create '{
  "name": "conflicts_with_deprecated",
  "description": "Concepts conflicting with deprecated items",
  "body": "conflicts_with_deprecated[id, name] := *concepts[id, name, _], *edges[_, id, dep_id, \"CONFLICTS_WITH\", _], *concepts[dep_id, _, \"Caveat\"]"
}'
```

## Error Handling

### Invalid Datalog Syntax

```bash
brane /mind/rules/create '{"name": "bad", "description": "test", "body": "invalid syntax here"}'

# Result
{
  "status": "error",
  "result": null,
  "errors": {
    "body": [{"code": "invalid_syntax", "message": "Datalog parse error: ..."}]
  }
}
```

### Cannot Delete Built-in Rules

```bash
brane /mind/rules/delete '{"name": "cycles"}'

# Result
{
  "status": "error",
  "result": null,
  "errors": {
    "name": [{"code": "protected", "message": "cannot delete built-in rule"}]
  }
}
```

## Next Steps

- See [API Contract](./contracts/mind-rules.md) for full endpoint documentation
- See [Data Model](./data-model.md) for schema details
- The upcoming `brane verify` command will run all rules automatically
