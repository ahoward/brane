<!--
Sync Impact Report
==================
Version change: 0.0.0 → 1.0.0
Modified principles: N/A (initial constitution)
Added sections:
  - Core Principles (6 principles)
  - Architecture Constraints
  - Development Workflow
  - Governance
Removed sections: N/A
Templates requiring updates:
  - .specify/templates/plan-template.md ✅ (compatible, no changes needed)
  - .specify/templates/spec-template.md ✅ (compatible, no changes needed)
  - .specify/templates/tasks-template.md ✅ (compatible, no changes needed)
Follow-up TODOs: None
-->

# Brane Constitution

## Core Principles

### I. POD Only (Plain Old Data)

All data structures MUST be Plain Old Data. No classes for data containers.

- Input and output are always JSON-serializable POD
- No `class` keyword for data structures
- No inheritance hierarchies for data
- Types are interfaces or type aliases only
- Functions transform POD → POD

**Rationale:** Classes obscure data shape, complicate serialization, and introduce hidden state. POD is transparent, debuggable, and universal.

### II. Result Envelope

Every `sys.call` MUST return the same shape:

```typescript
{
  status:  "success" | "error",
  result:  T | null,
  errors:  ErrorMap | null,
  meta:    { path, timestamp, duration_ms }
}
```

- On success: `result` contains data, `errors` is `null`
- On error: `result` is `null`, `errors` mirrors result structure with arrays at leaves
- `meta` is always populated
- No exceptions for control flow; errors are data

**Rationale:** Consistent shape enables tooling, simplifies error handling, and makes APIs predictable. Callers never guess what they'll get back.

### III. sys.call is Public API Only

`sys.call("/path", params)` is the hexagonal port—the public interface.

- Handlers are thin adapters that delegate to internal functions
- Internal code uses normal function calls, not sys.call
- Functional/procedural style internally; KISS over abstraction
- State and I/O adapters live at the edges (hexagonal ports)

**Rationale:** Not everything needs the ceremony of sys.call. Internal code should be simple, direct, and testable without the envelope overhead.

### IV. Antagonistic Testing

Tests are specifications. Claude designs, Gemini challenges, then implement.

- Claude (primary agent) designs first pass of tc tests
- Gemini (antagonist) reviews tests, finds blind spots, suggests harder cases
- After Gemini review, tests are LOCKED
- Human checkpoint ONLY when stuck (cannot make tests pass)
- Tests MUST exist before implementation

**Rationale:** Single-agent test design has blind spots. Adversarial review produces robust specifications. Tests define the contract; implementations are disposable.

### V. Unix-Clean

We follow Unix conventions, not JavaScript conventions.

- `null` over `undefined` (explicit absence)
- stdin/stdout/stderr for I/O
- Exit codes matter (0 = success, non-zero = failure)
- Streams and pipes where appropriate
- Simple text protocols (JSON lines, etc.)

**Rationale:** Unix conventions are battle-tested, composable, and universal. JavaScript's `undefined` is an accident of history.

### VI. Simplicity (YAGNI)

Start simple. Add complexity only when proven necessary.

- No premature abstractions
- No "just in case" features
- Three similar lines > one premature abstraction
- If unsure, leave it out
- Complexity MUST be justified in writing

**Rationale:** Over-engineering is the enemy. Every abstraction has a cost. Pay it only when the benefit is clear and present.

## Architecture Constraints

### Split-Brain Architecture

Brane uses two databases, each optimized for its domain:

- **Body** (`.brane/body.db`): SQLite for physical reality (files, hashes, FTS)
- **Mind** (`.brane/mind.db`): CozoDB for semantic reality (concepts, edges, rules)

### Naming Conventions

| Thing | Style | Example |
|-------|-------|---------|
| Constants | SCREAMING_SNAKE | `MAX_SIZE`, `DEFAULT_TIMEOUT` |
| Types/Interfaces | PascalCase | `FileRecord`, `Concept` |
| Variables/functions | snake_case | `file_path`, `compute_hash` |

**Note:** This differs from typical JS/TS camelCase. We use Ruby-style snake_case.

### Terminology

- `params` for input (6 chars)
- `result` for output (6 chars)
- Never use "data"—too generic

## Development Workflow

### The Loop

1. **Design Interface** — Define sys.call paths (public API only)
2. **Design Tests (Claude)** — Write tc test cases with input.json/expected.json
3. **Review Tests (Gemini)** — Antagonist review, incorporate suggestions
4. **Implement** — Write code (handlers thin, logic functional)
5. **Loop Until Green** — Fix failures, re-run tests
6. **If Stuck → Human Checkpoint** — Only when tests cannot pass

### tc Test Structure

```
tests/{handler}/
├── run                           # executable
├── skip                          # optional skip marker
└── data/{NN-case}/
    ├── input.json
    └── expected.json
```

- Test cases prefixed with `NN-` for deterministic order
- Nested cases supported: `data/{NN-group}/{NN-case}/`

### Never

- Implement without tests
- Skip Gemini review
- Change tests after review without human approval
- Move to next task with failing tests
- Use classes for data structures
- Return different shapes from handlers

## Governance

### Amendment Process

1. Propose change with rationale
2. Document in constitution with version bump
3. Update dependent artifacts if principles change
4. All PRs MUST verify compliance with constitution

### Versioning

Constitution follows semantic versioning:

- **MAJOR**: Principle removed or redefined (breaking)
- **MINOR**: Principle added or materially expanded
- **PATCH**: Clarifications, wording, typos

### Compliance

- All code reviews MUST check constitution compliance
- Complexity MUST be justified against Principle VI
- Violations require explicit justification and human approval

**Version**: 1.0.0 | **Ratified**: 2026-01-27 | **Last Amended**: 2026-01-27
