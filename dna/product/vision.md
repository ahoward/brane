# Brane: The Subjective Linter

**Version:** 3.0
**Date:** February 2026

---

## The Insight

Every linter encodes values. ESLint says "semicolons matter." Prettier says "consistency matters." Security scanners say "CVEs matter."

These are *objective* linters—they check syntax, patterns, known-bad hashes. They answer "does this code conform to rules?" But they can't answer "does this code align with our values?"

**Brane is a subjective linter.** It checks alignment with human-defined values—ethics, policy, architecture, intent—encoded as a knowledge graph with verifiable rules.

---

## The Problem with "AI Ethics"

Every organization has ethics documents. Principles of AI Ethics. Acceptable Use Policies. ICD-505. GDPR. The NSM-25 AI Framework.

They're PDFs. They get read once, filed, and ignored.

When an engineer ships code, they don't check it against the ethics PDF. When an LLM generates content, nobody verifies it against the acceptable use policy. When an AI system makes a decision, the audit trail is logs, not reasoning.

**Ethics without enforcement is theater.**

---

## The Solution: Executable Values

Brane makes values machine-readable:

```
Values (human)
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

### Example: IC AI Ethics as Brane Rules

The Intelligence Community's [Principles of AI Ethics](https://www.intel.gov/principles-of-artificial-intelligence-ethics-for-the-intelligence-community) define six principles:

1. **Respect the Law and Act with Integrity**
2. **Transparent and Accountable**
3. **Objective and Equitable**
4. **Human-Centered Development and Use**
5. **Secure and Resilient**
6. **Informed by Science and Technology**

These become Datalog rules:

```datalog
-- Principle 1: Actions affecting rights need legal basis
violations[id, name, 'missing_legal_basis'] :=
  *concepts[id, name, 'Action', _],
  *edges[_, id, right_id, 'AFFECTS', _],
  *concepts[right_id, _, 'ProtectedRight', _],
  not *edges[_, id, _, 'HAS_LEGAL_BASIS', _]

-- Principle 2: Decisions need accountability
violations[id, name, 'unaccountable_decision'] :=
  *concepts[id, name, 'Decision', _],
  not *edges[_, id, _, 'OWNED_BY', _]

-- Principle 3: Classifiers need bias assessment
violations[id, name, 'unassessed_bias'] :=
  *concepts[id, name, 'Classifier', _],
  *edges[_, id, data_id, 'TRAINED_ON', _],
  not *edges[_, data_id, _, 'BIAS_ASSESSED', _]

-- Principle 4: Automated decisions on rights need human review
violations[id, name, 'missing_human_loop'] :=
  *concepts[id, name, 'AutomatedDecision', _],
  *edges[_, id, right_id, 'IMPACTS', _],
  *concepts[right_id, _, 'ConstitutionalRight', _],
  not *edges[_, id, _, 'REQUIRES_HUMAN_REVIEW', _]

-- Principle 5: AI systems need adversarial testing
violations[id, name, 'untested_security'] :=
  *concepts[id, name, 'AISystem', _],
  not *edges[_, id, _, 'ADVERSARIAL_TESTED', _]

-- Principle 6: Claims need citations
violations[id, name, 'unsupported_claim'] :=
  *concepts[id, name, 'Claim', _],
  not *edges[_, id, _, 'CITES', _]
```

Now `brane verify` checks content against ethics—not vibes.

---

## Lenses: Shareable Value Systems

Different domains have different values. Brane supports **lenses**—shareable ontology configurations that encode domain-specific concept types, relations, and rules.

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
  - Claim
  - Person
  - Authority

edge_relations:
  - AFFECTS
  - HAS_LEGAL_BASIS
  - DOCUMENTED_BY
  - OWNED_BY
  - TRAINED_ON
  - BIAS_ASSESSED
  - REQUIRES_HUMAN_REVIEW
  - ADVERSARIAL_TESTED
  - CITES
  - APPROVED_BY

rules:
  - name: lawful_actions
    severity: error
    principle: "1. Respect Law & Integrity"
    body: |
      violations[...] := ...
```

Organizations can publish, share, and compose lenses:

| Lens | Domain | Source |
|------|--------|--------|
| `ethics-ic` | Intelligence Community | ICD-505, NSM-25 |
| `ethics-gdpr` | EU Data Protection | GDPR Articles |
| `ethics-hipaa` | Healthcare | HIPAA Security Rule |
| `ethics-fair-ml` | ML Fairness | Disparate impact law |
| `arch-clean` | Software Architecture | Clean Architecture |
| `security-owasp` | Application Security | OWASP Top 10 |

---

## Multi-Modal Application

Brane is content-agnostic. The same verification pattern works across:

### Source Code
```
code → extract concepts (functions, data flows, decisions)
     → apply rules (security, architecture, ethics)
     → violations ("AI decision in auth.ts lacks human review")
```

### Prose / Policy Documents
```
document → extract concepts (entities, actions, rights)
         → apply rules (completeness, consistency, compliance)
         → violations ("Policy lacks accountability chain")
```

### AI Model Cards
```
model card → extract concepts (training data, limitations, uses)
           → apply rules (documentation, bias assessment)
           → violations ("No bias assessment for training data")
```

### Images / Media
```
media → extract metadata (subjects, context, provenance)
      → apply rules (consent, attribution, usage rights)
      → violations ("No consent record for subject")
```

### Decisions / Audit Trails
```
decision log → extract concepts (inputs, reasoning, outputs)
             → apply rules (human oversight, documentation)
             → violations ("Automated decision lacks human review")
```

---

## The Attestation Loop

Verification isn't one-shot. It's a conversation:

```
1. Content → Brane extract → Knowledge Graph
2. Apply lens → Violations found
3. Human review → Choose action:
   a. Remediate (fix the violation)
   b. Justify (add exception with rationale)
   c. Escalate (flag for authority)
4. Add attestation edges:
   - REVIEWED_BY → person
   - EXCEPTION_APPROVED_BY → authority
   - COMPLIANT_WITH → standard
5. Re-verify → Clean or documented exceptions
6. Provenance chain preserved forever
```

The result: **auditable compliance**, not checkbox compliance.

---

## Why "Git of Ethics"

Git gave code history. You can see what changed, when, and who did it. You can revert. You can branch. You can merge.

Brane gives values the same treatment:

| Git | Brane |
|-----|-------|
| Tracks file changes | Tracks concept changes |
| Commit = snapshot | Verification = snapshot |
| Diff = what changed | Violation = what's wrong |
| Blame = who changed | Provenance = where it came from |
| Branch = experiment | Lens = perspective |
| Merge = integrate | Compose = layer lenses |

**If it doesn't have a `.brane` folder, you can't verify its values.**

---

## The Deeper Philosophy

Traditional linters are *syntactic*—they check form.

Brane is *semantic*—it checks meaning.

But meaning is subjective. "Good code" depends on context. "Ethical AI" depends on values. "Compliant" depends on jurisdiction.

Brane doesn't pretend objectivity. It makes subjectivity *explicit*:

- **Your values** are encoded in lenses
- **Your rules** define what violations mean
- **Your attestations** create the audit trail
- **Your provenance** links everything to source

The subjectivity is the feature, not the bug. Different organizations have different values. Brane lets you encode yours and verify against them—not someone else's.

---

## Taglines

> **brane** — the subjective linter

> **brane** — the git of ethics

> **brane** — meaning through structure

> **brane** — if it doesn't have a `.brane` folder, you can't verify its values

---

## References

- [IC Principles of AI Ethics](https://www.intel.gov/principles-of-artificial-intelligence-ethics-for-the-intelligence-community)
- [ICD-505: Artificial Intelligence](https://www.dni.gov/files/documents/ICD/ICD-505-Artificial-Intelligence.pdf)
- [NSM-25 AI Framework](https://bidenwhitehouse.archives.gov/briefing-room/statements-releases/2024/10/24/fact-sheet-biden-harris-administration-outlines-coordinated-approach-to-harness-power-of-ai-for-u-s-national-security/)
- [Framework to Advance AI Governance and Risk Management in National Security](https://www.whitehouse.gov/wp-content/uploads/2024/10/AI-Framework.pdf)
