# Feature Specification: LLM-Powered Concept Extraction

**Feature Branch**: `020-llm-extract`
**Created**: 2026-01-29
**Status**: Draft
**Input**: Replace stub extraction with real LLM-powered concept/relationship extraction

## User Scenarios & Testing

### User Story 1 - Extract Concepts from Code File (Priority: P1)

A developer runs `brane calabi scan` on a TypeScript file and the system uses an LLM to intelligently extract domain concepts, their types, and relationships from the code—not just the filename.

**Why this priority**: This is the core value proposition of Brane. Without intelligent extraction, the knowledge graph is useless.

**Independent Test**: Run scan on a single file with entities, functions, and imports—verify concepts and edges are created reflecting the actual code semantics.

**Acceptance Scenarios**:

1. **Given** a TypeScript file with a `User` class and `authenticate()` function, **When** scan runs, **Then** concepts "User" (Entity) and "authenticate" (Entity) are created with appropriate relationships.
2. **Given** a file importing from another module, **When** scan runs, **Then** a DEPENDS_ON edge is created to represent the import relationship.
3. **Given** a file with JSDoc comments describing domain concepts, **When** scan runs, **Then** those domain concepts are extracted even if not directly in code.

---

### User Story 2 - Configurable LLM Provider (Priority: P2)

A developer configures their preferred LLM provider (Anthropic, OpenAI, local Ollama) via configuration, allowing flexibility in model choice and cost management.

**Why this priority**: Teams have different LLM preferences and constraints (cost, privacy, speed).

**Independent Test**: Configure different providers and verify extraction works with each.

**Acceptance Scenarios**:

1. **Given** Anthropic API key in config, **When** scan runs, **Then** Claude is used for extraction.
2. **Given** OpenAI API key in config, **When** scan runs, **Then** GPT is used for extraction.
3. **Given** no API key configured, **When** scan runs, **Then** clear error message indicates configuration needed.

---

### User Story 3 - Incremental Extraction (Priority: P3)

A developer modifies a file and re-runs scan. The system only re-extracts from changed files, preserving existing graph while updating relevant portions.

**Why this priority**: Efficiency—don't burn API tokens re-analyzing unchanged files.

**Independent Test**: Modify one file in a multi-file project, run scan, verify only the modified file is re-processed.

**Acceptance Scenarios**:

1. **Given** a previously scanned file with unchanged content hash, **When** scan runs, **Then** the file is skipped and existing concepts retained.
2. **Given** a file whose content changed, **When** scan runs, **Then** old concepts from that file are updated/replaced with new extraction.

---

### Edge Cases

- What happens when LLM returns malformed JSON? System should handle gracefully with error logged.
- What happens when file is binary or non-text? System should skip with warning.
- What happens when LLM rate limit is hit? System should retry with backoff or fail gracefully.
- What happens when extraction finds a concept that already exists? Reuse existing concept, don't duplicate.

## Requirements

### Functional Requirements

- **FR-001**: System MUST call an LLM to analyze file content and extract concepts
- **FR-002**: System MUST extract concepts with appropriate types (Entity, Rule, Caveat)
- **FR-003**: System MUST extract relationships between concepts (DEPENDS_ON, CONFLICTS_WITH, DEFINED_IN)
- **FR-004**: System MUST support Anthropic Claude as primary LLM provider
- **FR-005**: System MUST read LLM configuration from `.brane/config.json`
- **FR-006**: System MUST fall back to environment variables (`ANTHROPIC_API_KEY`) if config not present
- **FR-007**: System MUST handle LLM errors gracefully without crashing
- **FR-008**: System MUST respect existing `extract.ts` interface (concepts + edges patch format)
- **FR-009**: System MUST skip binary/non-text files
- **FR-010**: System MUST include file content (truncated if too large) in LLM prompt

### Key Entities

- **LLMProvider**: Configuration for which LLM to use (provider, model, API key)
- **ExtractionPrompt**: The system prompt instructing the LLM how to extract concepts
- **ExtractionResult**: Parsed response from LLM (concepts array, edges array)

## Success Criteria

### Measurable Outcomes

- **SC-001**: Scanning a 100-line TypeScript file extracts at least 3 meaningful concepts (not just filename)
- **SC-002**: Extraction correctly identifies import/dependency relationships in 80%+ of cases
- **SC-003**: System gracefully handles LLM failures with clear error messages
- **SC-004**: Configuration can be set up in under 2 minutes
