# Feature Specification: Define Datalog Rules

**Feature Branch**: `016-rules-define`
**Created**: 2026-01-28
**Status**: Draft
**Input**: User description: "Define Datalog rules for cycles, orphans, and other graph integrity checks"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Define a Cycle Detection Rule (Priority: P1)

A developer wants to define a rule that detects circular dependencies in the knowledge graph. For example, if `AuthService` depends on `UserService` which depends on `SessionService` which depends back on `AuthService`, this forms a cycle that should be flagged.

**Why this priority**: Cycle detection is the canonical example of what Datalog excels at and is critical for architectural governance. It's also explicitly called out in the PRD.

**Independent Test**: Can be fully tested by creating a small graph with a known cycle and verifying the rule correctly identifies all concepts participating in the cycle.

**Acceptance Scenarios**:

1. **Given** a graph with concepts A→B→C→A (circular dependency), **When** the cycle detection rule is queried, **Then** concepts A, B, and C are returned as cycle participants
2. **Given** a graph with no cycles (A→B→C), **When** the cycle detection rule is queried, **Then** an empty result is returned
3. **Given** a graph with multiple independent cycles, **When** the cycle detection rule is queried, **Then** all cycle participants from all cycles are returned

---

### User Story 2 - Define an Orphan Detection Rule (Priority: P1)

A developer wants to define a rule that detects orphaned concepts—concepts that have no incoming or outgoing edges, meaning they are disconnected from the rest of the knowledge graph.

**Why this priority**: Orphans indicate extraction errors or stale data that should be cleaned up. This is essential for graph hygiene.

**Independent Test**: Can be fully tested by creating a graph with some connected and some disconnected concepts and verifying the rule correctly identifies only the disconnected ones.

**Acceptance Scenarios**:

1. **Given** a concept with no edges (neither incoming nor outgoing), **When** the orphan detection rule is queried, **Then** that concept is returned as an orphan
2. **Given** a concept with at least one edge (incoming or outgoing), **When** the orphan detection rule is queried, **Then** that concept is NOT returned
3. **Given** multiple orphaned concepts, **When** the orphan detection rule is queried, **Then** all orphans are returned

---

### User Story 3 - Create a Custom Rule (Priority: P2)

A developer wants to create their own custom rule using Datalog syntax. For example, detecting all concepts that are "critical" (have more than N dependents) or finding all concepts that conflict with deprecated concepts.

**Why this priority**: Custom rules unlock the full power of Datalog for project-specific governance. Less critical than built-in rules because it requires Datalog knowledge.

**Independent Test**: Can be tested by defining a simple custom rule (e.g., "concepts with more than 2 incoming edges") and verifying it returns correct results.

**Acceptance Scenarios**:

1. **Given** valid Datalog rule syntax, **When** the rule is created, **Then** it is stored and can be queried
2. **Given** invalid Datalog syntax, **When** the rule is created, **Then** an error is returned with a helpful message
3. **Given** a stored custom rule, **When** the rule is deleted, **Then** it no longer appears in rule listings

---

### User Story 4 - List All Defined Rules (Priority: P2)

A developer wants to see all rules currently defined in the system, both built-in and custom.

**Why this priority**: Visibility into what rules exist is essential for understanding what governance is in place.

**Independent Test**: Can be tested by creating several rules and verifying the list command returns all of them with their metadata.

**Acceptance Scenarios**:

1. **Given** built-in rules exist, **When** rules are listed, **Then** all built-in rules are shown with their names and descriptions
2. **Given** custom rules have been created, **When** rules are listed, **Then** custom rules are shown alongside built-in rules
3. **Given** no custom rules exist, **When** rules are listed, **Then** only built-in rules are shown

---

### User Story 5 - Query a Specific Rule (Priority: P3)

A developer wants to execute a specific rule and see its results—which concepts violate or match the rule.

**Why this priority**: Running individual rules is useful for targeted checks, but bulk verification (`brane verify`) will be the primary use case (separate feature).

**Independent Test**: Can be tested by running a known rule against a test graph and verifying the expected results.

**Acceptance Scenarios**:

1. **Given** a rule name that exists, **When** the rule is queried, **Then** the matching/violating concepts are returned
2. **Given** a rule name that does not exist, **When** the rule is queried, **Then** an error indicates the rule was not found

---

### Edge Cases

- What happens when a rule references a relation type that doesn't exist in the graph?
- How does the system handle rules with syntax errors discovered at query time (valid storage, invalid execution)?
- What happens when deleting a built-in rule (should be prevented)?
- How are rule results presented when the graph is empty?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a built-in `cycles` rule that detects circular dependencies via DEPENDS_ON edges
- **FR-002**: System MUST provide a built-in `orphans` rule that detects concepts with no edges (incoming or outgoing)
- **FR-003**: System MUST allow users to create custom rules using Datalog syntax
- **FR-004**: System MUST validate Datalog syntax when a custom rule is created
- **FR-005**: System MUST allow users to list all defined rules (built-in and custom)
- **FR-006**: System MUST allow users to query/execute a specific rule by name
- **FR-007**: System MUST allow users to delete custom rules
- **FR-008**: System MUST prevent deletion of built-in rules
- **FR-009**: System MUST store custom rules persistently in mind.db
- **FR-010**: System MUST return rule query results as a list of matching concepts with their IDs and names
- **FR-011**: System MUST provide descriptive error messages for invalid Datalog syntax

### Key Entities

- **Rule**: A named Datalog query that can be executed against the knowledge graph. Has a name, description, Datalog body, and flag indicating if it's built-in or custom.
- **Rule Result**: The output of executing a rule—a list of concepts that match/violate the rule's conditions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can detect all cycles in a graph of 1000 concepts in under 5 seconds
- **SC-002**: Users can detect all orphans in a graph of 1000 concepts in under 1 second
- **SC-003**: 100% of built-in rules are available immediately after mind.db initialization
- **SC-004**: Custom rules persist across CLI sessions (survive process restart)
- **SC-005**: Invalid Datalog syntax is caught at rule creation time, not at query time

## Assumptions

- Datalog rule syntax follows CozoDB's dialect
- Built-in rules use only the existing edge relation types (DEPENDS_ON, CONFLICTS_WITH, DEFINED_IN)
- Rule names are unique (no two rules can have the same name)
- Rules are stored in a new `rules` relation in mind.db
- The cycle detection rule uses transitive closure, which is native to Datalog
