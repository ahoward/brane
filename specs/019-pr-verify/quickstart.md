# Quickstart: PR Verify

**Feature**: 019-pr-verify
**Date**: 2026-01-28

## Prerequisites

1. Brane initialized: `bun run src/cli.ts /body/init`
2. Mind initialized: `bun run src/cli.ts /mind/init`
3. Files tracked: `bun run src/cli.ts /body/scan`
4. Concepts extracted: `bun run src/cli.ts /calabi/scan`

## Basic Usage

### Verify Current Workspace

```bash
# Check if workspace changes pass all rules
echo '{}' | bun run src/cli.ts /calabi/pr-verify

# Returns:
# {
#   "status": "success",
#   "result": {
#     "passed": true,
#     "changes": { ... },
#     "verification": { ... }
#   }
# }
```

### Check Exit Code for CI/CD

```bash
# In a pre-commit hook or CI pipeline
if echo '{}' | bun run src/cli.ts /calabi/pr-verify > /dev/null 2>&1; then
  echo "✓ PR verification passed"
else
  echo "✗ PR verification failed"
  exit 1
fi
```

### Dry Run (Preview Scope)

```bash
# See what would be checked without running rules
echo '{"dry_run": true}' | bun run src/cli.ts /calabi/pr-verify

# Shows changed files and rules that would run
```

### Verify Specific Rules Only

```bash
# Only check for cycles
echo '{"rules": ["cycles"]}' | bun run src/cli.ts /calabi/pr-verify

# Check cycles and orphans
echo '{"rules": ["cycles", "orphans"]}' | bun run src/cli.ts /calabi/pr-verify
```

### Filter by Path

```bash
# Only consider changes in src/
echo '{"path": "src/"}' | bun run src/cli.ts /calabi/pr-verify
```

## Integration Scenarios

### Scenario 1: Pre-Commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Run calabi/scan to update mind.db with any new extractions
echo '{}' | bun run src/cli.ts /calabi/scan > /dev/null 2>&1

# Verify changes pass rules
if ! echo '{}' | bun run src/cli.ts /calabi/pr-verify > /tmp/pr-verify.json 2>&1; then
  echo "PR verification failed:"
  cat /tmp/pr-verify.json | jq '.result.verification.rules[] | select(.passed == false)'
  exit 1
fi

echo "PR verification passed"
```

### Scenario 2: CI Pipeline Check

```yaml
# GitHub Actions example
- name: Verify PR
  run: |
    result=$(echo '{}' | bun run src/cli.ts /calabi/pr-verify)
    passed=$(echo "$result" | jq -r '.result.passed')
    if [ "$passed" != "true" ]; then
      echo "::error::PR verification failed"
      echo "$result" | jq '.result.verification.rules[] | select(.passed == false)'
      exit 1
    fi
```

### Scenario 3: Check Specific Files Changed

```bash
# Verify only if changes are in critical areas
echo '{"path": "src/lib/"}' | bun run src/cli.ts /calabi/pr-verify
```

## Test Scenarios

### TC-01: No Violations

**Setup**: Clean graph with no rule violations
**Input**: `{}`
**Expected**: `passed: true`, `verification.summary.rules_failed: 0`

### TC-02: With Violations

**Setup**: Graph with orphan concepts
**Input**: `{}`
**Expected**: `passed: false`, orphans rule shows violations

### TC-03: No Changes (Clean Workspace)

**Setup**: Workspace matches body.db exactly
**Input**: `{}`
**Expected**: `changes.summary.clean: true`, verification still runs

### TC-04: Specific Rules

**Setup**: Graph with both cycles and orphans
**Input**: `{"rules": ["cycles"]}`
**Expected**: Only cycles rule in output

### TC-05: Dry Run

**Setup**: Any state
**Input**: `{"dry_run": true}`
**Expected**: `verification: null`, `dry_run: true`

### TC-06: Body Not Initialized

**Setup**: No .brane/body.db
**Input**: `{}`
**Expected**: Error with code "not_initialized"

### TC-07: Mind Not Initialized

**Setup**: body.db exists, no mind.db
**Input**: `{}`
**Expected**: Error with code "not_initialized"

### TC-08: Rule Not Found

**Setup**: Initialized
**Input**: `{"rules": ["nonexistent"]}`
**Expected**: Error with code "not_found"
