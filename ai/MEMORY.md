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

### Architecture: sys.call Scope (IMPORTANT)

**sys.call is for PUBLIC API only** - the hexagonal ports.

```
┌─────────────────────────────────────────────┐
│  sys.call("/path", params)  ← PUBLIC API    │
│  ─────────────────────────────────────────  │
│  Handlers (thin adapters)                   │
│  ─────────────────────────────────────────  │
│  Functional/procedural code  ← INTERNAL     │
│  (KISS, no sys.call here)                   │
│  ─────────────────────────────────────────  │
│  State/IO adapters  ← HEXAGONAL PORTS       │
└─────────────────────────────────────────────┘
```

- **Handlers**: Thin wrappers that call internal functions
- **Internal code**: Normal functions, procedural when KISS
- **Adapters**: State, DB, filesystem at the edges

NOT everything is sys.call. Only the public interface.

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

Claude runs Gemini directly via CLI with `--resume` for session continuity:

```bash
gemini --resume latest "review prompt here"
```

**Context to include in review prompts:**
- Relevant conventions from `ai/MEMORY.md`
- The specific test files being reviewed
- What kind of feedback is wanted (edge cases, consistency, etc.)

This allows Gemini to build memory of project conventions across reviews.

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
Design Interface → Design Tests (Claude) → Review Tests (Gemini)
    → Implement → Loop Until Green → ⛔ HUMAN CHECKPOINT (only if stuck)
```

### Test Boundary Rule (CORRECTED)

The human checkpoint is for **failure resolution**, not pre-approval:

1. Design tests (Claude)
2. Review tests (Gemini antagonist)
3. Implement code
4. Run tests, loop until green
5. **ONLY IF STUCK** (can't make tests pass) → Human decides: fix tests or fix code

Tests are the spec. Claude implements against them. Human intervenes only when there's a conflict that can't be resolved.

### Never

- Alter tests after Gemini review without human approval
- Skip Gemini review
- Move to next task with failing tests
- Treat test failure as "change the tests" (ask human first)

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

## Technical Decisions

### CozoDB: Keep It, Fix the Bundler Issue (2026-01-28)

**Decision:** Stay with CozoDB for the Mind component. Do NOT switch to alternatives.

**Context:** Explored options for enabling `bun build --compile` to create standalone binaries.

**Alternatives Evaluated:**

| Option | Verdict | Reason |
|--------|---------|--------|
| Rust rewrite | ❌ No | 3-6 months, kills velocity, premature |
| GraphQLite (SQLite+Cypher) | ❌ No | Cypher lacks Datalog's rule/inference capabilities needed for `016-rules-define` |
| Kuzu | ❌ No | Trades known problems for unknown; Cypher same limitation |
| Pure SQLite + CTEs | ❌ No | Loses declarative Datalog, reimplements graph DB badly |
| cozo-lib-wasm | ❌ No | No persistence (memory-only), requires export/import |

**Root Cause:** CozoDB's `cozo-node` package uses `node-pre-gyp` for dynamic path resolution, which bundlers can't trace.

**Solution:** Add a bundler-friendly entry point with static `require()` path.

```javascript
// Current (breaks bundlers)
const binding_path = binary.find(...);  // dynamic
const native = require(binding_path);

// Fix (works with bundlers)
const native = require('./native/6/cozo_node_prebuilt.node');  // static
```

**Implementation (Completed 2026-01-28):**

1. **`src/lib/cozo.ts`** - Local bundler-friendly CozoDB wrapper with static require path
2. **Updated imports** in `src/lib/mind.ts` and `src/handlers/mind/init.ts` to use `./cozo`
3. **Multi-platform build scripts:**
   - `scripts/build-release.sh` - Local multi-platform build
   - `.github/workflows/release.yml` - CI/CD for all 5 platforms

**Supported Platforms:**
| Platform | Bun Target | Binary |
|----------|------------|--------|
| Linux x64 | `bun-linux-x64` | `brane-linux-x64` |
| Linux ARM64 | `bun-linux-arm64` | `brane-linux-arm64` |
| macOS x64 | `bun-darwin-x64` | `brane-darwin-x64` |
| macOS ARM64 | `bun-darwin-arm64` | `brane-darwin-arm64` |
| Windows x64 | `bun-windows-x64` | `brane-windows-x64.exe` |

**How it works:**
1. Download platform-specific `.node` from CozoDB releases
2. Place in `node_modules/cozo-node/native/6/`
3. `bun build --compile --target=<target>` embeds it via `$bunfs`

**Binary sizes:** ~80-132MB depending on platform

**PR for upstream:** `~/gh/ahoward/cozo/cozo-lib-nodejs/` contains:
- `bundler.js` - Static require entry point
- `bundler.d.ts` - TypeScript declarations
- Updated `package.json` with exports field
- Updated `README.md` with bundler docs

**Key Insight from Gemini Review:**
> "You're building a Semantic Nervous System. The 'semantic' requires Datalog's rule system, inference, and stratified negation. Cypher doesn't have these. Don't amputate the Mind to simplify the Body."

**Why Not GraphQLite (despite working prototype):**
1. Runtime .so extraction is security red flag (AV false positives, macOS notarization fails)
2. 6-month-old project vs CozoDB's 3+ years
3. Cypher can't express Datalog rules: `cycle[x] := *edges[_, x, y, _], cycle[y]`
4. Next roadmap item (`016-rules-define`) requires Datalog

**Compilation Status:**
- Dev mode: ~60ms startup
- Compiled binary: ~110ms startup
- Cross-compilation: ✅ Works from any platform to any platform

---

## Version History

| Date | Change |
|------|--------|
| 2026-01-26 | Initial memory created. Project setup complete. |
| 2026-01-26 | Added multi-agent system (Ali/Gemini). Development loop defined. |
| 2026-01-28 | CozoDB decision: Keep it, fix bundler via PR to upstream. |
| 2026-01-28 | Multi-platform compilation working. src/lib/cozo.ts + CI workflow. |
