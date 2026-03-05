# Brane Demos: Real-World Codebase Extraction

Three real-world open-source projects analyzed through brane's ensemble extraction pipeline (AST + sentinels + LLM + adversarial re-extraction).

## Results at a Glance

| Project | Concepts | Caveats | Rules | Edges | Caveat Ratio |
|---------|----------|---------|-------|-------|-------------|
| [openai/whisper](./openai-whisper/) | 112 | 19 | 9 | 120 | 17% |
| [microsoft/presidio](./microsoft-presidio/) | 85 | 27 | 14 | 106 | 32% |
| [vercel/ai](./vercel-ai/) | 459 | 103 | 50 | 696 | 22% |
| **Total** | **656** | **149** | **73** | **922** | **23%** |

## Why These Projects

Each project was chosen because it has **good documentation AND complex code**, plus an ethical/safety dimension that makes brane's caveat extraction particularly valuable:

- **Whisper** — ML model where hardware fallbacks, hallucination detection, and lossy normalization are buried assumptions that cause production incidents
- **Presidio** — Privacy toolkit where every missed caveat is a potential GDPR/HIPAA violation. The `AutomatedDetectionLimitation` caveat CONFLICTS_WITH the core analyzer — the most important thing an integrator needs to know
- **Vercel AI SDK** — Agentic AI framework where tool approval flows, runaway loop conditions, and streaming edge cases are the safety surface

## Key Findings

### 1. Caveats are the signal

Across all three projects, **23% of all extracted concepts are caveats** — assumptions, limitations, gotchas, and edge cases. These are the concepts that traditional code analysis tools (type checkers, linters, dependency scanners) completely miss. They live in docstrings, comments, README prose, and implicit code patterns.

### 2. Caveat density correlates with integration risk

| Project | Caveat:Entity Ratio | Interpretation |
|---------|---------------------|----------------|
| Presidio | 27:44 (61%) | Extremely high — the gotchas _are_ the product |
| Vercel AI | 103:306 (34%) | High — deep abstraction layers hide complexity |
| Whisper | 19:84 (23%) | Moderate — focused ML pipeline, fewer integration surfaces |

Projects with higher caveat density are harder to integrate correctly. Brane quantifies this.

### 3. CONFLICTS_WITH edges surface real design tensions

- Whisper: `BeamSearchDecoder` CONFLICTS_WITH `GreedyDecoder` — mutually exclusive strategies
- Presidio: `AutomatedDetectionLimitation` CONFLICTS_WITH `PresidioAnalyzer` — fundamental tool limitation
- Presidio: `StanzaOptionalImport` CONFLICTS_WITH `StanzaNlpEngine` — soft dependency
- Vercel AI: 4 conflict edges across tool execution paths

These aren't bugs — they're **design decisions** that developers need to understand. Brane makes them explicit.

### 4. Provenance enables auditability

Every concept traces back to its source file(s). Concepts that appear in multiple files (like Presidio's `NlpEngine` appearing in 5 files) reveal the core abstractions. Concepts that appear in only one file reveal isolated concerns. This provenance map is essential for change impact analysis.

### 5. Scale works

The Vercel AI SDK (459 concepts, 696 edges) demonstrates that brane handles real-world codebases without degradation. The mermaid visualization truncates at 100 nodes by default, but the full graph is queryable via `brane graph` commands.

## How These Demos Were Generated

```bash
# Example: run the demo script on whisper
bash demos/run-demo.sh openai/whisper whisper/ README.md CHANGELOG.md LICENSE
```

The `run-demo.sh` script:
1. Shallow-clones the repo to a temp directory
2. Initializes brane (`body/init` + `mind/init`)
3. Ingests selected paths through the full ensemble pipeline
4. Dumps graph artifacts (summary, concepts, edges, viz, provenance)
5. Cleans up the temp directory

Each demo directory contains:
- `README.md` — Analysis and mermaid graph
- `summary.txt/json` — Concept and edge counts
- `concepts.txt/json` — All extracted concepts
- `edges.txt/json` — All extracted edges
- `viz-mermaid.txt` — Mermaid graph definition
- `viz-ascii.txt` — Terminal-friendly graph
- `provenance.md` — File-to-concept mapping

## Conclusion

Brane's ensemble extraction pipeline produces knowledge graphs that capture what code analysis tools cannot: the **implicit safety surface** of a codebase. Caveats, rules, conflicts, and design tensions are promoted from scattered prose and comments into structured, queryable, auditable graph data.

For safety-critical systems (PII detection, ML inference, agentic AI), this is not optional — it's the difference between understanding the code and understanding the system.
