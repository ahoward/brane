# Autonomous Development Process

**How this repo enables extended AI-driven development with minimal human intervention**

---

## TL;DR

The repo is structured so an AI agent can work autonomously for extended periods by providing:

1. **Clear task queue** (ROADMAP.md) — Always know what's next
2. **Executable specifications** (tc tests) — Know when you're done
3. **Consistent interfaces** (sys.call envelope) — No guessing at shapes
4. **Codified principles** (constitution) — Make decisions without asking
5. **Failure-only checkpoints** — Humans intervene on exceptions, not approvals
6. **Spec-kit workflow** — Structured feature development pipeline
7. **Antagonistic review** (Gemini) — Second agent challenges assumptions
8. **Persistent sessions** (tmux/ns) — Long-running work survives disconnects

The human's job shifts from "directing work" to "defining goals and resolving blockers."

---

## Tooling Stack

### Primary Agent: Claude (claude-code CLI)

The main development agent with full codebase context. Runs in terminal, reads/writes files, executes commands, makes commits.

### Antagonist Agent: Gemini

Secondary agent used for adversarial review of test designs. Claude designs tests, Gemini challenges them. This tension produces better specifications than either agent alone.

```
Claude (has context) → designs tests → Gemini (antagonist) → challenges → better tests
```

### Session Management: tmux via `~/bin/ns`

Human runs Claude under a tmux wrapper (`ns`) that provides:
- **Persistent sessions** — Work survives SSH disconnects
- **Named sessions** — Easy to resume (`ns brane`)
- **Background execution** — Agent continues while human is away
- **Session inspection** — Human can attach to see progress

```bash
# Start or attach to session
~/bin/ns brane

# Agent runs continuously until:
# - All tasks complete
# - Genuine blocker encountered
# - Human intervention needed
```

### Spec-Kit: Feature Development Pipeline

Slash commands that structure the feature lifecycle:

| Command | Purpose |
|---------|---------|
| `/speckit.specify` | Create `specs/{feature}/spec.md` from description |
| `/speckit.plan` | Generate `plan.md` with design decisions |
| `/speckit.tasks` | Generate `tasks.md` with atomic work items |
| `/speckit.implement` | Execute tasks in order |
| `/speckit.clarify` | Ask clarifying questions, encode answers |

**Workflow:**
```
/speckit.specify "graph exploration commands"
    ↓ creates specs/027-graph-explore/spec.md
/speckit.plan
    ↓ creates specs/027-graph-explore/plan.md
/speckit.tasks
    ↓ creates specs/027-graph-explore/tasks.md
/speckit.implement
    ↓ executes tasks, commits, updates ROADMAP
```

### DNA System: Project Knowledge Base

The `dna/` directory contains organized project knowledge:

```
dna/
├── product/
│   ├── ROADMAP.md      # Task queue (START HERE)
│   ├── prd.md          # Product requirements
│   └── vision.md       # Philosophy and direction
├── technical/
│   ├── coding-conventions.md
│   ├── development-loop.md
│   └── autonomous-dev-process.md  # This document
└── research/
    ├── competitive-analysis.md
    └── ...
```

**Key properties:**
- Agent reads `dna/` to understand project context
- `/dna.process` ingests new documents into appropriate locations
- `/dna.organize` restructures based on content analysis
- Survives across sessions — institutional memory

### Constitution: Codified Principles

Located at `.specify/memory/constitution.md`, defines:

1. **POD only** — No classes for data
2. **Result envelope** — Consistent response shape
3. **sys.call is public API** — Internal code uses functions
4. **Antagonistic testing** — Gemini reviews tests
5. **Unix-clean** — null over undefined
6. **Simplicity** — YAGNI

Agent consults constitution for design decisions without asking human.

### tc Test Framework

Language-agnostic JSON in/out testing:

```
tests/{handler}/
├── run                    # Executable test runner
└── data/{case}/
    ├── params.json        # Input
    └── result.json        # Expected output
```

Supports wildcards (`<timestamp>`, `<number>`, `<string>`) for dynamic values.

---

## Why It Works: Key Principles

### 1. Unambiguous Task Definition

**What:** Every task has a clear entry point, scope, and completion criteria.

- `ROADMAP.md` lists features in priority order
- Each feature gets a `specs/{feature}/` directory with:
  - `spec.md` — What to build (user stories, contracts)
  - `plan.md` — How to build it (design decisions)
  - `tasks.md` — Atomic work items with dependencies

**Why it enables autonomy:** The agent never has to ask "what should I work on?" or "is this in scope?" The answer is in the documents.

---

### 2. Tests as Executable Specifications

**What:** tc-style tests define success criteria as JSON in/out.

```
tests/{handler}/data/{case}/
├── params.json    # Input
└── result.json    # Expected output (with wildcards like <timestamp>)
```

**Why it enables autonomy:**

- "Am I done?" → Run tests. Green = done.
- "Did I break something?" → Run tests. Red = fix it.
- No subjective judgment needed. The tests are the spec.

---

### 3. Consistent Result Envelope

**What:** Every `sys.call` returns the same shape:

```typescript
{
  status: "success" | "error",
  result: T | null,
  errors: ErrorMap | null,
  meta: { path, timestamp, duration_ms }
}
```

**Why it enables autonomy:**

- Never guess what a handler returns
- Error handling is uniform across the codebase
- Tests can use the same comparison logic everywhere
- New handlers follow the pattern without design decisions

---

### 4. Codified Principles (Constitution)

**What:** Six core principles documented in `.specify/memory/constitution.md`:

1. POD only (no classes for data)
2. Result envelope (consistent shape)
3. sys.call is public API only
4. Antagonistic testing
5. Unix-clean (null over undefined, exit codes)
6. Simplicity (YAGNI)

**Why it enables autonomy:**

- Design decisions are pre-made
- "Should I use a class?" → No, constitution says POD only
- "Should I add this feature just in case?" → No, YAGNI
- Agent doesn't need to ask for style/architecture guidance

---

### 5. Failure-Only Human Checkpoints

**What:** Humans intervene only when:

- Tests cannot pass after good-faith effort
- There's a genuine ambiguity in requirements
- External factors block progress (permissions, keys, etc.)

**What humans DON'T do:**

- Pre-approve implementation plans
- Review code before commit
- Sign off on each task completion

**Why it enables autonomy:**

- Agent proceeds until blocked, not until approved
- Throughput limited by work speed, not review cycles
- Human attention focused on exceptions, not routine

---

### 6. Self-Documenting Progress

**What:** Work artifacts accumulate:

- `specs/{feature}/tasks.md` — Checkboxes show progress
- Git commits — Atomic, well-messaged history
- Test results — Pass/fail is visible
- ROADMAP.md — Features move to "Completed" section

**Why it enables autonomy:**

- Agent can resume after interruption by reading state
- Human can check progress without asking
- No synchronous status updates needed

---

### 7. Deterministic File Organization

**What:** Predictable paths for everything:

```
src/handlers/{namespace}/{method}.ts  → implements /namespace/method
tests/{namespace}/{method}/           → tests for that handler
specs/{NNN-feature}/                  → feature specification
dna/{category}/                       → project knowledge
```

**Why it enables autonomy:**

- "Where does this code go?" → Follow the pattern
- "Where are the tests?" → Predictable location
- No decisions about file organization

---

### 8. Incremental, Atomic Work

**What:** Tasks are sized to be:

- Completable in one session
- Independently testable
- Commitable as a unit

**Why it enables autonomy:**

- Agent can finish things, not leave them half-done
- Each commit is a valid state
- Progress is measurable (tasks done / tasks total)

---

## The Autonomy Loop

```
┌─────────────────────────────────────────────┐
│  1. Read ROADMAP.md → Find next feature     │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  2. Read specs/{feature}/ → Understand task │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  3. Read tasks.md → Find next unchecked item│
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  4. Implement → Write code                  │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  5. Test → Run `bun test`                   │
│     Green? → Commit, mark task done, goto 3 │
│     Red? → Fix and retry                    │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  6. All tasks done? → Update ROADMAP,       │
│     commit, goto 1                          │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  7. Stuck? → ⛔ Human checkpoint            │
│     (Only intervention point)               │
└─────────────────────────────────────────────┘
```

---

## What Makes This Different

### Traditional Dev Process

```
Human assigns task
    ↓
Agent asks clarifying questions
    ↓
Human answers
    ↓
Agent proposes approach
    ↓
Human approves
    ↓
Agent implements
    ↓
Human reviews
    ↓
Agent revises
    ↓
Human approves
    ↓
Merge
```

**Bottleneck:** Human is in the loop at every stage. Agent throughput limited by human availability.

### This Process

```
Human defines goals (ROADMAP) + principles (constitution) + success criteria (tests)
    ↓
Agent executes autonomously
    ↓
Human intervenes only on failure
    ↓
Repeat
```

**Bottleneck:** Agent compute time. Human only engaged for exceptions.

---

## The Key Insight

**Front-load the thinking, back-load the doing.**

Instead of:
- Human guides each step
- Agent asks permission frequently
- Reviews happen inline

Do:
- Human defines clear goals, principles, and success criteria upfront
- Agent executes against those definitions
- Human reviews outputs (commits, test results) asynchronously

The repo structure *is* the guidance. The tests *are* the approval criteria. The constitution *is* the style guide.

---

## Requirements for This to Work

### The Repo Must Have:

1. **Explicit task queue** — What to work on, in what order
2. **Executable success criteria** — Tests that define "done"
3. **Codified conventions** — Principles that answer design questions
4. **Predictable structure** — Where things go without asking
5. **Atomic task sizing** — Work that can be completed and committed

### The Agent Must:

1. **Read before acting** — Understand context from docs
2. **Follow conventions** — Apply principles consistently
3. **Test continuously** — Verify work against criteria
4. **Commit atomically** — Preserve valid states
5. **Signal blockers** — Escalate genuine stuck points

### The Human Must:

1. **Define goals clearly** — Unambiguous roadmap
2. **Write good tests** — Success criteria that actually test the requirement
3. **Codify principles** — Answer recurring questions once
4. **Trust the process** — Don't intervene unless blocked
5. **Respond to escalations** — Unblock when needed

---

## Metrics of Success

How do you know this is working?

| Metric | Good Sign |
|--------|-----------|
| Tasks completed per session | High (5-10+) |
| Human interventions per feature | Low (0-2) |
| Test pass rate at commit | High (100%) |
| Rework after commit | Low |
| Time from task start to commit | Short (minutes, not hours) |

---

## Anti-Patterns to Avoid

| Anti-Pattern | Why It Breaks Autonomy |
|--------------|------------------------|
| Vague requirements | Agent must ask for clarification |
| No tests | Agent can't verify completion |
| Inconsistent conventions | Agent must ask about style |
| Large tasks | Agent can't finish atomically |
| Pre-approval required | Human becomes bottleneck |
| Scattered documentation | Agent can't find context |

---

## Summary

This repo enables autonomous AI development through:

### Tooling
- **Claude (claude-code)** — Primary agent with full context
- **Gemini** — Antagonist agent for test review
- **tmux/ns** — Persistent sessions for long-running work
- **spec-kit** — Structured feature pipeline (`/speckit.*` commands)
- **dna/** — Project knowledge base
- **tc tests** — Executable specifications

### Structure
- **ROADMAP.md** — Unambiguous task queue
- **specs/{feature}/tasks.md** — Atomic work items
- **tests/** — Executable success criteria
- **constitution.md** — Pre-answered design questions
- **Consistent paths** — Predictable file locations
- **Result envelope** — Uniform interfaces

### Process
- **Failure-only checkpoints** — Human on exceptions, not approvals
- **Antagonistic testing** — Two agents, better specs
- **Atomic commits** — Each commit is a valid state
- **Self-documenting** — Progress visible in artifacts

The human's role shifts from **directing** to **defining goals and unblocking**.

The agent's role shifts from **asking** to **executing against specifications**.

---

## Quick Reference

```bash
# Start persistent session
~/bin/ns brane

# Feature development workflow
/speckit.specify "feature description"
/speckit.plan
/speckit.tasks
/speckit.implement

# Run tests
bun test

# Check roadmap
cat dna/product/ROADMAP.md
```

---

*"Front-load the thinking, back-load the doing."*

*"Tests are the specification. Humans define goals. Agents execute."*
