# Feature Specification: Manual Annotations

**Feature Branch**: `018-annotate`
**Created**: 2026-01-28
**Status**: Draft
**Input**: User description: "Manual annotations with infinite authority"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create Annotation on Concept (Priority: P1)

A developer wants to mark a concept with a permanent note that automated tools (LLM scans) cannot overwrite. For example, marking an "Auth" concept with "Do not touch - legacy system, scheduled for Q3 replacement."

**Why this priority**: Core functionality - without creating annotations, the feature has no value.

**Independent Test**: Create annotation on concept, verify it persists and is retrievable via list/get.

**Acceptance Scenarios**:

1. **Given** an initialized mind.db with a concept "Auth", **When** user creates annotation with target=1 and text="Do not touch", **Then** annotation is stored with authority:infinity and returns annotation details
2. **Given** an initialized mind.db, **When** user creates annotation on non-existent concept, **Then** error returned with "concept not found"
3. **Given** an initialized mind.db, **When** user creates annotation without required fields, **Then** validation errors returned

---

### User Story 2 - List and Get Annotations (Priority: P1)

A developer or automated tool needs to retrieve annotations to understand constraints before modifying code. The verify command needs access to annotations to respect infinite authority constraints.

**Why this priority**: Essential for annotations to be useful - must be retrievable after creation.

**Independent Test**: Create multiple annotations, list all, get specific one by ID.

**Acceptance Scenarios**:

1. **Given** mind.db with multiple annotations, **When** user lists annotations, **Then** all annotations returned with id, target, text, type, authority, created_at
2. **Given** mind.db with annotations, **When** user lists with target filter, **Then** only annotations for that concept returned
3. **Given** mind.db with annotations, **When** user gets annotation by ID, **Then** full annotation details returned
4. **Given** mind.db, **When** user gets non-existent annotation, **Then** error returned with "not found"

---

### User Story 3 - Delete Annotation (Priority: P2)

A developer needs to remove an outdated annotation. Only human users should be able to delete annotations (enforced by usage context, not the API itself).

**Why this priority**: Important for maintenance but not blocking core functionality.

**Independent Test**: Create annotation, delete it, verify it no longer appears in list.

**Acceptance Scenarios**:

1. **Given** mind.db with annotation ID 1, **When** user deletes annotation 1, **Then** annotation removed and success returned
2. **Given** mind.db, **When** user deletes non-existent annotation, **Then** error returned with "not found"

---

### User Story 4 - Annotation Types (Priority: P3)

A developer wants to categorize annotations by type - "caveat" (warning/constraint), "note" (informational), or "todo" (action item). This helps filter and prioritize annotations.

**Why this priority**: Nice-to-have categorization, core functionality works without it.

**Independent Test**: Create annotations with different types, filter list by type.

**Acceptance Scenarios**:

1. **Given** initialized mind.db, **When** user creates annotation with type="caveat", **Then** annotation stored with that type
2. **Given** mind.db with mixed annotation types, **When** user lists with type filter, **Then** only matching annotations returned
3. **Given** initialized mind.db, **When** user creates annotation with invalid type, **Then** validation error returned

---

### Edge Cases

- What happens when target concept is deleted? Annotation becomes orphaned (acceptable - annotations persist independently)
- How does system handle very long annotation text? Accept up to 4096 characters, reject longer with validation error
- What happens with duplicate annotations on same concept? Allowed - multiple annotations per concept supported

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST store annotations with: id, target (concept_id), text, type, authority, created_at
- **FR-002**: System MUST set authority to "infinity" for all manually created annotations
- **FR-003**: System MUST validate target concept exists before creating annotation
- **FR-004**: System MUST support annotation types: caveat, note, todo (default: caveat)
- **FR-005**: System MUST allow multiple annotations on a single concept
- **FR-006**: System MUST support filtering annotations by target concept
- **FR-007**: System MUST support filtering annotations by type
- **FR-008**: System MUST limit annotation text to 4096 characters
- **FR-009**: System MUST return annotations sorted by created_at descending (newest first)

### Key Entities

- **Annotation**: A manual note attached to a concept with id, target (concept_id), text, type, authority, created_at
- **Concept**: Existing entity in mind.db that annotations attach to

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can create an annotation on any concept in under 1 second
- **SC-002**: Users can list all annotations for a project with 1000+ annotations in under 1 second
- **SC-003**: Annotations persist across mind.db sessions (stored in CozoDB)
- **SC-004**: All annotation operations follow Brane's Result envelope pattern
- **SC-005**: tc tests cover all acceptance scenarios with 100% pass rate
