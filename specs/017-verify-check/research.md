# Research: Verify Check

**Feature**: 017-verify-check
**Date**: 2026-01-28

## Overview

This feature builds directly on 016-rules-define. No significant research needed—all infrastructure exists.

## Decision 1: Result Structure

**Decision**: Return a structured result with summary statistics and per-rule results.

**Rationale**: 
- Summary statistics (rules_passed, rules_failed, total_violations) allow quick assessment
- Per-rule breakdown enables detailed analysis
- Follows existing Brane patterns from /mind/rules/query

**Alternatives Considered**:
- Flat list of all violations: Rejected—loses rule attribution
- Separate summary endpoint: Rejected—unnecessary complexity (YAGNI)

**Result Structure**:
```typescript
{
  passed: boolean,
  summary: {
    rules_passed: number,
    rules_failed: number,
    total_violations: number
  },
  rules: [
    {
      name: string,
      passed: boolean,
      violations: [{id: number, name: string}],
      error: string | null  // if rule execution failed
    }
  ]
}
```

## Decision 2: Rule Selection

**Decision**: Accept optional `rules` array parameter. If empty/omitted, run all rules.

**Rationale**:
- Simple parameter: `{"rules": ["cycles"]}` or `{}`
- Matches existing pattern from /mind/rules/query
- No separate endpoint needed for selective execution

**Alternatives Considered**:
- Separate endpoints `/mind/verify` and `/mind/verify/rule/{name}`: Rejected—unnecessary complexity
- Filter parameter with regex: Rejected—overkill for typical use case

## Decision 3: Exit Code Handling

**Decision**: CLI layer (cli.ts) handles exit codes based on result.passed boolean.

**Rationale**:
- Handler returns standard Result envelope
- cli.ts already handles exit codes for errors
- Add check: if result.passed === false, exit(1)

**Implementation**:
```typescript
// In cli.ts after calling handler
if (result.status === "success" && result.result?.passed === false) {
  process.exit(1)  // Violations found
}
```

## Decision 4: Error Handling During Rule Execution

**Decision**: Continue executing remaining rules if one fails. Report error in that rule's result.

**Rationale**:
- Don't let one bad custom rule break the entire verify
- User can see which rules succeeded and which failed
- Follows resilient design principle

**Implementation**:
- Wrap each rule execution in try/catch
- On error: set `rule.passed = false`, `rule.error = message`, `rule.violations = []`
- Continue to next rule

## Decision 5: No Rules Defined

**Decision**: Return success with empty rules array if no rules exist.

**Rationale**:
- Not an error condition—just nothing to verify
- Summary shows 0 passed, 0 failed, 0 violations
- Matches Unix philosophy: no news is good news

## Dependencies

- `/mind/rules/list` - Get all defined rules
- `/mind/rules/query` - Execute individual rules (internal function, not sys.call)
- Existing `open_mind()` and `is_mind_error()` from lib/mind.ts

## No Further Research Needed

All technical decisions are straightforward applications of existing patterns.
