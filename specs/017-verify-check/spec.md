# Feature Specification: Verify Check

**Feature Branch**: `017-verify-check`
**Created**: 2026-01-28
**Status**: Draft
**Input**: User description: "Run rules against mind.db, report violations"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Run All Rules and Report Violations (Priority: P1)

A developer wants to run all defined rules (built-in and custom) against their knowledge graph and get a unified report showing any violations. This is the primary use case for graph integrity checking—a single command that tells you if your graph is "healthy."

**Why this priority**: This is the core value proposition of the verify feature. Running all rules at once is the expected workflow for CI/CD integration and pre-commit checks.

**Independent Test**: Can be fully tested by creating a graph with known violations (a cycle and an orphan) and verifying the verify command reports both issues in a structured format.

**Acceptance Scenarios**:

1. **Given** a graph with cycles, **When** verify is run, **Then** the cycles rule violations are reported with affected concepts
2. **Given** a graph with orphans, **When** verify is run, **Then** the orphans rule violations are reported with affected concepts
3. **Given** a graph with no violations, **When** verify is run, **Then** a success message indicates the graph passed all rules
4. **Given** custom rules exist, **When** verify is run, **Then** custom rules are also executed and their violations reported

---

### User Story 2 - Run Specific Rules Only (Priority: P2)

A developer wants to run only specific rules rather than all rules. For example, they may want to check only for cycles during a particular workflow, ignoring orphan detection.

**Why this priority**: Selective rule execution is useful for focused checks but less common than running all rules. The full verify is the primary use case.

**Independent Test**: Can be tested by creating a graph with violations of multiple rules, running verify with a single rule specified, and confirming only that rule's violations are reported.

**Acceptance Scenarios**:

1. **Given** multiple rules exist, **When** verify is run with a specific rule name, **Then** only that rule is executed
2. **Given** a rule name that doesn't exist, **When** verify is run with that name, **Then** an error indicates the rule was not found
3. **Given** multiple rule names specified, **When** verify is run, **Then** all specified rules are executed

---

### User Story 3 - Exit Code for CI/CD Integration (Priority: P2)

A developer wants the verify command to return appropriate exit codes so it can be integrated into CI/CD pipelines and pre-commit hooks. A non-zero exit code should indicate violations were found.

**Why this priority**: CI/CD integration is essential for automated governance, but requires the basic verify functionality first.

**Independent Test**: Can be tested by running verify on a graph with violations and checking the process exit code is non-zero.

**Acceptance Scenarios**:

1. **Given** a graph with no violations, **When** verify completes, **Then** exit code is 0 (success)
2. **Given** a graph with violations, **When** verify completes, **Then** exit code is non-zero (failure)
3. **Given** verify encounters an error (e.g., mind not initialized), **When** verify completes, **Then** exit code is non-zero with error message

---

### User Story 4 - Summary Statistics (Priority: P3)

A developer wants to see summary statistics after verification—how many rules passed, how many failed, total violations found. This helps quickly assess graph health without reading through all violations.

**Why this priority**: Summary statistics improve usability but the detailed violation list provides all necessary information. This is an enhancement.

**Independent Test**: Can be tested by running verify on a graph with mixed results and checking the summary includes accurate counts.

**Acceptance Scenarios**:

1. **Given** verify completes, **When** results are displayed, **Then** a summary shows rules_passed, rules_failed, and total_violations counts
2. **Given** all rules pass, **When** summary is displayed, **Then** rules_failed is 0 and total_violations is 0
3. **Given** some rules fail, **When** summary is displayed, **Then** counts accurately reflect the results

---

### Edge Cases

- What happens when mind.db is not initialized? (Error with helpful message)
- What happens when no rules are defined? (Success with "no rules to run" message)
- How are results presented when a rule matches hundreds of concepts? (Truncation or pagination in display, full data in result)
- What happens when a custom rule has a runtime error during execution? (Report the error, continue with other rules)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST execute all defined rules (built-in and custom) when verify is run without arguments
- **FR-002**: System MUST allow specifying one or more rule names to run selectively
- **FR-003**: System MUST return a structured result containing violations grouped by rule
- **FR-004**: System MUST return exit code 0 when no violations are found
- **FR-005**: System MUST return non-zero exit code when violations are found
- **FR-006**: System MUST include summary statistics (rules_passed, rules_failed, total_violations)
- **FR-007**: System MUST report errors encountered during rule execution without stopping other rules
- **FR-008**: System MUST return an error if mind.db is not initialized
- **FR-009**: System MUST handle the case where no rules exist gracefully
- **FR-010**: System MUST include concept details (id, name) for each violation

### Key Entities

- **Verification Result**: The complete output of running verify—contains summary statistics, list of rule results, and overall pass/fail status.
- **Rule Violation**: A concept that matches a rule's violation criteria. Contains the concept's id and name.
- **Rule Result**: The outcome of running a single rule—rule name, pass/fail status, and list of violations (if any).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can verify a graph of 1000 concepts against all built-in rules in under 10 seconds
- **SC-002**: Verify results are available immediately after command completion (no background processing)
- **SC-003**: Exit codes correctly reflect verification outcome 100% of the time
- **SC-004**: All violations are reported without truncation in the result data structure
- **SC-005**: Users can integrate verify into CI/CD pipelines using only the exit code (no output parsing required for pass/fail)

## Assumptions

- The verify command builds on the existing `/mind/rules/query` endpoint from feature 016-rules-define
- Rules are executed sequentially (parallel execution is a future optimization)
- The result structure follows Brane's standard envelope format (status, result, errors, meta)
- Built-in rules (cycles, orphans) are always available after mind/init
- Custom rules may have runtime errors that don't prevent other rules from running
