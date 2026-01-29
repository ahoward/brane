# Implementation Plan: LLM-Powered Concept Extraction

**Branch**: `020-llm-extract` | **Date**: 2026-01-29 | **Spec**: [spec.md](./spec.md)

## Summary

Replace the current stub extraction in `/calabi/scan` (which only extracts filenames as concepts) with real LLM-powered analysis. The LLM will analyze file content and return structured concepts and relationships that feed into the existing `extract.ts` handler.

## Technical Context

**Language/Version**: TypeScript / Bun 1.x
**Primary Dependencies**: None (wraps CLI tools: `claude`, `gemini`), existing CozoDB/SQLite libs
**Storage**: `.brane/body.db` (SQLite), `.brane/mind.db` (CozoDB), `.brane/config.json` (new)
**Testing**: tc test framework (JSON in/out)
**Target Platform**: CLI (macOS/Linux)
**Project Type**: Single project (existing Brane structure)
**Performance Goals**: Extract from a 100-line file in <5 seconds
**Constraints**: Must handle LLM rate limits gracefully; truncate large files
**Scale/Scope**: Single-user local tool; files up to 10K lines

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. POD Only | ✅ | LLM responses parsed to POD (concepts[], edges[]) |
| II. Result Envelope | ✅ | All handlers return standard Result<T> |
| III. sys.call Public API Only | ✅ | LLM calls are internal lib functions, not sys.call |
| IV. Antagonistic Testing | ✅ | tc tests with mocked LLM responses |
| V. Unix-Clean | ✅ | Shell out to CLI tools (stdin/stdout), config from file or env vars |
| VI. Simplicity (YAGNI) | ✅ | Wrap existing CLIs instead of SDK dependencies; Claude + Gemini for v1 |

## Project Structure

### Documentation (this feature)

```text
specs/020-llm-extract/
├── plan.md              # This file
├── research.md          # LLM integration research
├── data-model.md        # Config schema
├── quickstart.md        # Setup guide
├── contracts/           # LLM prompt/response contracts
└── tasks.md             # Implementation tasks
```

### Source Code (repository root)

```text
src/
├── handlers/
│   └── calabi/
│       ├── scan.ts      # MODIFY: Use LLM extraction instead of stub
│       └── extract.ts   # UNCHANGED: Receives LLM output
├── lib/
│   ├── llm.ts           # NEW: LLM client abstraction
│   ├── config.ts        # NEW: Config file loader
│   └── prompts.ts       # NEW: Extraction prompt templates
└── index.ts             # UNCHANGED

tests/
└── calabi/
    └── scan/
        └── data/
            └── NN-llm-*/ # NEW: LLM extraction test cases
```

**Structure Decision**: Single project structure. New files in `src/lib/` for LLM integration. Modify existing `scan.ts` to use real extraction.

## Key Decisions

1. **CLI Wrapping**: Shell out to `claude` and `gemini` CLIs instead of using SDKs.
   - Zero npm dependencies for LLM integration
   - CLIs handle auth, retries, rate limits internally
   - Adding new providers = wrap their CLI
   - Aligns with Unix-Clean principle (stdin/stdout)

2. **Provider Detection**: Auto-detect available CLIs (`which claude`, `which gemini`).

3. **Config Location**: `.brane/config.json` for provider preference (optional).

4. **Prompt Design**: Use `--print --output-format json` for structured output.

5. **File Truncation**: Limit file content to ~8000 tokens to stay within context limits.

6. **Mock in Tests**: tc tests use `BRANE_LLM_MOCK=1` env var for deterministic responses.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    /calabi/scan                          │
│                         │                                │
│    ┌────────────────────┼────────────────────┐          │
│    │                    ▼                    │          │
│    │   ┌─────────────────────────────────┐   │          │
│    │   │         llm.ts                  │   │          │
│    │   │  - detect_provider()            │   │          │
│    │   │  - extract_from_content()       │   │          │
│    │   │  - call_cli() (claude/gemini)   │   │          │
│    │   └─────────────────────────────────┘   │          │
│    │                    │                    │          │
│    │                    ▼                    │          │
│    │   ┌─────────────────────────────────┐   │          │
│    │   │      /calabi/extract            │   │          │
│    │   │  (existing - unchanged)         │   │          │
│    │   └─────────────────────────────────┘   │          │
│    │                                         │          │
│    └─────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────┘
```

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/lib/llm.ts` | CREATE | LLM CLI wrapper (detect provider, shell out to claude/gemini) |
| `src/lib/config.ts` | CREATE | Config file loader (.brane/config.json) - provider preference |
| `src/lib/prompts.ts` | CREATE | Extraction prompt templates |
| `src/handlers/calabi/scan.ts` | MODIFY | Use LLM extraction instead of filename stub |
| `tests/calabi/scan/run` | MODIFY | Add mock LLM support |
| `tests/calabi/scan/data/` | CREATE | New test cases for LLM extraction |
