# Working Memory (Long-Term for WIP)

*Persists across sessions within this work phase. Jointly edited.*

---

## Project Identity

- **Name:** Brane
- **Tagline:** "Strings must attach to a Brane, or they are lost."
- **Core Thesis:** AI Agents need structured memory, not bigger context windows.

## Architecture Decisions (Locked)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Runtime | Bun.js | Speed, TS-native, single binary |
| Body DB | SQLite | Ubiquity, FTS5, stability |
| Mind DB | CozoDB | Datalog inference, vectors, time-travel |
| Interface | sys.call | Brutal consistency, testable |
| Tests | tc | Language-agnostic, spec-as-contract |

## Key Terminology

- **Body** (`.brane/body.db`) - Physical reality: files, hashes, chunks
- **Mind** (`.brane/mind.db`) - Semantic reality: concepts, edges, rules
- **Calabi** - The projection engine (text → graph)
- **Provenance** - Links between Mind concepts and Body files

## User Preferences (ara)

- Prefers "hacker aesthetic" over enterprise polish
- Values brutal consistency over flexibility
- Likes M-theory / physics metaphors
- 143 Ruby gems background → POD-first, no magic

## References

- Gemini conversation: `./dna/research/gemini-architecture-conversation.md`
- PRD: `./dna/product/prd.md`
- Coding conventions: `./dna/technical/coding-conventions.md`
