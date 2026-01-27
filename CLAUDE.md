# Brane - Claude Code Context

## What This Is

Brane is the "Semantic Nervous System" for software projects - a local-first Knowledge Graph CLI using a Split-Brain Architecture (SQLite Body + CozoDB Mind).

## Core Architecture: sys.call

All operations use a single, consistent interface:

```typescript
const result = await sys.call("/namespace/method", data)
```

**Always returns:**
```typescript
{
  status: "success" | "error",
  result: T | null,
  errors: ErrorMap | null,  // mirrors result structure
  meta: { path, timestamp, duration_ms }
}
```

## Key Files

- `./dna/product/prd.md` - Full PRD (Split-Brain architecture, roadmap)
- `./dna/technical/coding-conventions.md` - Detailed coding conventions
- `./dna/technical/development-loop.md` - Antagonistic Testing process
- `./ai/CODE.md` - Quick reference for code style
- `./ai/MEMORY.md` - AI's long-term memory (READ THIS)

## Development Process: Antagonistic Testing

**See:** `./dna/technical/development-loop.md` and `.specify/memory/constitution.md`

1. Design interface → 2. Design tests (Claude) → 3. Review tests (Gemini)
4. Implement → 5. Loop until green → 6. **⛔ HUMAN CHECKPOINT** (only if stuck)

**Gemini** = antagonist agent. Reviews tests, finds blind spots.
Human checkpoint is for failure resolution, not pre-approval.

## Coding Conventions Summary

1. **POD only** - Plain Old Data in/out, no classes for data
2. **Result envelope** - Every call returns same shape
3. **Error mirror** - Errors mirror result structure with arrays at leaves
4. **Guard early** - Return errors at function top
5. **Handlers by path** - `src/handlers/body/files/hash.ts` → `/body/files/hash`
6. **tc tests** - Language-agnostic JSON in/out

## Commands

```bash
bun run repl          # Start REPL
bun test              # Run tc tests
```

## Directory Structure

```
src/
├── index.ts          # entry
├── repl.ts           # REPL
├── sys.ts            # sys.call implementation
├── handlers/         # by path: /body/files/hash → handlers/body/files/hash.ts
└── lib/              # shared utilities
tests/                # tc test suites
dna/                  # project knowledge
ai/                   # AI agent resources
```

## Don't

- Use classes for data
- Throw exceptions for control flow
- Return different shapes from handlers
- Skip the Result envelope
- Implement without tests
- Skip Gemini review
- Change tests after review without human approval
