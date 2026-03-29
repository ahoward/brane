# QA Issues Found

Issues discovered by Gemini-reviewed QA demos (2026-03-28).

## Bugs Fixed

### annotation create/list CLI passes wrong param name
- **File**: `src/cli/commands/annotation.ts`
- **Bug**: CLI passed `concept_id` but handler expects `target`
- **Impact**: `brane annotation create` and `brane annotation list --concept` were broken
- **Fix**: Changed `concept_id` to `target` in CLI params

## Issues Fixed (GitHub #93–#98)

### #93 — CLI error responses are not always JSON ✅
- **Where**: `src/cli/commands/edge.ts`, `graph.ts`, `memory.ts`, `loop.ts`
- **Fix**: Added `cli_error()` helper, all CLI validation errors now return JSON envelopes

### #94 — No CLI for lens prompt list/delete ✅
- **Where**: `src/cli/commands/lens.ts`
- **Fix**: Added `lens prompts` subcommand and `--delete` flag on `lens prompt`

### #95 — Concept create is a silent upsert ✅
- **Where**: `src/handlers/mind/concepts/create.ts`
- **Fix**: Exact name match check returns `matched_existing: true, match_type: "exact"`

### #96 — Cascading deletes not verified ✅
- **Where**: `src/handlers/mind/concepts/delete.ts`
- **Fix**: Cascade deletes edges, annotations, provenance; returns counts in `cascade` object

### #97 — graph summary vs status use different field names ✅
- **Where**: `src/handlers/graph/summary.ts`
- **Fix**: Added flat `total_concepts`/`total_edges` aliases alongside structured fields

### #98 — verify result doesn't include `valid` field ✅
- **Where**: QA demo used wrong field name (`.result.valid` → `.result.passed`)
- **Fix**: Updated demo; handler already returns `passed: boolean` correctly

## Remaining (Won't Fix / Tracked Separately)

### Mock embeddings don't test semantic similarity
- **Severity**: Low (test-only)
- **Mitigation**: Live E2E tests with real embeddings (separate suite)

### No update/modify operations tested
- **Severity**: Low (demo coverage gap)
- **Mitigation**: Future demo expansion
