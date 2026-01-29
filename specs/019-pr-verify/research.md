# Research: PR Verify

**Feature**: 019-pr-verify
**Date**: 2026-01-28

## Research Questions

### Q1: How to detect changed files?

**Decision**: Reuse `/body/files/status` logic

**Rationale**: The `status.ts` handler already implements file change detection:
- Compares workspace files against body.db tracked files
- Returns modified, deleted, and new files with hashes
- Handles gitignore patterns

**Alternatives Considered**:
- Git diff: Rejected - Brane is git-agnostic, tracks its own state
- File system watchers: Rejected - adds complexity, we only need point-in-time comparison

### Q2: How to execute rules?

**Decision**: Reuse `/mind/verify` logic

**Rationale**: The `verify.ts` handler already implements rule execution:
- Executes all or specified rules against mind.db
- Returns violations grouped by rule with concept details
- Handles rule errors gracefully

**Alternatives Considered**:
- Call verify as sys.call: Rejected - adds envelope overhead for internal composition
- Duplicate logic: Rejected - violates DRY

### Q3: Handler location?

**Decision**: `/calabi/pr-verify`

**Rationale**: PR verification is an integration concern (body + mind), which is Calabi's domain. The calabi namespace already has `scan` and `extract` which bridge body/mind.

**Alternatives Considered**:
- `/mind/pr-verify`: Rejected - it's not purely mind, involves body state
- `/body/pr-verify`: Rejected - it's not purely body, involves mind rules
- `/verify/pr`: Rejected - would create new namespace for single handler

### Q4: Output structure?

**Decision**: Combine changes context with verification result

```typescript
interface PrVerifyResult {
  passed:  boolean
  changes: {
    modified: { url: string; old_hash: string; new_hash: string }[]
    deleted:  { url: string }[]
    new:      { path: string }[]
    summary:  { modified: number; deleted: number; new: number; clean: boolean }
  }
  verification: {
    summary: { rules_passed: number; rules_failed: number; total_violations: number }
    rules:   { name: string; passed: boolean; violations: { id: number; name: string }[]; error: string | null }[]
  } | null  // null in dry_run mode
  dry_run?: boolean
}
```

**Rationale**:
- `passed` is the top-level outcome for CI/CD
- `changes` provides context (what files changed)
- `verification` contains rule results (mirrors verify output)
- Separation allows users to understand both aspects

### Q5: Code reuse strategy?

**Decision**: Import and call internal functions directly

**Rationale**:
- Extract reusable logic from `status.ts` into shared module if needed
- Call verify's internal execution directly (not via sys.call)
- Constitution Principle III: sys.call is public API only, internal code uses normal function calls

**Implementation Notes**:
- May need to extract `get_file_changes()` from status.ts or inline the logic
- Verify logic can be imported from verify.ts module
- Keep pr-verify handler thin - just orchestration

## Technical Decisions Summary

| Decision | Choice | Reason |
|----------|--------|--------|
| File change detection | Reuse status.ts patterns | Already proven, handles edge cases |
| Rule execution | Reuse verify.ts internals | Already proven, handles errors |
| Handler location | /calabi/pr-verify | Calabi = body+mind integration |
| Output structure | Combined changes + verification | Clear separation, CI-friendly top-level |
| Code reuse | Direct function calls | Per constitution, no sys.call internally |
