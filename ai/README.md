# AI Agent Resources

This directory contains AI-agnostic guidelines, context, and persistent memory for working on Brane.

## Contents

| File | Purpose | Managed By |
|------|---------|------------|
| `CODE.md` | Coding conventions, patterns | Human (reference) |
| `NOTES.md` | Short-term memory (session observations) | AI |
| `MEMORY.md` | Long-term memory (permanent learnings) | AI |

## Memory System

### AI-Managed Files

- **NOTES.md** - Observations from current/recent sessions. Patterns noticed, clarifications needed, technical debt. Refreshed periodically.
- **MEMORY.md** - Permanent knowledge about project, user preferences, and learned patterns. Grows over time, rarely deleted.

### Collaborative Files (in `wip/`)

- `wip/prompt.md` - Current task (human + AI)
- `wip/notes.md` - Session scratchpad (human + AI)
- `wip/memory.md` - Phase-level context (human + AI)

### Flow

```
Human edits wip/prompt.md → AI reads → AI works
                              ↓
AI observes → AI updates ai/NOTES.md (short-term)
                              ↓
AI learns → AI updates ai/MEMORY.md (long-term)
```

## Usage by AI System

### Claude Code
- Automatically loaded via `.claude/` configuration
- Should read `ai/MEMORY.md` at session start
- Should update `ai/NOTES.md` during/after sessions

### Cursor / Other Editors
- Add to `.cursorrules`: `Include guidelines from ./ai/CODE.md`
- Reference `ai/MEMORY.md` for user preferences

### API Usage
```typescript
const code = await Bun.file('./ai/CODE.md').text()
const memory = await Bun.file('./ai/MEMORY.md').text()
```

## Key Concepts

1. **sys.call interface** - All operations go through `sys.call("/path", data)`
2. **Result envelope** - Every call returns `{ status, result, errors, meta }`
3. **POD only** - Plain Old Data in, Plain Old Data out
4. **tc tests** - Language-agnostic JSON in/out testing
