# Data Model: Extraction Pipeline

## No New Schema

The extraction pipeline operates on existing relations (concepts, edges, provenance). No new CozoDB relations are required.

## New POD Types (internal, not persisted)

### ASTSymbol

Extracted structural element from AST parsing.

```
ASTSymbol {
  kind:       "function" | "class" | "type" | "interface" | "constant" | "method" | "module"
  name:       string
  signature:  string | null
  line:       number
  children:   ASTSymbol[]
}
```

### FileAST

AST extraction result for a single file.

```
FileAST {
  path:       string
  language:   string
  imports:    string[]       // module paths
  symbols:    ASTSymbol[]    // exported/public symbols
}
```

### Sentinel

A mandatory concept that must appear in the merged graph.

```
Sentinel {
  name:       string         // e.g., "AdNetworkAPI"
  source:     "import" | "class" | "interface" | "type"
  file_url:   string         // provenance
}
```

### CoverageReport

Per-file extraction completeness metric.

```
CoverageReport {
  file_url:          string
  total_sentinels:   number
  matched_sentinels: number
  coverage_pct:      number         // 0-100
  missing:           string[]       // unmatched sentinel names
}
```

### ExtractionSource

Tag on concepts indicating how they were extracted. Stored as concept metadata or annotation.

```
ExtractionSource: "ast" | "llm" | "adversarial"
```

## Modified Entities

### Lens Config (existing YAML)

Optional new fields for ontology-driven extraction:

```yaml
ontology:
  concept_types:
    - ProtectedData
    - ConsentCheck
    - AgeGate
    - ExternalService
  edge_types:
    - PROCESSES
    - CALLS
    - VERIFIED_BY
    - SHARES_WITH
```

When present, LLM extraction is guided by these types.

## Relationships

```
source file → AST parse → FileAST (symbols, imports)
FileAST → sentinel generation → Sentinel[]
source file → LLM extraction → concepts + edges (guided by ontology if present)
AST concepts + LLM concepts → merge → unified graph
Sentinel[] + merged graph → coverage validation → CoverageReport
merged graph + source file → adversarial LLM → additional concepts + edges
```
