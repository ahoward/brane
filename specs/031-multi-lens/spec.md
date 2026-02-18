# Feature Specification: Multi-Lens

**Feature Branch**: `031-multi-lens`
**Created**: 2026-02-17
**Status**: Draft
**Input**: Named lenses as top-level citizens — .brane/lens/{name}/body.db + mind.db, lens switching, state.db for persistent config.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create and Use a Named Lens (Priority: P1)

A user wants to analyze the same codebase through different perspectives. Today there is only one implicit "default" lens. The user needs to create a named lens, switch to it, and run ingestion against it — producing an isolated knowledge graph that does not pollute the default view.

**Why this priority**: Without the ability to create and switch between named lenses, the entire multi-lens concept has no foundation. This is the MVP.

**Independent Test**: Create a named lens, ingest files into it, verify the lens has its own body.db and mind.db with independent data. Verify the default lens is unaffected.

**Acceptance Scenarios**:

1. **Given** an initialized brane project, **When** the user creates a lens named "security", **Then** the system creates `.brane/lens/security/body.db` and `.brane/lens/security/mind.db` with the standard schema.
2. **Given** a project with a "security" lens, **When** the user runs `brane lens use security` followed by `brane ingest src/`, **Then** files are scanned into the security lens's body.db and concepts extracted into its mind.db.
3. **Given** a project with data in both "default" and "security" lenses, **When** the user queries concepts in the "security" lens, **Then** only concepts from that lens are returned — the default lens data is untouched.
4. **Given** an initialized brane project with no explicit lens created, **When** any existing brane command runs, **Then** it operates against the "default" lens (backward compatible — existing behavior unchanged).

---

### User Story 2 - List and Inspect Lenses (Priority: P2)

A user who has created multiple lenses needs to see what lenses exist, which one is currently active, and get a summary of what each contains.

**Why this priority**: Once you can create lenses (US1), you immediately need to manage them. Without listing and inspection, users lose track of what they've built.

**Independent Test**: Create several lenses with different data, list them, verify the active lens is indicated, inspect one lens and see its summary stats.

**Acceptance Scenarios**:

1. **Given** a project with lenses "default", "security", and "architecture", **When** the user runs `brane lens list`, **Then** all three lenses are listed with the active one marked.
2. **Given** a project with a "security" lens containing 12 concepts and 8 edges, **When** the user runs `brane lens show security`, **Then** the lens metadata, concept count, edge count, and file count are displayed.
3. **Given** a newly initialized project (no explicit lenses created), **When** the user runs `brane lens list`, **Then** only "default" appears and it is marked as active.

---

### User Story 3 - Backward-Compatible Migration (Priority: P1)

An existing brane user with data in `.brane/body.db` and `.brane/mind.db` upgrades to the multi-lens version. Their existing data must continue to work without any manual migration. The old flat structure is treated as the "default" lens.

**Why this priority**: Breaking existing users is unacceptable. This is co-P1 with US1 because it gates adoption.

**Independent Test**: Start with the old flat `.brane/body.db` + `.brane/mind.db` layout. Run any brane command. Verify it works identically to before, reading from the flat files as the "default" lens.

**Acceptance Scenarios**:

1. **Given** an existing project with `.brane/body.db` and `.brane/mind.db` (no lenses directory), **When** the user runs any brane command (ingest, search, lens show, etc.), **Then** it operates on the existing databases as the "default" lens.
2. **Given** an existing project with the old flat layout, **When** the user creates their first named lens, **Then** the old flat files remain in place and continue to serve as the "default" lens. No data is moved or copied.
3. **Given** an existing project with the old flat layout, **When** the user explicitly runs a migration command (`brane lens migrate`), **Then** the flat files are moved to `.brane/lens/default/body.db` and `.brane/lens/default/mind.db`.

---

### User Story 4 - Initialize a Lens from a Config (Priority: P3)

A user wants to create a new lens pre-loaded with a specific ontology (golden types, relations, consolidation rules) from a YAML config file. This is the "top-down" lens creation path — authoring by hand rather than deriving from a corpus.

**Why this priority**: This builds on US1 (create lens) and the existing lens import system (025-lens-config). It's a convenience feature, not a prerequisite.

**Independent Test**: Create a lens with `--config lens.yml`, verify the lens's mind.db has the golden types and relations from the YAML file.

**Acceptance Scenarios**:

1. **Given** a YAML lens config file with custom types and relations, **When** the user runs `brane lens create analysis --config analysis.yml`, **Then** the new lens is created with the YAML's golden types and relations pre-loaded.
2. **Given** a YAML config with a name field that differs from the lens name argument, **When** the user creates the lens, **Then** the lens name argument wins (the YAML name is metadata, not identity).

---

### Edge Cases

- What happens when the user creates a lens with a name that already exists? Error with a clear message.
- What happens when the user tries to delete the "default" lens? Error — the default lens cannot be deleted.
- What happens when the user switches to a lens that doesn't exist? Error with a list of available lenses.
- What happens when `.brane/` exists but neither the flat layout nor the lenses directory exists? Treated as uninitialized — prompt to run `brane init`.
- What happens when two processes try to use different lenses concurrently? Each lens has its own databases, so concurrent access to different lenses is safe. Same-lens concurrent access is governed by the existing database locking behavior.
- What happens when the active lens is deleted while in use? The system prevents deleting the active lens, or at minimum falls back to "default".
- Lens names must be valid directory names (alphanumeric, hyphens, underscores). No spaces, no dots, no slashes.
- What happens when lens creation fails mid-way (e.g., mind/init fails after body.db created)? Rollback — remove the partially created lens directory.
- What happens when someone manually `rm -rf`s the active lens directory? Detect missing directory, fall back to "default", update state.db, warn user.
- What happens when `.brane/state.db` is corrupt or zero bytes? Treat as uninitialized — fall back to flat layout detection or offer to regenerate.
- What happens when `brane init` is re-run on an existing project with state.db? Idempotent — do NOT reset active_lens or other state.
- What happens when both flat files (`.brane/body.db`) AND `.brane/lens/default/` exist? New layout wins — `.brane/lens/default/` takes precedence.
- What happens when `brane lens migrate` targets a non-empty `.brane/lens/default/`? Error — refuse to overwrite existing data.
- Lens names that are reserved words or dangerous paths (`..`, `.`, `create`, `list`, `use`, `delete`, `migrate`, `show`) must be rejected.
- Lens rename is explicitly out of scope for this feature.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support named lenses, each comprising an independent body.db and mind.db pair stored under `.brane/lens/{name}/`.
- **FR-002**: System MUST maintain a "default" lens that provides backward compatibility with the pre-multi-lens layout.
- **FR-003**: System MUST allow creating a new named lens (`brane lens create <name>`).
- **FR-004**: System MUST allow switching the active lens (`brane lens use <name>`).
- **FR-005**: System MUST persist the active lens selection and other brane-wide state in `.brane/state.db` (SQLite), not flat files.
- **FR-006**: System MUST allow listing all available lenses (`brane lens list`).
- **FR-007**: All existing commands (ingest, search, lens show/import/export/stats/bless, graph, context, etc.) MUST operate on the active lens without modification to their interfaces.
- **FR-008**: System MUST detect the old flat layout (`.brane/body.db` + `.brane/mind.db` without a lenses directory) and treat it as the "default" lens transparently.
- **FR-009**: System MUST allow deleting a non-default, non-active lens (`brane lens delete <name>`).
- **FR-010**: System MUST validate lens names: alphanumeric characters, hyphens, and underscores only. No empty names.
- **FR-011**: System MUST allow creating a lens pre-loaded with a YAML ontology config (`brane lens create <name> --config <path>`).
- **FR-012**: System MUST allow an optional explicit migration of the flat layout to the lens directory structure (`brane lens migrate`).
- **FR-013**: `.brane/state.db` MUST be created during `brane init` and serve as the single source of truth for brane-wide configuration (active lens, future settings).

### Key Entities

- **Lens**: A named perspective on a codebase, comprising a body.db (file tracking) and mind.db (knowledge graph) stored at `.brane/lens/{name}/`. Identified by name. One lens is active at a time.
- **Active Lens**: The currently selected lens. Stored in `.brane/state.db`. Defaults to "default".
- **Default Lens**: The special lens that always exists. In the old flat layout, it reads from `.brane/body.db` and `.brane/mind.db` directly. In the new layout, it reads from `.brane/lens/default/`.
- **State DB**: `.brane/state.db` — a SQLite database for brane-wide persistent configuration. Stores the active lens name and is the future home for any other project-level settings.

### Assumptions

- Lens composition (merging/inheriting across lenses) is deferred to a future feature. This spec covers creation, switching, listing, and deletion only.
- The `brane init` command creates `.brane/state.db` alongside the default lens. Multi-lens is an opt-in expansion, not a required migration.
- Each lens is fully independent — no shared data between lenses. Ingesting into one lens does not affect another.
- The YAML config format for `--config` reuses the existing 025-lens-config format without changes.
- `.brane/state.db` is a new artifact. It does not replace body.db or mind.db — those remain per-lens. State.db is brane-wide.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can create, switch between, and delete named lenses in under 1 second each.
- **SC-002**: Existing projects with the flat layout continue to work identically — zero regressions in the existing 290+ test suite.
- **SC-003**: Data ingested into one lens is completely isolated — querying a different lens returns none of the first lens's data.
- **SC-004**: The active lens persists across separate command invocations without requiring the user to re-specify it.
- **SC-005**: All existing brane commands work on the active lens without requiring changes to their CLI interfaces.
