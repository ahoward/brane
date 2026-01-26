# Development Loop

**Antagonistic Testing with Human Checkpoints**

This project uses **Antagonistic Testing** - a rigorous test-first process where one agent designs tests and another agent challenges them, with human checkpoints at test boundaries.

---

## Antagonistic Testing

The primary agent (Claude) has the most context, so it designs the first pass of tests. The review agent (Ali/Gemini) plays **antagonist** - questioning assumptions, finding edge cases, suggesting harder tests.

This tension produces better specifications than either agent alone.

```
Claude (context)  →  designs tests  →  Ali (antagonist)  →  challenges  →  better tests
```

The antagonist asks:
- "What if the input is empty?"
- "What if the file is 10GB?"
- "What if two processes call this simultaneously?"
- "What about unicode in paths?"

Neither agent proceeds alone. Both must agree before the test boundary.

---

## The Loop

```
┌─────────────────────────────────────────────────────────────────┐
│  1. DESIGN INTERFACE                                            │
│     - Define sys.call paths                                     │
│     - Specify input/output shapes                               │
│     - Document in wip/prompt.md                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  2. DESIGN TESTS (Claude)                                       │
│     - Write tc test cases                                       │
│     - Define input.json / expected.json                         │
│     - Cover happy path + error cases                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  3. REVIEW TESTS (Ali/Gemini)                                   │
│     - Send tests to Gemini for review                           │
│     - Incorporate suggestions                                   │
│     - Iterate until both agents agree                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  4. CREATE SKIP TESTS                                           │
│     - Write test files with skip marker                         │
│     - Tests exist but don't run yet                             │
│     - This is the TEST BOUNDARY                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  ⛔ HUMAN CHECKPOINT                                            │
│     - Human reviews proposed tests                              │
│     - Human approves or requests changes                        │
│     - Human gives go-ahead to implement                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  5. IMPLEMENT                                                   │
│     - Write handler code                                        │
│     - Remove skip marker                                        │
│     - Run tests                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  6. LOOP UNTIL GREEN                                            │
│     - Fix failures                                              │
│     - Re-run tests                                              │
│     - All tests must pass                                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  ✅ TESTS PASS → Next task (if exists)                          │
│     - Only proceed if ALL tests green                           │
│     - Document completion in wip/notes.md                       │
│     - Update ai/MEMORY.md with learnings                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Rules

### Test Boundary (Critical)

**After steps 1-4, STOP.** Do not implement until human approves.

The "Test Boundary" is the point where:
- Interface is designed
- Tests are written (by Claude)
- Tests are reviewed (by Ali/Gemini)
- Tests exist as skip tests

At this point, **human intervention is required** before proceeding.

### Antagonistic Testing

Every test suite goes through adversarial review:

1. **Claude** (primary, has context) - Designs initial tests based on full project understanding
2. **Ali/Gemini** (antagonist) - Challenges tests, finds blind spots, suggests harder cases

The antagonist's job is to **break** the tests - find what Claude missed. This tension produces robust specifications.

Neither agent proceeds alone. Both must agree on the test design.

### Never Skip the Loop

- No implementing without tests
- No tests without review
- No proceeding past boundary without human approval
- No moving to next task until current tests pass

---

## Agent Roles

### Claude (Primary Agent - Has Context)

- Reads `wip/prompt.md` for current task
- Has full project context (dna/, ai/MEMORY.md, codebase)
- Designs `sys.call` interface
- Writes **first pass** of tc tests
- Implements after human approval
- Updates `ai/NOTES.md` and `ai/MEMORY.md`

### Ali (Gemini - Antagonist)

- Receives test designs from Claude
- **Plays adversary** - tries to break the tests
- Asks "what if?" questions
- Suggests edge cases Claude missed
- Validates interface consistency
- Does NOT implement (antagonist role only)

### Human (Checkpoint Authority)

- Reviews test boundary artifacts
- Sees both Claude's tests AND Ali's challenges
- Approves or rejects final test design
- Gives go-ahead to implement
- Final authority on all decisions

---

## Test Structure

```
tests/
└── {namespace}/
    └── {method}/
        ├── run                     # Executable (calls brane)
        ├── skip                    # Empty file = skip this test
        └── data/
            ├── success/
            │   ├── input.json
            │   └── expected.json
            ├── error-missing-field/
            │   ├── input.json
            │   └── expected.json
            └── error-invalid-value/
                ├── input.json
                └── expected.json
```

### Skip Marker

Create empty `skip` file to mark test as pending:

```bash
touch tests/body/files/hash/skip  # Test exists but won't run
rm tests/body/files/hash/skip     # Enable test
```

---

## Example Flow

### Task: Implement `/body/files/hash`

**Step 1: Design Interface**
```typescript
sys.call("/body/files/hash", { path: "./src/index.ts" })
// Returns: { status, result: { path, hash, size }, errors, meta }
```

**Step 2: Design Tests (Claude)**
```
tests/body/files/hash/data/
├── success/
│   ├── input.json      # { "path": "./fixtures/hello.txt" }
│   └── expected.json   # { "status": "success", "result": { "hash": "<string>" } }
├── error-missing-path/
│   ├── input.json      # {}
│   └── expected.json   # { "status": "error", "errors": { "path": [...] } }
└── error-file-not-found/
    ├── input.json      # { "path": "./does-not-exist.txt" }
    └── expected.json   # { "status": "error", "errors": { "path": [...] } }
```

**Step 3: Review (Ali/Gemini)**
- "Add test for permission denied"
- "Add test for directory (not file)"
- Claude incorporates feedback

**Step 4: Create Skip Tests**
```bash
touch tests/body/files/hash/skip
```

**⛔ STOP - Human Checkpoint**

Human reviews, approves.

**Step 5-6: Implement & Loop**
- Write handler
- Remove skip
- Run tests
- Fix failures
- All green → Done

---

## Commands

```bash
# Run all tests (skipped tests show as pending)
bun test

# Run specific test
bun test tests/body/files/hash

# Check what's skipped
find tests -name "skip" -type f

# Enable a test
rm tests/body/files/hash/skip
```

---

## Memory Integration

After each completed task:

1. Update `wip/notes.md` with what was done
2. Update `ai/NOTES.md` with observations
3. Update `ai/MEMORY.md` if permanent learning occurred
4. Clear `wip/prompt.md` or set next task

---

---

## Why Antagonistic Testing?

Single-agent test design has blind spots:
- The designer assumes their own mental model
- Edge cases that "obviously won't happen" get missed
- The tests validate what the agent *thinks* should happen

With an antagonist:
- Second agent questions every assumption
- "What if?" becomes systematic
- Tests become specifications, not just checks

The human checkpoint ensures neither agent runs away with a bad idea.

---

*"Tests are the specification. Implementations are disposable."*

*"One agent designs, another breaks. Humans decide."*
