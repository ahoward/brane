# Implementation Plan: Extraction Pipeline

**Branch**: `034-extraction-pipeline` | **Date**: 2026-03-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/034-extraction-pipeline/spec.md`

## Summary

Replace brane's LLM-only extraction with a four-stage ensemble pipeline: AST parsing (tree-sitter) for mechanical ground truth, sentinel checks for LLM accountability, ontology-driven LLM extraction for bounded classification, and adversarial re-extraction for gap detection. Report per-file coverage metrics comparing AST-discovered symbols against graph concepts.

## Technical Context

**Language/Version**: TypeScript 5.x (Bun 1.x runtime)
**Primary Dependencies**: tree-sitter (web-tree-sitter WASM), existing cozo-node, bun:sqlite, citty CLI, existing LLM CLI shell-out
**Storage**: CozoDB mind.db (existing concepts/edges/provenance), SQLite body.db (existing files)
**Testing**: tc test framework (existing), BRANE_EMBED_MOCK=1, BRANE_LLM_MOCK=1
**Target Platform**: Linux (single binary, compiled via bun build)
**Project Type**: Single project (existing brane codebase)
**Performance Goals**: Full pipeline within 3x current LLM-only extraction time per file
**Constraints**: Single binary deployment (~85MB), no native deps beyond what bun compile supports, offline-capable (AST + sentinels work without LLM)
**Scale/Scope**: Per-file extraction, typical project < 1000 files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. POD Only | ✅ PASS | All extraction results, sentinels, coverage reports are POD interfaces |
| II. Result Envelope | ✅ PASS | New handlers return standard `{status, result, errors, meta}` |
| III. sys.call Public API | ✅ PASS | New endpoints registered via sys.register. Internal AST/sentinel logic uses plain functions |
| IV. Antagonistic Testing | ✅ PASS | tc tests + Gemini review per dev loop |
| V. Unix-Clean | ✅ PASS | JSON output, exit codes, stdin/stdout |
| VI. Simplicity (YAGNI) | ⚠️ WATCH | Four-stage pipeline is inherently complex. Justified: each stage addresses a specific, documented failure mode. Phased delivery keeps each increment simple. |

**Complexity Justification (Principle VI):** The ensemble approach adds complexity over the current single-LLM extraction. This is justified because the current approach has a documented, fundamental weakness: the graph only contains what the LLM decides to mention. Each pipeline stage has a clear, independent purpose and can be delivered incrementally. AST extraction alone (P1) is valuable without the other stages.

## Project Structure

### Documentation (this feature)

```text
specs/034-extraction-pipeline/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
src/
├── handlers/
│   └── calabi/
│       ├── extract.ts           # existing — patch applier (concepts/edges into graph)
│       ├── extract-llm.ts       # existing — LLM extraction, modified for ontology-driven prompts
│       ├── extract-ast.ts       # NEW — AST extraction handler
│       ├── ingest.ts            # existing — orchestrator, modified for pipeline stages
│       └── sentinels.ts         # NEW — sentinel generation + validation
├── lib/
│   ├── ast/
│   │   ├── parse.ts             # NEW — tree-sitter wrapper, parse file → AST
│   │   ├── extract.ts           # NEW — AST → concepts + edges
│   │   └── grammars.ts          # NEW — grammar loading (TS/JS)
│   └── coverage.ts              # NEW — coverage metric computation
└── cli/
    └── commands/
        └── ingest.ts            # existing — add --no-adversarial flag

tests/
├── calabi/
│   ├── extract-ast/             # NEW — AST extraction tests
│   ├── sentinels/               # NEW — sentinel tests
│   └── ingest/                  # existing — updated for pipeline
```

**Structure Decision**: Follows existing handler-by-path convention. AST parsing is internal library code (`src/lib/ast/`), not a sys.call endpoint. Sentinels get a handler for testability. Coverage is a lib utility consumed by the ingest orchestrator.
