# AI Memory (Long-Term)

*Managed by AI. Persistent knowledge about project, user, and patterns.*

---

## Project: Brane

### Identity

- **Name:** Brane (M-theory: the surface strings attach to)
- **Codename:** Calabi (the extraction/projection engine)
- **Thesis:** "Strings must attach to a Brane, or they are lost in entropy."

### Architecture (Frozen)

```
.brane/
├── body.db    # SQLite - physical reality (files, hashes, FTS)
└── mind.db    # CozoDB - semantic reality (concepts, edges, rules)
```

### Core Interface

```typescript
sys.call("/path/to/method", params) => {
  status: "success" | "error",
  result: T | null,
  errors: ErrorMap | null,  // mirrors result structure
  meta: { path, timestamp, duration_ms }
}
```

**Terminology:**
- `params` = input (6 chars)
- `result` = output (6 chars)
- Never use "data" - too generic

### Key Conventions

1. POD only (no classes for data)
2. Result envelope (always same shape)
3. Error mirror (errors match result structure)
4. Guard early (return errors at top)
5. Handlers by path (`src/handlers/body/files/hash.ts` → `/body/files/hash`)
6. tc tests (JSON in/out, language-agnostic)

---

## User: ara (ara.t.howard)

### Background

- Author of 143 Ruby gems
- Deep systems programming experience
- Values brutal consistency over flexibility
- Prefers "hacker aesthetic" over enterprise polish

### Communication Style

- Provides rich context (pastes full conversations, links)
- Expects comprehensive documentation before implementation
- Appreciates physics/math metaphors

### Preferences

- Short, Unix-style names
- No magic, no decorators, no DI frameworks
- POD in, POD out
- REPL-first development
- tc for testing (language-agnostic)
- **OCD whitespace** - pedantic, careful formatting
- **Symmetric naming** - `params` (input, 6 chars), `result` (output, 6 chars)

### Naming Conventions

| Thing | Style | Example |
|-------|-------|---------|
| Constants | SCREAMING_SNAKE | `MAX_SIZE`, `DEFAULT_TIMEOUT` |
| Classes | PascalCase | `FileRecord`, `Concept` |
| Objects/variables | snake_case | `file_path`, `hash_value` |
| Functions | snake_case | `compute_hash`, `read_file` |

**Note:** This differs from typical JS/TS camelCase. User prefers Ruby-style snake_case for identifiers. Use this unless it grossly violates Bun.js conventions (imports, exports may need camelCase for ecosystem compatibility).

### Don't

- Over-engineer
- Add unnecessary abstractions
- Use classes for data structures
- Skip the Result envelope
- Call input "data" (use "params")
- Be sloppy with whitespace
- Be "JS clean" - be **Unix clean** (null over undefined, streams, pipes)

### Unix Philosophy

We aim for Unix-clean, not JS-clean:
- `null` not `undefined`
- stdin/stdout/stderr
- Exit codes matter
- Pipes and streams
- Simple text protocols

---

## Multi-Agent System: Antagonistic Testing

### Philosophy

**Antagonistic Testing** - Having one agent suggest tests for the other to find blind spots.

The primary agent (Claude) has the most context, so it designs the first pass. The review agent (Gemini) plays adversary - finding edge cases, questioning assumptions, suggesting harder tests.

This creates tension that produces better specifications.

### Agents

| Agent | Platform | Role |
|-------|----------|------|
| **Claude** | Claude Code | Primary. Has context. Designs first pass of tests. Implements. |
| **Gemini** | Google Gemini CLI | Antagonist. Reviews tests. Suggests harder cases. Finds blind spots. |
| **Human** | - | Checkpoint authority. Final say on test boundaries. |

### Running Gemini

Claude runs Gemini directly via CLI with continuation flags:

```bash
gemini --continue ...
```

This allows Gemini to build memory across review sessions within the project.

### Gemini (Antagonist) - IMPORTANT

- **Platform:** Google Gemini CLI
- **Role:** Test reviewer, antagonist
- **When to use:** After designing tc tests, BEFORE implementing
- **How to run:** `gemini --continue` (Claude runs this directly)

Gemini reviews test designs and suggests:
- Missing edge cases
- Interface inconsistencies
- Better error scenarios
- Clearer expected outputs

**Never proceed past test boundary without Gemini's review.**

---

## Development Loop (Critical)

See: `dna/technical/development-loop.md`

```
Design Interface → Design Tests (Claude) → Review Tests (Ali)
    → Create Skip Tests → ⛔ HUMAN CHECKPOINT → Implement → Loop Until Green
```

### Test Boundary Rule

After tests are designed and reviewed by both agents:
1. Tests exist as skip tests
2. **STOP** - Do not implement
3. Wait for human approval
4. Only proceed when human gives go-ahead

### Never

- Implement without tests
- Skip Ali review
- Proceed past boundary without human
- Move to next task with failing tests

---

## Learned Patterns

### Documentation Flow

1. Research → capture in `dna/research/`
2. Decisions → lock in `dna/product/prd.md`
3. Conventions → document in `dna/technical/`
4. Implementation → follow `ai/CODE.md`

### Session Flow

1. Read `wip/prompt.md` for current task
2. Check `wip/notes.md` for session context
3. Reference `wip/memory.md` for phase context
4. Update `ai/NOTES.md` with observations
5. Update `ai/MEMORY.md` with permanent learnings

### Development Flow

1. Design sys.call interface
2. Write tc tests (input.json, expected.json)
3. Send to Ali (Gemini) for review
4. Incorporate feedback
5. Create skip tests
6. **STOP** - Wait for human
7. Implement after approval
8. Loop until tests pass

---

## Version History

| Date | Change |
|------|--------|
| 2026-01-26 | Initial memory created. Project setup complete. |
| 2026-01-26 | Added multi-agent system (Ali/Gemini). Development loop defined. |
