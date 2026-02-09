# Implementation Plan: Define Datalog Rules

**Branch**: `016-rules-define` | **Date**: 2026-01-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/016-rules-define/spec.md`

## Summary

Implement a rule system for the Mind component that enables graph integrity checks using CozoDB's native Datalog capabilities. The system provides two built-in rules (`cycles` and `orphans`) plus the ability to define custom rules. Rules are stored in mind.db and can be listed, queried, and (for custom rules) deleted.

## Technical Context

**Language/Version**: TypeScript (Bun 1.x)
**Primary Dependencies**: CozoDB (Datalog), existing mind.ts utilities
**Storage**: CozoDB mind.db (new `rules` relation)
**Testing**: tc tests (JSON in/out)
**Target Platform**: CLI (Linux, macOS, Windows)
**Project Type**: Single project (existing Brane structure)
**Performance Goals**: Cycle detection in <5s for 1000 concepts, orphan detection in <1s
**Constraints**: Must use CozoDB Datalog syntax, rules persist across sessions
**Scale/Scope**: Thousands of concepts, tens of rules

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. POD Only | ✅ PASS | Rules are POD (name, description, body, builtin flag) |
| II. Result Envelope | ✅ PASS | All handlers return standard envelope |
| III. sys.call Public API | ✅ PASS | Handlers thin, Datalog execution in lib |
| IV. Antagonistic Testing | ✅ PASS | tc tests before implementation, Gemini review |
| V. Unix-Clean | ✅ PASS | null over undefined, JSON I/O |
| VI. Simplicity (YAGNI) | ✅ PASS | Only cycles/orphans built-in, custom rules for extensibility |

## Project Structure

### Documentation (this feature)

```text
specs/016-rules-define/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (sys.call interfaces)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── handlers/
│   └── mind/
│       └── rules/
│           ├── create.ts    # Create custom rule
│           ├── delete.ts    # Delete custom rule
│           ├── get.ts       # Get rule by name
│           ├── list.ts      # List all rules
│           └── query.ts     # Execute rule, return results
└── lib/
    └── mind.ts              # Add rules utilities (get_next_rule_id, etc.)

tests/
└── mind/
    └── rules/
        ├── create/
        │   └── data/
        │       ├── 00-success-create-custom/
        │       ├── 01-error-invalid-syntax/
        │       ├── 02-error-missing-name/
        │       └── 03-error-duplicate-name/
        ├── delete/
        │   └── data/
        │       ├── 00-success-delete-custom/
        │       ├── 01-error-not-found/
        │       └── 02-error-builtin-protected/
        ├── get/
        │   └── data/
        │       ├── 00-success-get-builtin/
        │       ├── 01-success-get-custom/
        │       └── 02-error-not-found/
        ├── list/
        │   └── data/
        │       ├── 00-success-list-all/
        │       └── 01-success-list-empty-custom/
        └── query/
            └── data/
                ├── 00-success-cycles-found/
                ├── 01-success-cycles-none/
                ├── 02-success-orphans-found/
                ├── 03-success-orphans-none/
                ├── 04-success-custom-rule/
                └── 05-error-not-found/
```

**Structure Decision**: Follows existing Brane pattern (handlers/mind/rules/* mirrors handlers/mind/concepts/*). Rules are a new resource type in the Mind namespace.

## Complexity Tracking

> No violations requiring justification. Design follows existing patterns.
