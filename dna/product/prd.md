---

# Product Requirements Document: Brane

**Version:** 2.0 (Split-Brain Architecture)
**Date:** January 2026
**Status:** Inception
**Codename:** *Calabi*

## 1. Executive Summary

**Brane** is the "Semantic Nervous System" for software projects. It is a local-first, read-write Knowledge Graph CLI that bridges the gap between raw code files (Entropy) and architectural intent (Order).

By using a novel **Split-Brain Architecture**—a high-speed SQLite "Body" for file physics and a logical CozoDB "Mind" for semantic reasoning—Brane provides AI Agents with "Perfect Context" and Humans with "Architectural Guardianship."

**Core Thesis:** AI Agents do not need more context windows; they need **structured memory**. Strings of code must attach to a "Brane" (graph), or they are lost in entropy.

---

## 2. Technical Architecture: The "Split-Brain"

The system resides entirely within a `.brane/` directory in the user's project root. It uses two distinct database engines, each optimized for a specific hemisphere of reality.

### 2.1. The Body (`.brane/body.db`)

**Engine:** `Bun:SQLite` (WAL Mode)
**Role:** The Physical Reality. Handles high-frequency I/O, file hashing, and raw content indexing.
**Schema:**

* `files`: Path, Hash (SHA-256), Size, LastModified.
* `chunks`: Text segments (AST-based) for granular mapping.
* `fts_index`: Full-Text Search (FTS5) for "Cmd+F" style lookups.

### 2.2. The Mind (`.brane/mind.db`)

**Engine:** `CozoDB` (Datalog + Vector)
**Role:** The Semantic Reality. Handles logic, relationships, vectors, and time-travel reasoning.
**Schema (Datalog):**

* `concepts`: `{id, name, type, vector<1536>}`. The abstract ideas.
* `edges`: `{source, target, relation, weight}`. The wiring.
* `rules`: `{datalog_logic}`. Inferred truths (e.g., *circular_dependency[x] := ...*).
* `provenance`: `{concept_id, body_file_id}`. The link between Mind and Body.

### 2.3. The Bridge (The CLI)

**Engine:** `Bun.js` (TypeScript)
**Role:** The Corpus Callosum.

* Reads changes from **Body**.
* Extracts structure via **Calabi Engine** (LLM).
* Writes logic to **Mind**.
* Queries **Mind** to verify **Body**.

---

## 3. Core Feature Specifications

### 3.1. Ingestion: The "Calabi" Projection

* **Command:** `brane scan [path]`
* **Workflow:**
1. **Body Scan:** Check `body.db` for changed file hashes. Identify "Dirty Files."
2. **Extraction:** Send dirty chunks to LLM with the prompt: *"Extract the graph. Map 'Login' to existing Concept #105 if similar."*
3. **Mind Surgery:** Use Datalog transactions to remove old facts about File X and insert new facts, maintaining the `provenance` link.



### 3.2. Retrieval: The "Holographic" Context

* **Command:** `brane context "Why is auth failing?"`
* **Workflow:**
1. **Mind Search:** Run Vector Search on `mind.db` to find Anchor Concepts (`AuthService`).
2. **Graph Expansion:** Use Datalog to find 2nd-degree neighbors and "Rule Violations" (e.g., `AuthService` is marked `deprecated`).
3. **Body Lookup:** Use `provenance` links to pull the exact code snippets from `body.db`.
4. **Synthesis:** Return XML bundle to the Agent.



### 3.3. Governance: The "Immune System"

* **Command:** `brane verify` (or `brane pr check`)
* **Workflow:**
1. **Simulation:** Create an in-memory fork of `mind.db`.
2. **Patch:** Apply the PR's structural changes to the fork.
3. **Reasoning:** Run Datalog rules (e.g., `!cycle[x]`) against the fork.
4. **Verdict:** If rules violate, fail the check. Output: *"Cycle detected in `src/infra`."*



### 3.4. Memory: The "Write-Back"

* **Command:** `brane annotate --target "Auth" --caveat "Do not touch"`
* **Function:** Inserts a hard constraint into `mind.db`.
* **Rule:** Manual Annotations have `authority: infinity`. The Calabi Engine (LLM) cannot overwrite them during a scan.

---

## 4. Business Model: The "Tri-Brid" Strategy

We capture value from the Individual (OSS), the Team (SaaS), and the Economy (Protocol).

### Tier 1: The Standard (OSS)

* **Product:** `brane-cli`
* **Price:** Free / Open Source (Apache 2.0).
* **Value:** Perfect local context for the solo hacker or agent.
* **Strategy:** Ubiquity. Become the `git` of context. "If it doesn't have a `.brane` folder, the Agent can't work on it."

### Tier 2: The Cloud (SaaS)

* **Product:** **Brane Team**
* **Price:** $20/seat/month.
* **Value:**
* **Sync:** Real-time replication of `mind.db` across the team (using CRDTs via Cozo's time-travel features).
* **Visualizer:** Web-based graph explorer for PMs.
* **RBAC:** "Only Seniors can annotate Caveats."



### Tier 3: The Protocol (Verification)

* **Product:** **Brane Verifier (The Convoy)**
* **Price:** Transaction Fees (`CTX` Token).
* **Mechanism:**
1. **The Bounty:** A company posts a task ("Fix Bug #101").
2. **The Work:** An anonymous Agent submits a PR.
3. **The Proof:** The Agent pays a small `CTX` fee to run `brane verify` on a decentralized Verifier Node.
4. **The Payout:** If `brane verify` passes (Structural Integrity confirmed), the Smart Contract releases the bounty.


* **Why:** Companies will pay to verify *Agent* work automatically, without wasting *Human* time on code review.

---

## 5. Roadmap & Phasing

### Phase 1: The Skeleton (Weeks 1-4)

* **Goal:** A working CLI that creates `.brane/` and populates `body.db`.
* **Deliverable:** `brane init`, `brane scan` (hashing only).
* **Tech:** Bun, SQLite setup.

### Phase 2: The Mind (Weeks 5-8)

* **Goal:** Connect `mind.db` and the Calabi Engine.
* **Deliverable:** `brane scan` (LLM extraction), `brane context` (Datalog retrieval).
* **Tech:** CozoDB integration, LLM Prompts.

### Phase 3: The Shield (Weeks 9-12)

* **Goal:** Logic enforcement.
* **Deliverable:** `brane verify`, `brane annotate`.
* **Tech:** Datalog Rule definitions (Cycles, Orphans).

### Phase 4: The Network (Month 6+)

* **Goal:** The Protocol.
* **Deliverable:** `brane-verifier` (Headless node), Smart Contract integration.

---

## 6. Directory Structure

This is the physical footprint of the project.

```text
my-project/
├── .brane/
│   ├── body.db          # SQLite (Files, Hashes, FTS)
│   ├── mind.db          # CozoDB (RocksDB backend: Graph, Rules, Vectors)
│   ├── brane.lock       # Process lock
│   └── config.json      # Local settings (ontology, exclude patterns)
├── src/
└── package.json

```

## 7. Interfaces (TypeScript Definition)

```typescript
// src/core/types.ts

// The Body (Physical)
export interface FileRecord {
  id: number;
  path: string;
  hash: string;
  lastScanned: number;
}

// The Mind (Semantic)
export interface Concept {
  id: number;
  name: string;
  type: "Entity" | "Caveat" | "Rule";
  vector: Float32Array; // Cozo vector
}

export interface Edge {
  source: number;
  target: number;
  relation: "DEPENDS_ON" | "CONFLICTS_WITH" | "DEFINED_IN";
  weight: number;
}

// The Bridge
export interface CalabiPatch {
  // Instructions to update the Mind based on Body changes
  removals: number[]; // Concept IDs to forget
  additions: Concept[];
  edges: Edge[];
}

```

---

*End of PRD v2.0*
