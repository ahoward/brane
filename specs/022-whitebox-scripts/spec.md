# Feature Specification: Whitebox Scripts

**Feature Branch**: `022-whitebox-scripts`
**Created**: 2026-01-30
**Status**: Draft
**Input**: User description: "022-whitebox-scripts"

## Overview

Create a collection of idempotent, hacker-clean shell scripts that demonstrate end-to-end Brane workflows. These scripts serve three purposes:

1. **TL;DR Documentation** — Human-readable examples for quick onboarding
2. **White-box Test Suite** — Validate real-world workflows against a compiled binary
3. **Dogfooding** — Prove the DX works by using it ourselves

All scripts run against the **compiled Brane binary** (not `bun run`), ensuring we test what users actually ship.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Quick Start Workflow (Priority: P1)

A new user wants to understand how Brane works by reading and running a simple script that demonstrates the core workflow: init → scan → extract → search → verify.

**Why this priority**: This is the gateway to adoption. If users can't quickly understand the workflow, they won't use Brane.

**Independent Test**: Run the quick-start script on any codebase and observe it completing all steps with clear output.

**Acceptance Scenarios**:

1. **Given** a fresh directory with source files, **When** the user runs the quick-start script, **Then** a `.brane/` directory is created with both body.db and mind.db initialized
2. **Given** a quick-start script, **When** a user reads it, **Then** they understand the core Brane workflow within 2 minutes
3. **Given** the quick-start script has already run, **When** the user runs it again, **Then** it completes successfully (idempotent)

---

### User Story 2 - Individual Command Examples (Priority: P2)

A developer wants to understand a specific Brane command (e.g., `/mind/search` or `/mind/verify`) by running a focused script that demonstrates just that command.

**Why this priority**: After the quick-start, users need to explore individual commands in depth.

**Independent Test**: Each command script can be run independently and demonstrates one specific capability.

**Acceptance Scenarios**:

1. **Given** a script for a specific command, **When** the user runs it, **Then** they see the command's input, output, and behavior clearly
2. **Given** multiple command scripts exist, **When** a user browses the directory, **Then** script names clearly indicate which command they demonstrate
3. **Given** any command script, **When** run multiple times, **Then** it produces consistent results (idempotent)

---

### User Story 3 - Automated Test Suite Integration (Priority: P3)

The development team wants to run all whitebox scripts as part of CI to catch regressions in real-world workflows.

**Why this priority**: Ensures ongoing quality but requires P1/P2 to exist first.

**Independent Test**: A test runner script executes all whitebox scripts and reports pass/fail status.

**Acceptance Scenarios**:

1. **Given** all whitebox scripts exist, **When** the test runner executes, **Then** each script's pass/fail status is reported
2. **Given** a script fails, **When** the test runner completes, **Then** it exits with non-zero status
3. **Given** the CI environment, **When** the test runner executes, **Then** it uses the compiled binary (not development mode)

---

### Edge Cases

- What happens when a script is run without the compiled binary available? (Should error with clear message)
- How does the system handle running scripts on an already-initialized project? (Should be idempotent)
- What happens when a script is run in a directory without source files? (Should handle gracefully)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: All scripts MUST run against a compiled Brane binary, not `bun run src/cli.ts`
- **FR-002**: All scripts MUST be idempotent — running twice produces the same result
- **FR-003**: Scripts MUST be self-contained shell scripts (bash) with no external dependencies beyond Brane
- **FR-004**: Each script MUST include a header comment explaining its purpose in 1-3 lines
- **FR-005**: Scripts MUST use clear, readable output (echo statements explaining each step)
- **FR-006**: Scripts MUST exit with appropriate status codes (0 for success, non-zero for failure)
- **FR-007**: A test runner script MUST exist that executes all whitebox scripts and reports results
- **FR-008**: Scripts MUST create their own test fixtures (sample files) rather than depending on external data
- **FR-009**: Scripts MUST clean up after themselves or work in temporary directories
- **FR-010**: The compiled binary location MUST be configurable via environment variable (e.g., `BRANE_BIN`)

### Key Entities

- **Script**: A self-contained bash file demonstrating a Brane workflow or command
- **Test Runner**: A script that orchestrates execution of all whitebox scripts
- **Test Fixture**: Sample source files created by scripts for demonstration/testing
- **Compiled Binary**: The production Brane executable (not development mode)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new user can read and understand the quick-start script in under 2 minutes
- **SC-002**: All whitebox scripts pass when run against the compiled binary
- **SC-003**: Running any script twice in succession produces identical observable results
- **SC-004**: The test runner completes execution of all scripts in under 60 seconds
- **SC-005**: Script names and directory structure are self-explanatory without additional documentation
- **SC-006**: Each script demonstrates exactly one workflow or command (single responsibility)

## Assumptions

- The compiled binary is built separately (via `bun build` or similar) before running whitebox scripts
- Scripts target bash (available on macOS, Linux, and WSL on Windows)
- Scripts may use common Unix utilities (echo, cat, mkdir, rm, mktemp) but no exotic dependencies
- The `BRANE_BIN` environment variable defaults to `./brane` if not set
