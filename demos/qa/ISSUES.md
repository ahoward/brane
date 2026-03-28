# QA Issues Found

Issues discovered by Gemini-reviewed QA demos (2026-03-28).

## Bugs Fixed

### annotation create/list CLI passes wrong param name
- **File**: `src/cli/commands/annotation.ts`
- **Bug**: CLI passed `concept_id` but handler expects `target`
- **Impact**: `brane annotation create` and `brane annotation list --concept` were broken
- **Fix**: Changed `concept_id` to `target` in CLI params

## Issues to Address

### 1. CLI error responses are not always JSON
- **Severity**: Medium
- **What**: Some CLI commands (edge create with non-existent concept, graph neighbors with non-existent concept) exit non-zero with plain text errors instead of structured JSON error envelopes
- **Where**: `src/cli/commands/edge.ts`, `src/cli/commands/graph.ts`
- **Impact**: MCP and programmatic consumers can't reliably parse errors
- **Fix**: Ensure all CLI commands return JSON error envelopes when `--json` is specified

### 2. No CLI for lens prompt list/delete
- **Severity**: Low
- **What**: `lens prompt set`, `lens on`, `lens off`, `lens prompt <name>` (get) exist, but there's no way to list all prompts or delete a prompt from the CLI
- **Where**: `src/cli/commands/lens.ts`
- **Impact**: Users can only manage prompts through MCP or the REPL
- **Fix**: Add `lens prompt list` and `lens prompt delete <name>` subcommands

### 3. Mock embeddings don't test semantic similarity
- **Severity**: Low (test-only)
- **What**: Mock embeddings return deterministic vectors that make ALL concepts match search queries equally. Recall/search tests can't verify ranking quality.
- **Where**: `src/lib/embed/mock.ts`
- **Impact**: Search bugs won't be caught by mock-mode tests
- **Mitigations**: Live E2E tests with real embeddings (separate suite)

### 4. Concept create is a silent upsert
- **Severity**: Informational
- **What**: Creating a concept with a name that already exists returns success with the existing ID (CozoDB put semantics). No indication that it was an update, not a create.
- **Where**: `src/handlers/mind/concepts/create.ts`
- **Impact**: Users may not realize they're overwriting an existing concept
- **Possible fix**: Return `created: false, existing: true` in the result when upserting

### 5. Cascading deletes not verified
- **Severity**: Medium
- **What**: Deleting a concept doesn't seem to clean up associated edges, annotations, or provenance links
- **Where**: `src/handlers/mind/concepts/delete.ts`
- **Impact**: Orphaned edges pointing to deleted concepts could cause graph corruption
- **Fix**: Either cascade deletes or error when deleting a concept with edges

### 6. No update/modify operations tested
- **Severity**: Low
- **What**: Concept update and edge update exist as handlers but aren't exercised by any demo
- **Where**: Demo coverage gap
- **Fix**: Add update tests to demo 03

### 7. graph summary vs status use different field names
- **Severity**: Informational
- **What**: `status --json` uses `total_concepts`/`total_edges`, `graph summary --json` uses `concepts.total`/`edges.total`
- **Impact**: Inconsistency for consumers; easy to use wrong field name
- **Fix**: Normalize field names or document the difference

### 8. verify result doesn't include `valid` field
- **Severity**: Low
- **What**: `verify --json` returns success but `.result.valid` is undefined (null). The verify result doesn't explicitly include a `valid: true/false` field.
- **Where**: `src/handlers/mind/verify.ts`
- **Impact**: Programmatic consumers can't distinguish "verified OK" from "nothing to verify"
