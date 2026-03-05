# Research: Extraction Pipeline

## Decision 1: AST Parsing Approach

**Decision**: Use `web-tree-sitter` (WASM) + `tree-sitter-wasms` for multi-language AST parsing.

**Rationale**: `ahoward/bunny` already has a proven, battle-tested implementation (`src/lib/map.ts`) using this exact stack in a Bun project that compiles to a single binary. It supports TS, JS, Ruby, Python, Go with hand-written extractors, plus 20+ additional languages via auto-generated extractors. The pattern is proven to work with `bun build --compile`.

**Alternatives considered**:

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| `ts.createSourceFile` (TS Compiler API) | Already a dep, rich typed AST | TS/JS only, no multi-lang path, ~9MB binary increase | Rejected — single-language lock-in |
| `Bun.Transpiler.scan()` | Zero-cost, built-in | Imports/exports only, no structural info | Useful as fast pre-filter, not primary |
| `web-tree-sitter` + `tree-sitter-wasms` | Multi-language, WASM (no native deps), proven in bunny | ~52MB unpacked for all grammars, WASM loading complexity | **Selected** — multi-lang from day one |

**Key implementation details from bunny**:
- Singleton parser with lazy language loading
- `require("web-tree-sitter")` for Bun compat (not import)
- WASM files loaded from `node_modules/tree-sitter-wasms/out/`
- Per-language extractor functions: `(root_node) => { symbols, imports }`
- Clean POD output: `MapSymbol { kind, name, signature, line, children }`
- For compiled binary: WASM files need to be accessible at runtime (loaded from filesystem, not embedded)

**Versioning note**: `web-tree-sitter@0.25.3` + `tree-sitter-wasms@0.1.13` — must match ABI versions. `web-tree-sitter` 0.26.x has ABI incompatibilities with older WASM files.

## Decision 2: Extractor Architecture

**Decision**: Port bunny's extractor pattern. Hand-written extractors for TS/JS (P1), extensible to Python/Ruby/Go later.

**Rationale**: Bunny's `extract_typescript` function is ~70 lines and extracts imports, exported functions, classes (with methods), interfaces, type aliases, and constants. This is exactly what brane needs for sentinel generation and coverage metrics.

**Key types to extract**:
- Imports (module paths + named bindings)
- Exported functions (name, signature, line)
- Classes (name, methods as children)
- Interfaces (name, line)
- Type aliases (name, line)
- Constants (name, line)

## Decision 3: Sentinel Implementation

**Decision**: Sentinels are derived from AST imports and type definitions. A sentinel is a concept name that must appear in the merged graph.

**Rationale**: If the AST proves `AdNetworkAPI` is imported, and the LLM graph has no `AdNetworkAPI` concept, the extraction missed something real. Sentinels are cheap (string comparison) and catch the most dangerous failure mode (silent omission).

**Sentinel sources**:
- Import named bindings: `import { AdNetworkAPI } from "./vendors"` → sentinel `AdNetworkAPI`
- Class declarations: `class BehaviorTracker` → sentinel `BehaviorTracker`
- Interface declarations: `interface MinorProfile` → sentinel `MinorProfile`

## Decision 4: Coverage Metrics

**Decision**: Coverage = (sentinels matched / total sentinels) as a percentage, plus list of unmatched symbols.

**Rationale**: Simple, actionable, and computable without LLM involvement. The user sees "8/12 symbols covered (67%)" and knows to investigate the 4 gaps.

## Decision 5: Ontology-Driven Extraction

**Decision**: Lens config (YAML) gains optional `ontology.concept_types` and `ontology.edge_types` arrays. When present, the LLM extraction prompt includes them as a classification schema.

**Rationale**: Bounded classification is more reliable than open-ended generation. The lens already defines the domain; the ontology makes it explicit for the LLM.

## Decision 6: Adversarial Re-Extraction

**Decision**: Second LLM pass receives source file + current graph (as JSON), prompted to find gaps. Returns additional concepts/edges only (additive, never removes).

**Rationale**: Critique is cognitively easier than generation. The second pass can see what the first pass missed precisely because it has the first pass's output to compare against.

## Decision 7: WASM Loading in Compiled Binary

**Decision**: For `bun build --compile`, WASM grammar files are loaded from filesystem relative to the binary location, with fallback to `node_modules/` path for dev mode.

**Rationale**: Bunny uses this pattern. WASM files from `tree-sitter-wasms` are ~1-3MB each. They can be distributed alongside the binary or bundled into the binary's resource directory. For dev mode, load directly from `node_modules/tree-sitter-wasms/out/`.

## Dependencies

- `web-tree-sitter@0.25.3` — WASM-based tree-sitter runtime
- `tree-sitter-wasms@0.1.13` — precompiled WASM grammars for 30+ languages
