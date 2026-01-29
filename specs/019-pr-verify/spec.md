# Feature Specification: PR Verify

**Feature Branch**: `019-pr-verify`
**Created**: 2026-01-28
**Status**: Draft
**Input**: User description: "Simulate PR changes and verify against rules"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Verify Current Workspace Against Rules (Priority: P1)

A developer wants to check if their current workspace (uncommitted changes) would pass all rules if committed. This is the most common use case: run a quick check before committing to ensure changes don't introduce rule violations.

**Why this priority**: This is the core workflow—developers need to verify changes before committing. The workspace already has the changes applied, so this is a straightforward verify with context about what files changed.

**Independent Test**: Can be tested by modifying files in workspace that would cause rule violations, then running pr-verify to see the violations reported with affected files highlighted.

**Acceptance Scenarios**:

1. **Given** modified files in workspace, **When** pr-verify is run, **Then** rules are executed and violations are reported
2. **Given** no modified files in workspace, **When** pr-verify is run, **Then** rules are executed against current state
3. **Given** workspace changes that would create orphan concepts, **When** pr-verify is run, **Then** orphan violations are reported
4. **Given** workspace changes that would create cycles, **When** pr-verify is run, **Then** cycle violations are reported

---

### User Story 2 - Verify with Diff Context (Priority: P2)

A developer wants the verification results to include context about which files were changed, so they can understand which of their changes caused violations. The report should show both the violations and the files that were modified.

**Why this priority**: Context about changed files helps developers quickly identify and fix issues. Without this, they would need to manually correlate violations with their changes.

**Independent Test**: Can be tested by modifying specific files, running pr-verify, and verifying the output includes both the changed files list and any violations.

**Acceptance Scenarios**:

1. **Given** modified files in workspace, **When** pr-verify completes, **Then** the result includes a list of changed files
2. **Given** a violation caused by a changed file, **When** pr-verify reports it, **Then** the affected file is identifiable from the context
3. **Given** no changed files, **When** pr-verify completes, **Then** the changed files list is empty but verification still runs

---

### User Story 3 - Verify Specific Rules Only (Priority: P2)

A developer wants to run only specific rules as part of their PR verification. For example, they may only care about cycle detection for a particular change.

**Why this priority**: Selective verification allows faster feedback for focused checks. Builds on the existing verify selective rules capability.

**Independent Test**: Can be tested by running pr-verify with specific rule names and confirming only those rules execute.

**Acceptance Scenarios**:

1. **Given** multiple rules exist, **When** pr-verify is run with a specific rule name, **Then** only that rule is executed
2. **Given** a rule name that doesn't exist, **When** pr-verify is run, **Then** an error indicates the rule was not found
3. **Given** multiple rule names, **When** pr-verify is run with those names, **Then** all specified rules execute

---

### User Story 4 - Dry Run Mode (Priority: P3)

A developer wants to see what pr-verify would check without actually running the verification. This shows which files are considered changed and which rules would run.

**Why this priority**: Dry run is useful for debugging and understanding the verification scope, but the actual verification is the primary need.

**Independent Test**: Can be tested by running pr-verify with dry_run flag and confirming it returns the list of changed files and rules without executing verification.

**Acceptance Scenarios**:

1. **Given** dry_run is true, **When** pr-verify is run, **Then** changed files and rules to run are listed but verification is not executed
2. **Given** dry_run is true, **When** pr-verify completes, **Then** no side effects occur and verification results are null

---

### Edge Cases

- What happens when body.db is not initialized? (Error with helpful message)
- What happens when mind.db is not initialized? (Error with helpful message)
- What happens when no rules are defined? (Success with "no rules to run" message)
- What happens when a rule has a runtime error? (Report the error, continue with other rules)
- How does pr-verify handle binary files? (Binary files tracked but not relevant to rule verification)
- What if workspace is clean (no changes)? (Still run verification on current state)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST detect changed files by comparing workspace to tracked state in body.db
- **FR-002**: System MUST execute all rules (or specified rules) against the current mind.db state
- **FR-003**: System MUST return verification results with violations grouped by rule
- **FR-004**: System MUST return the list of changed files (added, modified, deleted) as context
- **FR-005**: System MUST return exit code 0 when no violations are found
- **FR-006**: System MUST return non-zero exit code when violations are found
- **FR-007**: System MUST support selective rule execution via a rules parameter
- **FR-008**: System MUST support dry_run mode that shows scope without executing verification
- **FR-009**: System MUST return an error if body.db is not initialized
- **FR-010**: System MUST return an error if mind.db is not initialized
- **FR-011**: System MUST handle the case where no rules exist gracefully

### Key Entities

- **PR Verify Result**: The complete output containing changed files context and verification results.
- **Changed Files Context**: List of files that differ between workspace and tracked state (added, modified, deleted).
- **Verification Result**: The outcome of running rules—same structure as /mind/verify output.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can verify workspace changes in under 5 seconds for a project with 100 changed files
- **SC-002**: PR verify results clearly show which files were changed alongside any violations
- **SC-003**: Exit codes correctly reflect verification outcome 100% of the time
- **SC-004**: Users can integrate pr-verify into pre-commit hooks using only the exit code
- **SC-005**: Dry run mode executes in under 1 second regardless of workspace size

## Assumptions

- The pr-verify command builds on `/mind/verify` for rule execution
- File change detection reuses logic from `/body/scan` (comparing workspace to body.db)
- The current mind.db state is assumed to reflect extractions from tracked files
- For accurate PR verification, users should run `/calabi/scan` after making changes to update mind.db
- The result structure follows Brane's standard envelope format (status, result, errors, meta)
