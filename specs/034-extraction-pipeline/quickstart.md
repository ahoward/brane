# Quickstart: 034-extraction-pipeline

## AST-only extraction (no LLM needed)

```bash
brane init
brane ingest --ast-only corpus/code/panopticon.ts
brane concept list
# shows: BehaviorTracker, UserProfile, MinorProfile, AdNetworkAPI, LawEnforcementGateway
# all extracted mechanically from AST — no LLM involved
```

## Full pipeline (AST + LLM + adversarial)

```bash
brane ingest corpus/code/panopticon.ts
# 1. AST parse → structural concepts + sentinels
# 2. LLM extraction → semantic concepts + edges
# 3. Merge + sentinel check → coverage report
# 4. Adversarial pass → gap detection
```

## Coverage metrics

```bash
brane ingest corpus/code/panopticon.ts --json
# per-file output includes:
#   "coverage": { "total_sentinels": 10, "matched_sentinels": 8, "coverage_pct": 80, "missing": [...] }
```

## Skip adversarial pass (faster)

```bash
brane ingest src/ --no-adversarial
```

## Ontology-driven extraction (with lens)

```bash
brane lens create child-safety
brane lens use child-safety
# edit .brane/lens/child-safety/config.yaml to add:
#   ontology:
#     concept_types: [ProtectedData, ConsentCheck, AgeGate, ExternalService]
#     edge_types: [PROCESSES, CALLS, VERIFIED_BY, SHARES_WITH]
brane ingest corpus/code/panopticon.ts
# LLM extraction is guided by the ontology types
```

## API mode

```bash
# AST extraction only
echo '{"file_url": "file:///project/src/auth.ts", "content": "..."}' | brane /calabi/extract-ast

# Coverage for an already-ingested file
echo '{"file_url": "file:///project/src/auth.ts"}' | brane /calabi/coverage
```
