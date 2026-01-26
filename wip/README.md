# Work In Progress

This directory is for **ephemeral, collaborative work** between human and AI.

## Files

| File | Purpose | Edited By | Lifespan |
|------|---------|-----------|----------|
| `prompt.md` | Current task/prompt | Human + AI | Per-task |
| `notes.md` | Short-term scratchpad | Human + AI | Per-session |
| `memory.md` | Long-term working memory | Human + AI | Per-phase |

## Usage

1. **Starting a task:** Write the task in `prompt.md`
2. **During work:** Capture decisions/scratch in `notes.md`
3. **Between sessions:** Persistent context stays in `memory.md`
4. **Task complete:** Clear `prompt.md`, archive useful bits from `notes.md` → `memory.md`

## vs. ai/ Directory

| Location | Purpose | Edited By |
|----------|---------|-----------|
| `wip/` | Ephemeral collaboration | Human + AI |
| `ai/NOTES.md` | AI's persistent short-term memory | AI only |
| `ai/MEMORY.md` | AI's persistent long-term memory | AI only |

The `ai/` files are the AI's private memory across all sessions - things the AI learns about the project, user preferences, and patterns that should persist even when `wip/` is cleared.
