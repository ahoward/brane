---

# Product Requirements Document: Brane

**Version:** 3.0 (The Subjective Linter)
**Date:** February 2026
**Status:** Active Development
**Codename:** *Calabi*

## 1. Executive Summary

**Brane** is a subjective linter—a local-first knowledge graph CLI that checks alignment with human-defined values encoded as verifiable rules.

Every linter encodes values. ESLint says "semicolons matter." Security scanners say "CVEs matter." But they can't answer "does this align with *our* values?"

Brane makes values machine-readable: ethics policies, architectural constraints, compliance requirements—encoded as concepts, edges, and Datalog rules in a knowledge graph. The result is **auditable compliance**, not checkbox compliance.

**Core Thesis:** Ethics without enforcement is theater. PDF policies get filed and ignored. Brane makes them executable.

**Tagline:** *The git of ethics.*

---

## 2. The Problem

Organizations have ethics documents. Acceptable Use Policies. ICD-505. GDPR. The NSM-25 AI Framework. Clean Architecture principles.

They're PDFs. They get read once, filed, and ignored.

When an engineer ships code, they don't check it against the ethics PDF. When an LLM generates content, nobody verifies it against policy. When an AI system makes a decision, the audit trail is logs, not reasoning.

**The gap:** Values exist in documents. Verification exists in linters. But linters only check syntax—not meaning, not intent, not ethics.

---

## 3. The Solution

Brane bridges the gap by making values machine-readable:

```
Values (human documents)
    ↓ encode as
Knowledge Graph (concepts + edges + rules)
    ↓ apply to
Content (code, prose, media, decisions)
    ↓ produces
Violations (specific, auditable, actionable)
    ↓ enables
Human Review (targeted, efficient)
    ↓ creates
Attestations (provenance, accountability)
```

### 3.1. Lenses: Shareable Value Systems

Different domains have different values. **Lenses** are shareable ontology configurations:

```yaml
# ethics-ic.lens.yaml
name: "IC AI Ethics Framework"
version: "1.0"
source: "ICD-505 / NSM-25"

concept_types:
  - Action
  - Decision
  - AutomatedDecision
  - ProtectedRight
  - Dataset
  - AISystem

edge_relations:
  - AFFECTS
  - HAS_LEGAL_BASIS
  - REQUIRES_HUMAN_REVIEW
  - BIAS_ASSESSED

rules:
  - name: human_loop_required
    severity: error
    principle: "4. Human-Centered"
    body: |
      violations[id, name, 'missing_human_loop'] :=
        *concepts[id, name, 'AutomatedDecision', _],
        *edges[_, id, right_id, 'IMPACTS', _],
        *concepts[right_id, _, 'ConstitutionalRight', _],
        not *edges[_, id, _, 'REQUIRES_HUMAN_REVIEW', _]
```

Organizations publish and share lenses:

| Lens | Domain | Source |
|------|--------|--------|
| `ethics-ic` | Intelligence Community | ICD-505, NSM-25 |
| `ethics-gdpr` | EU Data Protection | GDPR Articles |
| `ethics-hipaa` | Healthcare | HIPAA Security Rule |
| `arch-clean` | Software Architecture | Clean Architecture |
| `security-owasp` | Application Security | OWASP Top 10 |

### 3.2. Multi-Modal Application

Brane is content-agnostic:

| Content | Extract | Verify |
|---------|---------|--------|
| Source code | functions, data flows, decisions | architecture, security, ethics |
| Policy docs | entities, actions, rights | completeness, consistency |
| AI model cards | training data, limitations | bias assessment, documentation |
| Decisions | inputs, reasoning, outputs | human oversight, audit trail |
| Media | metadata, subjects, context | consent, attribution |

---

## 4. Technical Architecture: The "Split-Brain"

The system resides in a `.brane/` directory. Two databases, each optimized for its domain.

### 4.1. The Body (`.brane/body.db`)

**Engine:** `Bun:SQLite` (WAL Mode)
**Role:** Physical reality—files, hashes, content indexing.
**Schema:**
- `files`: Path, Hash (SHA-256), Size, LastModified
- `files_fts`: Full-Text Search (FTS5)

### 4.2. The Mind (`.brane/mind.db`)

**Engine:** `CozoDB` (Datalog + Vector)
**Role:** Semantic reality—concepts, edges, rules, vectors.
**Schema:**
- `concepts`: `{id, name, type, vector<384>}`
- `edges`: `{id, source, target, relation, weight}`
- `rules`: `{name, description, body, builtin}`
- `provenance`: `{concept_id, file_url}`
- `annotations`: `{id, concept_id, text, authority}`

### 4.3. The Bridge (CLI)

**Engine:** `Bun.js` (TypeScript)
**Role:** The corpus callosum.
- Reads changes from Body
- Extracts structure via Calabi Engine (LLM)
- Writes logic to Mind
- Queries Mind to verify Body

---

## 5. Core Features

### 5.1. Verification: The "Immune System"

**Command:** `brane verify`

1. Load rules from Mind (builtin + custom)
2. Execute each rule as Datalog query
3. Collect violations
4. Report with severity and provenance

```bash
$ brane verify
Running 5 rules...

FAIL: human_loop_required
  Violation: AutomatedDecision "risk_scorer" impacts ConstitutionalRight "due_process"
             but has no REQUIRES_HUMAN_REVIEW edge
  Provenance: src/scoring/risk.ts:42

FAIL: bias_assessment_required
  Violation: Classifier "fraud_detector" trained on Dataset "transactions_2023"
             but dataset has no BIAS_ASSESSED edge
  Provenance: models/fraud.py:15

2 violations found
```

### 5.2. Attestation Loop

Verification isn't one-shot. It's a conversation:

1. Content → Extract → Knowledge Graph
2. Apply lens → Violations found
3. Human review → Choose action:
   - Remediate (fix the violation)
   - Justify (add exception with rationale)
   - Escalate (flag for authority)
4. Add attestation edges:
   - `REVIEWED_BY` → person
   - `EXCEPTION_APPROVED_BY` → authority
   - `COMPLIANT_WITH` → standard
5. Re-verify → Clean or documented exceptions
6. Provenance chain preserved

### 5.3. Graph Exploration

**Commands:** `brane graph [summary|concepts|edges|neighbors|viz]`

- Summary: counts and distributions
- Concepts: list with type filtering
- Edges: list with relation filtering
- Neighbors: show connected concepts
- Viz: ASCII or Mermaid visualization

### 5.4. Semantic Search

**Command:** `brane search <query>`

Vector similarity search over concepts using local embeddings (fastembed-js, 384 dims). No external API calls.

### 5.5. Context Retrieval

**Command:** `brane context query <question>`

Graph-aware context retrieval combining:
- Semantic search (vector similarity)
- Graph expansion (related concepts)
- Provenance lookup (source files)

---

## 6. Business Model

### Tier 1: The Standard (OSS)

- **Product:** `brane-cli`
- **Price:** Free / Apache 2.0
- **Value:** Local-first subjective linting
- **Strategy:** Ubiquity. "If it doesn't have a `.brane` folder, you can't verify its values."

### Tier 2: The Cloud (SaaS)

- **Product:** Brane Team
- **Price:** $20/seat/month
- **Value:**
  - Real-time sync across team
  - Web-based graph explorer
  - Shared lenses with access control
  - Audit log aggregation

### Tier 3: The Protocol (Verification)

- **Product:** Brane Verifier Network
- **Price:** Transaction fees (CTX token)
- **Mechanism:**
  1. Company posts task with lens requirements
  2. Agent submits work
  3. Decentralized verifier runs `brane verify`
  4. Smart contract releases payment on pass

---

## 7. Roadmap

### Phase 1: The Skeleton ✓
Body.db, file tracking, FTS.

### Phase 2: The Mind ✓
CozoDB, concepts, edges, Calabi extraction.

### Phase 3: The Shield ✓
Rules, verification, annotations, graph exploration.

### Phase 4: The Network (Current)
Decentralized verification protocol.

### Phase 5: The Ecosystem (Future)
- Lens marketplace
- Pre-built compliance lenses (GDPR, HIPAA, SOC2)
- IDE integrations
- CI/CD plugins

---

## 8. Philosophy

Traditional linters are *syntactic*—they check form.
Brane is *semantic*—it checks meaning.

But meaning is subjective. "Good code" depends on context. "Ethical AI" depends on values. "Compliant" depends on jurisdiction.

Brane doesn't pretend objectivity. It makes subjectivity *explicit*:

- **Your values** are encoded in lenses
- **Your rules** define what violations mean
- **Your attestations** create the audit trail
- **Your provenance** links everything to source

The subjectivity is the feature, not the bug. Different organizations have different values. Brane lets you encode yours and verify against them.

---

## 9. References

- [IC Principles of AI Ethics](https://www.intel.gov/principles-of-artificial-intelligence-ethics-for-the-intelligence-community)
- [ICD-505: Artificial Intelligence](https://www.dni.gov/files/documents/ICD/ICD-505-Artificial-Intelligence.pdf)
- [NSM-25 AI Framework](https://bidenwhitehouse.archives.gov/briefing-room/statements-releases/2024/10/24/fact-sheet-biden-harris-administration-outlines-coordinated-approach-to-harness-power-of-ai-for-u-s-national-security/)
- [Framework to Advance AI Governance and Risk Management in National Security](https://www.whitehouse.gov/wp-content/uploads/2024/10/AI-Framework.pdf)

---

*End of PRD v3.0*
