# Quickstart: Verify Check

**Feature**: 017-verify-check

## Overview

The verify command runs all defined rules against your knowledge graph and reports any violations. Use it for pre-commit checks, CI/CD pipelines, or periodic graph health assessment.

## Prerequisites

- Brane initialized (`brane init`)
- Mind initialized (`brane /mind/init`)
- Some concepts and edges in the graph

## Quick Examples

### Run All Rules

```bash
# Check graph health with all rules
brane /mind/verify '{}'

# Result (healthy graph)
{
  "status": "success",
  "result": {
    "passed": true,
    "summary": {
      "rules_passed": 2,
      "rules_failed": 0,
      "total_violations": 0
    },
    "rules": [
      {"name": "cycles", "passed": true, "violations": [], "error": null},
      {"name": "orphans", "passed": true, "violations": [], "error": null}
    ]
  }
}
```

### Check for Violations

```bash
# Graph with problems
brane /mind/verify '{}'

# Result (violations found)
{
  "status": "success",
  "result": {
    "passed": false,
    "summary": {
      "rules_passed": 1,
      "rules_failed": 1,
      "total_violations": 3
    },
    "rules": [
      {
        "name": "cycles",
        "passed": false,
        "violations": [
          {"id": 1, "name": "AuthService"},
          {"id": 2, "name": "UserService"}
        ],
        "error": null
      },
      {"name": "orphans", "passed": true, "violations": [], "error": null}
    ]
  }
}
```

### Run Specific Rules

```bash
# Check only for cycles
brane /mind/verify '{"rules": ["cycles"]}'

# Check multiple specific rules
brane /mind/verify '{"rules": ["cycles", "orphans"]}'
```

## Common Workflows

### Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

brane /mind/verify '{}'
exit_code=$?

if [ $exit_code -ne 0 ]; then
  echo "Graph verification failed. Fix violations before committing."
  exit 1
fi
```

### CI/CD Pipeline

```yaml
# GitHub Actions example
- name: Verify Knowledge Graph
  run: |
    brane /mind/verify '{}'
    # Exit code 0 = passed, 1 = violations found
```

### Periodic Health Check

```bash
# Run in cron or scheduled job
brane /mind/verify '{}' > /var/log/brane-verify.json 2>&1
if [ $? -ne 0 ]; then
  # Alert or notify
  send-alert "Knowledge graph has violations"
fi
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All rules passed (no violations) |
| 1 | Violations found or error occurred |

## Error Handling

### Mind Not Initialized

```bash
brane /mind/verify '{}'

# Result
{
  "status": "error",
  "errors": {
    "mind": [{"code": "not_initialized", "message": "mind not initialized (run brane mind init)"}]
  }
}
```

### Rule Not Found

```bash
brane /mind/verify '{"rules": ["nonexistent"]}'

# Result
{
  "status": "error",
  "errors": {
    "rules": [{"code": "not_found", "message": "rule not found: nonexistent"}]
  }
}
```

## Next Steps

- See [API Contract](./contracts/mind-verify.md) for full endpoint documentation
- See [Data Model](./data-model.md) for result structure details
- Create custom rules with `/mind/rules/create` for project-specific checks
