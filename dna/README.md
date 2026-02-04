# Company DNA

This directory contains organized company and product knowledge for humans and AI assistants.

## How to Use

1. **Add new content**: Drop files in `_/inbox/` then run `/dna.process`
2. **Find content**: Use `ls`, `find`, `grep` or read this index
3. **Reorganize**: Run `/dna.organize` to optimize structure

<!-- AUTO-GENERATED START - Do not edit below this line -->
## Directory Structure

Last updated: 2026-02-03

### Categories

- **product/** - Product vision, roadmaps, and requirements
  - `vision.md` - **START HERE** — The Subjective Linter vision (ethics, lenses, multi-modal)
  - `prd.md` - PRD v3.0 (Split-Brain Architecture, business model, roadmap)
  - `ROADMAP.md` - Development roadmap and feature tracking

- **technical/** - Technical documentation and conventions
  - `coding-conventions.md` - sys.call interface, Result envelope, TypeScript patterns
  - `tc-testing.md` - tc test framework conventions (language-agnostic JSON in/out)
  - `development-loop.md` - Antagonistic Testing process

- **research/** - Research, analysis, and exploration
  - `gemini-architecture-conversation.md` - Original architecture discussion (Split-Brain, CozoDB)
  - `graphrag-survey-2501.00309.md` - GraphRAG survey: 5-component framework
  - `graphrag-microsoft-2404.16130.md` - Microsoft GraphRAG: community detection

### Quick Navigation

| Looking for... | Go to... |
|----------------|----------|
| **Vision & Philosophy** | `./product/vision.md` |
| Product requirements | `./product/prd.md` |
| Roadmap | `./product/ROADMAP.md` |
| Split-Brain architecture | `./product/prd.md` (Section 4) |
| Lenses (shareable values) | `./product/vision.md` |
| Multi-modal application | `./product/vision.md` |
| sys.call interface | `./technical/coding-conventions.md` |
| Result envelope | `./technical/coding-conventions.md` |
| Testing conventions | `./technical/tc-testing.md` |
| Business model | `./product/prd.md` (Section 6) |

### Key Concepts

| Term | Definition |
|------|------------|
| **Subjective Linter** | Checks alignment with human-defined values, not just syntax |
| **Lens** | Shareable ontology configuration (concept types, relations, rules) |
| **Body** | SQLite database for physical reality (files, hashes, FTS) |
| **Mind** | CozoDB database for semantic reality (concepts, edges, rules) |
| **Calabi** | LLM extraction engine that projects meaning onto the graph |
| **Attestation** | Edge documenting human review/approval of a decision |

<!-- AUTO-GENERATED END - Do not edit above this line -->

## Custom Notes

### The Core Insight

Every linter encodes values. ESLint says "semicolons matter." Security scanners say "CVEs matter." But they can't answer "does this align with *our* values?"

Brane is a **subjective linter**—it checks alignment with human-defined values encoded as a knowledge graph with verifiable rules.

**Ethics without enforcement is theater.**

### References

- [IC Principles of AI Ethics](https://www.intel.gov/principles-of-artificial-intelligence-ethics-for-the-intelligence-community)
- [ICD-505: Artificial Intelligence](https://www.dni.gov/files/documents/ICD/ICD-505-Artificial-Intelligence.pdf)
- [NSM-25 AI Framework](https://bidenwhitehouse.archives.gov/briefing-room/statements-releases/2024/10/24/fact-sheet-biden-harris-administration-outlines-coordinated-approach-to-harness-power-of-ai-for-u-s-national-security/)
