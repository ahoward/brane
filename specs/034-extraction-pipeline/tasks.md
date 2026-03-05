# Tasks: Extraction Pipeline

**Input**: Design documents from `/specs/034-extraction-pipeline/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: tc test suites included (brane uses antagonistic testing per constitution).

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Install dependencies, create foundational AST library, register handlers

- [ ] T001 Add `web-tree-sitter@0.25.3` and `tree-sitter-wasms@0.1.13` dependencies via `bun add`
- [ ] T002 Create AST grammar loader at `src/lib/ast/grammars.ts` — singleton parser init, lazy WASM language loading (pattern from bunny's `map.ts`)
- [ ] T003 [P] Create AST node helpers at `src/lib/ast/helpers.ts` — `node_text`, `first_named_child_of_type`, `named_children_of_type`
- [ ] T004 [P] Create AST types at `src/lib/ast/types.ts` — `ASTSymbol`, `FileAST`, `Sentinel`, `CoverageReport` interfaces

---

## Phase 2: Foundational

**Purpose**: TypeScript extractor and handler skeleton — blocks all user stories

- [ ] T005 Create TypeScript/JavaScript extractor at `src/lib/ast/extractors/typescript.ts` — extract imports, classes, interfaces, type aliases, functions, constants, methods (port from bunny's `extract_typescript`)
- [ ] T006 Create AST parse facade at `src/lib/ast/parse.ts` — `parse_file(content, language)` → `FileAST`, delegates to per-language extractors
- [ ] T007 Create sentinel generator at `src/lib/ast/sentinels.ts` — `generate_sentinels(file_ast)` → `Sentinel[]` from imports + class/interface/type names
- [ ] T008 Create coverage calculator at `src/lib/coverage.ts` — `compute_coverage(sentinels, concept_names)` → `CoverageReport`
- [ ] T009 Create handler skeleton at `src/handlers/calabi/extract-ast.ts` — accepts `{file_url, content, language?}`, returns `FileAST` + sentinels
- [ ] T010 Register `/calabi/extract-ast` handler in `src/index.ts`

**Checkpoint**: AST extraction works as a standalone handler. Ready for test suites.

---

## Phase 3: User Story 1 — AST-Based Code Extraction (Priority: P1) MVP

**Goal**: Mechanically parse source files to extract structural facts without LLM involvement.

**Independent Test**: Ingest `corpus/code/panopticon.ts` with `--ast-only`, verify graph contains every import, class, interface, method.

### Tests for User Story 1

- [ ] T011 [P] [US1] Create test runner `tests/calabi/extract-ast/run` with workspace setup
- [ ] T012 [P] [US1] Create test case `tests/calabi/extract-ast/data/00-success-typescript/` — parse panopticon.ts, verify imports, classes, interfaces, methods extracted
- [ ] T013 [P] [US1] Create test case `tests/calabi/extract-ast/data/01-success-javascript/` — parse a .js file, verify extraction works
- [ ] T014 [P] [US1] Create test case `tests/calabi/extract-ast/data/02-success-empty-file/` — empty file returns empty symbols/imports
- [ ] T015 [P] [US1] Create test case `tests/calabi/extract-ast/data/03-success-unsupported-language/` — .md file returns null language, empty symbols
- [ ] T016 [P] [US1] Create test case `tests/calabi/extract-ast/data/04-success-no-exports/` — file with only imports, no exports

### Implementation for User Story 1

- [ ] T017 [US1] Implement full TypeScript extractor in `src/lib/ast/extractors/typescript.ts` — handle all node types: import_statement, export_statement, class_declaration, interface_declaration, type_alias_declaration, function_declaration, lexical_declaration
- [ ] T018 [US1] Implement `/calabi/extract-ast` handler in `src/handlers/calabi/extract-ast.ts` — read file content, detect language, parse AST, generate sentinels
- [ ] T019 [US1] Write whitebox spike `try/extract-ast.sh` — parse corpus/code/panopticon.ts via `/calabi/extract-ast`, verify output

**Checkpoint**: US1 tests pass. AST extraction works standalone.

---

## Phase 4: User Story 2 — Sentinel Checks (Priority: P1)

**Goal**: Generate mandatory concepts from AST, validate against merged graph, report gaps.

**Independent Test**: Parse a file with AST, create concepts from LLM mock (missing some), run sentinel validation, verify gaps reported.

### Tests for User Story 2

- [ ] T020 [P] [US2] Create test case `tests/calabi/extract-ast/data/05-success-sentinels/` — verify sentinel list matches imports + class/interface/type names
- [ ] T021 [P] [US2] Create test case `tests/calabi/extract-ast/data/06-success-sentinel-all-matched/` — all sentinels present in concept list → 100% coverage
- [ ] T022 [P] [US2] Create test case `tests/calabi/extract-ast/data/07-success-sentinel-gaps/` — 2 of 5 sentinels missing → 60% coverage with missing list

### Implementation for User Story 2

- [ ] T023 [US2] Implement sentinel generation in `src/lib/ast/sentinels.ts` — extract sentinel names from imports (named bindings), classes, interfaces, types
- [ ] T024 [US2] Implement coverage validation in `src/lib/coverage.ts` — match sentinel names against concept names (case-insensitive), compute percentage, list gaps
- [ ] T025 [US2] Wire sentinel + coverage into `/calabi/extract-ast` response — include sentinels array and coverage field

**Checkpoint**: US2 tests pass. Sentinels generated and validated.

---

## Phase 5: User Story 5 — Coverage Metrics (Priority: P1)

**Goal**: Report per-file extraction coverage in ingest output.

**Independent Test**: Ingest a file, verify JSON output includes coverage metrics per file.

### Tests for User Story 5

- [ ] T026 [P] [US5] Create handler skeleton at `src/handlers/calabi/coverage.ts` and register `/calabi/coverage` in `src/index.ts`
- [ ] T027 [P] [US5] Create test runner `tests/calabi/coverage/run` with workspace setup
- [ ] T028 [P] [US5] Create test case `tests/calabi/coverage/data/00-success-with-coverage/` — file with AST support, returns coverage metrics
- [ ] T029 [P] [US5] Create test case `tests/calabi/coverage/data/01-success-no-ast/` — prose file, returns coverage not available

### Implementation for User Story 5

- [ ] T030 [US5] Implement `/calabi/coverage` handler — parse file AST, generate sentinels, match against existing concepts in mind.db, return coverage report
- [ ] T031 [US5] Modify `/calabi/ingest` handler in `src/handlers/calabi/ingest.ts` — add AST extraction step before LLM extraction, include coverage in per-file result
- [ ] T032 [US5] Add `--ast-only` flag to `src/cli/commands/ingest.ts` — skip LLM extraction, AST + sentinels only
- [ ] T033 [US5] Write whitebox spike `try/extraction-pipeline.sh` — full ingest of corpus/code/panopticon.ts, verify coverage in JSON output

**Checkpoint**: US5 tests pass. Coverage metrics appear in ingest output.

---

## Phase 6: User Story 3 — Ontology-Driven LLM Extraction (Priority: P2)

**Goal**: Lens ontology guides LLM extraction prompts for bounded classification.

**Independent Test**: Create lens with ontology, ingest file, verify LLM prompt includes ontology types.

### Tests for User Story 3

- [ ] T034 [P] [US3] Create test case for ontology-driven extraction — mock LLM receives prompt containing lens concept types
- [ ] T035 [P] [US3] Create test case for fallback — no ontology on lens, LLM uses open-ended extraction

### Implementation for User Story 3

- [ ] T036 [US3] Add optional `ontology` field to lens config parsing in `src/lib/state.ts` or `src/handlers/lens/create.ts` — `concept_types: string[]`, `edge_types: string[]`
- [ ] T037 [US3] Modify LLM extraction prompt in `src/handlers/calabi/extract-llm.ts` — when ontology present, include types as classification schema in prompt
- [ ] T038 [US3] Wire ontology loading into ingest pipeline in `src/handlers/calabi/ingest.ts` — read active lens config, pass ontology to extract-llm

**Checkpoint**: US3 tests pass. Ontology-driven extraction works.

---

## Phase 7: User Story 4 — Adversarial Re-Extraction (Priority: P2)

**Goal**: Second LLM pass critiques the initial graph to find gaps.

**Independent Test**: Ingest file, run adversarial pass, verify additional concepts/edges returned.

### Tests for User Story 4

- [ ] T039 [P] [US4] Create test case for adversarial pass — mock LLM returns additional concepts not in initial graph
- [ ] T040 [P] [US4] Create test case for adversarial pass — initial graph is complete, adversarial returns empty delta
- [ ] T041 [P] [US4] Create test case for `--no-adversarial` flag — adversarial pass is skipped

### Implementation for User Story 4

- [ ] T042 [US4] Create adversarial extraction handler at `src/handlers/calabi/extract-adversarial.ts` — receives source + current graph, prompts LLM for gaps, returns delta concepts/edges
- [ ] T043 [US4] Register `/calabi/extract-adversarial` in `src/index.ts`
- [ ] T044 [US4] Wire adversarial pass into ingest pipeline in `src/handlers/calabi/ingest.ts` — after initial LLM extraction, run adversarial, merge delta
- [ ] T045 [US4] Add `--no-adversarial` flag to `src/cli/commands/ingest.ts`

**Checkpoint**: US4 tests pass. Full pipeline operational.

---

## Phase 8: Polish & Cross-Cutting

- [ ] T046 Run full test suite (`BRANE_EMBED_MOCK=1 BRANE_LLM_MOCK=1 bun run src/tc.ts`) — verify zero regressions
- [ ] T047 Write whitebox spike `try/full-pipeline.sh` — end-to-end: init, ingest corpus/code/ with full pipeline, verify coverage, verify concepts
- [ ] T048 Rebuild binary (`bun run build`) and verify WASM grammars are accessible at runtime
- [ ] T049 Send implementation to Gemini for antagonistic review
- [ ] T050 Address Gemini findings (if any)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Phase 1
- **US1 (Phase 3)**: Depends on Phase 2
- **US2 (Phase 4)**: Depends on Phase 2 (parallel with US1)
- **US5 (Phase 5)**: Depends on US1 + US2 (needs AST + sentinels)
- **US3 (Phase 6)**: Depends on Phase 2 (parallel with US1/US2)
- **US4 (Phase 7)**: Depends on Phase 2 (parallel with US1/US2/US3)
- **Polish (Phase 8)**: Depends on all user stories

### User Story Dependencies

- **US1** (AST Extraction): Independent — only needs foundational AST library
- **US2** (Sentinels): Independent — uses AST output but can test in isolation
- **US5** (Coverage): Depends on US1 + US2 — needs sentinels to compute coverage
- **US3** (Ontology): Independent — modifies LLM prompt, no AST dependency
- **US4** (Adversarial): Independent — second LLM pass, no AST dependency

### Parallel Opportunities

- T003-T004: AST helpers and types can run in parallel
- T011-T016: All US1 test case creation can run in parallel
- T020-T022: All US2 test case creation can run in parallel
- T034-T035, T039-T041: US3/US4 tests can run in parallel with US1/US2 work
- US3 and US4 are fully independent and can be implemented in parallel

---

## Implementation Strategy

### MVP First (US1 + US2 + US5)

1. Phase 1: Setup (T001-T004)
2. Phase 2: Foundational (T005-T010)
3. Phase 3: US1 — AST extraction (T011-T019)
4. Phase 4: US2 — Sentinels (T020-T025)
5. Phase 5: US5 — Coverage metrics (T026-T033)
6. **VALIDATE**: AST extraction + sentinels + coverage working end-to-end

### Complete

7. Phase 6: US3 — Ontology-driven extraction (T034-T038)
8. Phase 7: US4 — Adversarial re-extraction (T039-T045)
9. Phase 8: Polish (T046-T050)

---

## Notes

- All test cases use `tests/lib.sh` helpers (`init_brane`, `create_concepts`, etc.)
- WASM grammars load from `node_modules/tree-sitter-wasms/out/` in dev mode
- `BRANE_LLM_MOCK=1` for tests that involve LLM extraction (US3, US4)
- `BRANE_EMBED_MOCK=1` for all tests (embedding mock)
- TypeScript extractor ported from bunny's `src/lib/map.ts` extract_typescript function
- 50 total tasks across 8 phases
