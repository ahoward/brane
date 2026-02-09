# Feature Specification: Binary Examples

**Feature Branch**: `028-binary-examples`
**Created**: 2026-02-03
**Status**: Draft
**Input**: User description: "Ensure all documentation examples run with compiled brane binary from ./bin/"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Developer Runs README Examples (Priority: P1)

A developer clones the repo, builds the binary, and runs the examples in README.md. Every example command works exactly as documented using the compiled `brane` binary.

**Why this priority**: This is the first touchpoint for new users. If README examples don't work, users lose trust immediately.

**Independent Test**: Build binary, run each README code block command, verify it succeeds or produces documented output.

**Acceptance Scenarios**:

1. **Given** a freshly cloned repo, **When** developer runs `bun run build`, **Then** binary is created at `./bin/brane`
2. **Given** `./bin` is in PATH (via .envrc), **When** developer types `brane --help`, **Then** the compiled binary executes (not bun run)
3. **Given** built binary and initialized project, **When** developer runs `brane init`, **Then** command succeeds
4. **Given** built binary, **When** developer runs each example from README.md USAGE section, **Then** each command completes without error

---

### User Story 2 - CI Validates All Examples (Priority: P2)

The test suite includes validation that all documented examples actually work, ensuring docs never drift from reality.

**Why this priority**: Prevents documentation rot. Examples that worked yesterday should work tomorrow.

**Independent Test**: Run `bun test` and see example validation tests pass.

**Acceptance Scenarios**:

1. **Given** the test suite, **When** tests run, **Then** all documented example commands are validated
2. **Given** a broken example in docs, **When** tests run, **Then** the test fails with clear indication of which example broke

---

### User Story 3 - Quickstart Guides Work (Priority: P3)

Each feature's quickstart.md contains working examples that use the compiled binary.

**Why this priority**: Quickstarts are the detailed guides users follow after README.

**Independent Test**: Run through a quickstart guide step-by-step using compiled binary.

**Acceptance Scenarios**:

1. **Given** any `specs/*/quickstart.md` file, **When** user follows the examples, **Then** each command works with compiled binary
2. **Given** quickstart examples, **When** binary is compiled, **Then** examples use `brane` command (not `bun run`)

---

### Edge Cases

- What happens when binary doesn't exist? Clear error message guiding user to build.
- What happens when PATH doesn't include ./bin? .envrc handles this automatically with direnv.
- What happens when examples reference features not yet implemented? Such examples should be removed or marked as "coming soon."

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Build process MUST output binary to `./bin/brane` (not project root)
- **FR-002**: `.envrc` MUST add `./bin` to PATH for the project
- **FR-003**: All README.md examples MUST use `brane` command (not `bun run src/cli.ts`)
- **FR-004**: All README.md examples MUST execute successfully with compiled binary
- **FR-005**: All `specs/*/quickstart.md` examples MUST use `brane` command
- **FR-006**: All `specs/*/quickstart.md` examples MUST execute successfully with compiled binary
- **FR-007**: Build process MUST create `./bin/` directory if it doesn't exist

### Key Entities

- **Binary**: The compiled `brane` executable at `./bin/brane`
- **Example**: A code block in documentation that shows a `brane` command
- **PATH**: Environment variable that includes `./bin` for command resolution

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of code block examples in README.md execute without error
- **SC-002**: 100% of code block examples in quickstart guides execute without error
- **SC-003**: `which brane` returns `./bin/brane` when in project directory with direnv loaded
- **SC-004**: No examples use `bun run src/cli.ts` pattern (all use `brane` directly)
- **SC-005**: `bun run build` creates `./bin/brane` (not `./brane`)

## Assumptions

- Users have `direnv` installed and configured (standard for projects using .envrc)
- Users will run `bun run build` before trying examples
- Examples that require initialization will document the `brane init` prerequisite

## Scope

### In Scope

- Updating build output location to `./bin/brane`
- Updating `.envrc` to add `./bin` to PATH
- Auditing and fixing all README.md examples
- Auditing and fixing all quickstart.md examples
- Creating validation tests for examples

### Out of Scope

- Automated doc generation from code
- Example syntax highlighting or formatting
- Cross-platform binary builds (focus on current platform)
