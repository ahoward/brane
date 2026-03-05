# Feature Specification: Extraction Pipeline

**Feature Branch**: `034-extraction-pipeline`
**Created**: 2026-03-05
**Status**: Draft
**Input**: User description: "Ensemble extraction pipeline combining AST parsing (tree-sitter), sentinel checks (mandatory concepts from imports/types), ontology-driven LLM extraction (lens-guided), and adversarial re-extraction (LLM critique pass) to produce high-confidence knowledge graphs with coverage metrics"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - AST-Based Code Extraction (Priority: P1)

A developer runs `brane ingest src/` and brane mechanically parses source files to extract structural facts — imports, exports, function calls, type definitions, class hierarchies, and data flows — without relying on an LLM. The resulting knowledge graph contains concepts and edges that are guaranteed to exist in the source code.

**Why this priority**: This is the ground truth layer. Everything else builds on it. Without mechanical extraction, the entire pipeline depends on LLM interpretation, which is the core weakness being solved.

**Independent Test**: Ingest `corpus/code/panopticon.ts`, verify the graph contains every import, class, method, interface, and call-site as concepts/edges — with zero LLM involvement.

**Acceptance Scenarios**:

1. **Given** a TypeScript file with imports, classes, and method calls, **When** the user runs ingest, **Then** the graph contains concepts for each exported symbol, interface, and class, plus edges for import relationships, method calls, and type references.
2. **Given** a file with no LLM available (mock mode), **When** the user runs ingest, **Then** AST extraction still produces a complete structural graph.
3. **Given** a file in an unsupported language, **When** the user runs ingest, **Then** AST extraction is skipped gracefully and LLM extraction is used as fallback.

---

### User Story 2 - Sentinel Checks (Priority: P1)

After AST parsing identifies imports and type definitions, sentinel checks generate a list of mandatory concepts that must appear in the final graph. If LLM extraction later fails to mention a concept that the AST proves exists, the extraction is flagged as incomplete.

**Why this priority**: Sentinels are the bridge between AST and LLM extraction. They catch the most dangerous failure mode: the LLM silently omitting something that provably exists.

**Independent Test**: Ingest a file that imports `AdNetworkAPI`. Verify a sentinel is created for `AdNetworkAPI`. If LLM extraction produces a graph without an `AdNetworkAPI` concept, verify the extraction is flagged as incomplete with a coverage gap.

**Acceptance Scenarios**:

1. **Given** a file with `import { AdNetworkAPI } from "./vendors/ad-network"`, **When** AST extraction runs, **Then** a sentinel requiring an `AdNetworkAPI` concept is generated.
2. **Given** sentinels for 5 concepts and LLM extraction produces only 3 of them, **When** sentinel validation runs, **Then** the 2 missing concepts are reported as coverage gaps.
3. **Given** all sentinels are satisfied by the merged graph, **When** sentinel validation runs, **Then** the extraction is marked as complete with 100% sentinel coverage.

---

### User Story 3 - Ontology-Driven LLM Extraction (Priority: P2)

When a lens defines concept types and edge types that matter for its domain (e.g., `ProtectedData`, `ConsentCheck`, `AgeGate` for a child-safety lens), LLM extraction uses those types as a classification schema rather than performing open-ended extraction. The LLM is told what to look for, not just "extract whatever."

**Why this priority**: Turns unbounded LLM generation into bounded classification. Dramatically improves extraction consistency and relevance, but requires lenses to define ontologies first.

**Independent Test**: Create a child-safety lens with concept types `[ProtectedData, ConsentCheck, AgeGate, ExternalDataSharing]`. Ingest `corpus/code/panopticon.ts` under that lens. Verify the LLM is prompted with those types and the extracted concepts use them.

**Acceptance Scenarios**:

1. **Given** a lens with defined concept types and edge types, **When** the user runs ingest, **Then** the LLM extraction prompt includes those types as a classification schema.
2. **Given** no ontology defined on the active lens, **When** the user runs ingest, **Then** LLM extraction falls back to open-ended extraction (current behavior).
3. **Given** an ontology-driven extraction, **When** the LLM returns concepts, **Then** each concept's type matches one of the ontology's defined types or is flagged as uncategorized.

---

### User Story 4 - Adversarial Re-Extraction (Priority: P2)

After the initial graph is built (AST + LLM), a second LLM pass receives both the source file and the current graph, and is asked: "What did we miss? What data flows, external calls, sensitive data handling, or implicit relationships are not captured?" New concepts and edges from this critique pass are merged into the graph.

**Why this priority**: Catches subtle violations that neither AST nor first-pass LLM found. Critique is cognitively easier than generation — the second LLM sees gaps the first one created.

**Independent Test**: Ingest `corpus/code/oracle.ts` with initial extraction. Run adversarial pass. Verify the adversarial pass identifies that `zipCode` is used as a proxy for demographic data and that `generateExplanation` produces post-hoc rationalizations — relationships the first pass is likely to miss.

**Acceptance Scenarios**:

1. **Given** a file and its current extraction graph, **When** adversarial re-extraction runs, **Then** it returns additional concepts and edges not present in the initial graph.
2. **Given** a complete initial extraction where the adversarial pass finds nothing new, **When** the pass completes, **Then** it returns an empty delta and the graph is unchanged.
3. **Given** adversarial re-extraction is disabled (opt-out flag), **When** the user runs ingest, **Then** only AST + sentinel + initial LLM extraction runs.

---

### User Story 5 - Coverage Metrics (Priority: P1)

After extraction completes, the system reports a coverage metric: what percentage of the file's meaningful structural elements were captured in the graph. This is computed by comparing AST-discovered symbols against graph concepts. The user can see at a glance whether the graph is trustworthy.

**Why this priority**: Without coverage metrics, users can't distinguish a thorough extraction from a shallow one. This is the "did it work?" signal.

**Independent Test**: Ingest a file with 12 AST-discoverable symbols. Verify the coverage report shows `N/12` extracted, with the specific missing symbols listed.

**Acceptance Scenarios**:

1. **Given** a file with 10 exported symbols/types, **When** extraction completes and produces concepts for 8 of them, **Then** coverage is reported as 80% with the 2 missing symbols listed.
2. **Given** a prose file with no AST support, **When** extraction completes, **Then** coverage is reported as "not available — no AST support for this file type."
3. **Given** the `--json` flag, **When** the user runs ingest, **Then** coverage metrics are included in the JSON output per file.

---

### Edge Cases

- What happens when a file has valid syntax but no tree-sitter grammar is available? Falls back to LLM-only extraction with no coverage metric.
- How does the system handle minified or generated code? AST parsing works on any valid syntax, but extracted symbols may be meaningless (single-letter names). Sentinel check still runs but coverage metric notes "minified/generated" if symbol names are suspiciously short.
- What happens when the adversarial pass contradicts the initial extraction? Adversarial pass only adds — it does not remove concepts from the initial graph. Conflicts are surfaced in the coverage report.
- What happens when AST extraction and LLM extraction produce the same concept with different names? Merge uses name normalization (case-insensitive matching, stripping common prefixes/suffixes). Ambiguous matches are kept as separate concepts.
- What if the LLM is unavailable? AST extraction + sentinels still produce a structural graph. Coverage metric reflects AST-only extraction. LLM-dependent phases (ontology-driven, adversarial) are skipped with a warning.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST parse source files using language-aware AST parsing to extract structural elements (imports, exports, classes, interfaces, functions, method calls, type references).
- **FR-002**: System MUST generate sentinel concepts from AST-discovered imports and type definitions that must appear in the final graph.
- **FR-003**: System MUST validate extracted graphs against sentinels and report any sentinel concepts missing from the graph.
- **FR-004**: System MUST support ontology-driven LLM extraction where the active lens defines concept types and edge types to guide the extraction prompt.
- **FR-005**: System MUST fall back to open-ended LLM extraction when no ontology is defined on the active lens.
- **FR-006**: System MUST support an adversarial re-extraction pass that receives the source file and current graph, returning additional concepts and edges.
- **FR-007**: System MUST merge AST-extracted, LLM-extracted, and adversarial-extracted concepts into a single unified graph, deduplicating by name.
- **FR-008**: System MUST compute and report a coverage metric per file: percentage of AST-discovered symbols represented in the final graph.
- **FR-009**: System MUST list specific missing symbols in the coverage report.
- **FR-010**: System MUST support at least TypeScript and JavaScript for AST extraction at launch, with a clear path for adding languages.
- **FR-011**: System MUST gracefully skip AST extraction for unsupported languages and fall back to LLM-only extraction.
- **FR-012**: System MUST allow users to disable the adversarial re-extraction pass via a flag.
- **FR-013**: System MUST tag each concept with its extraction source (AST, LLM, adversarial) for traceability.
- **FR-014**: System MUST include coverage metrics in JSON output when the `--json` flag is used.

### Key Entities

- **Extraction Source**: The origin of a concept or edge — AST, LLM (initial), LLM (adversarial). Used for confidence weighting and traceability.
- **Sentinel**: A mandatory concept derived from AST analysis (imports, type definitions) that must appear in the final graph. Used to validate extraction completeness.
- **Coverage Report**: Per-file metric showing the ratio of AST-discovered symbols to graph concepts, plus a list of unmatched symbols.
- **Ontology Schema**: A set of concept types and edge types defined on a lens, used to guide LLM extraction from open-ended generation to bounded classification.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Extraction of `corpus/code/panopticon.ts` captures 100% of imports, classes, interfaces, and method call relationships without LLM involvement (AST only).
- **SC-002**: Sentinel checks detect at least 90% of cases where LLM extraction omits a concept that exists as an import or type definition in the source.
- **SC-003**: Ontology-driven extraction produces concepts matching the lens-defined types in at least 80% of cases, compared to open-ended extraction which may use arbitrary type names.
- **SC-004**: Coverage metrics are reported for every file with AST support, showing the specific ratio and listing missing symbols.
- **SC-005**: The adversarial re-extraction pass identifies at least one additional concept or relationship in 50%+ of files containing subtle structural patterns (proxy variables, post-hoc explanations, missing consent flows).
- **SC-006**: The full pipeline (AST + sentinels + LLM + adversarial) completes within 3x the time of current LLM-only extraction per file.
- **SC-007**: All existing tests continue to pass (zero regressions from the current 328-test suite).

## Assumptions

- Tree-sitter grammars are available as packages for TypeScript/JavaScript. Additional languages can be added by installing their grammar packages.
- The adversarial re-extraction prompt is effective because critique is a simpler cognitive task than generation — the LLM can identify gaps in a presented graph more easily than generating a complete graph from scratch.
- Ontology schemas on lenses are optional. Lenses without ontologies use the current open-ended extraction behavior.
- Coverage metrics only apply to languages with AST support. Prose files report "coverage not available."
- Name normalization for concept deduplication uses case-insensitive matching. More sophisticated deduplication (embeddings-based) is out of scope for this feature.

## Scope Boundaries

**In scope:**
- AST extraction for TypeScript/JavaScript via tree-sitter
- Sentinel generation from imports and type definitions
- Sentinel validation against merged graph
- Ontology-driven LLM extraction prompts
- Adversarial re-extraction pass
- Graph merging and concept deduplication
- Per-file coverage metrics
- Extraction source tagging on concepts

**Out of scope:**
- AST support for languages beyond TypeScript/JavaScript (future feature)
- Embeddings-based concept deduplication
- Automatic ontology generation from existing graphs
- Confidence-weighted rule evaluation (future feature)
- Changes to the `brane verify` command
