# Feature Specification: Graph Explore

**Feature Branch**: `027-graph-explore`
**Created**: 2026-02-01
**Status**: Draft
**Input**: User description: "CLI graph visualization/exploration commands"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Graph Summary (Priority: P1) 🎯 MVP

Users can view a summary of their knowledge graph to understand its size and structure at a glance. This provides quick orientation when starting work or checking progress.

**Why this priority**: Users need basic visibility into what's in their graph before exploring. This is the foundation for all other exploration.

**Independent Test**: Run `brane graph` in an initialized workspace and see concept count, edge count, type distribution, and relation distribution.

**Acceptance Scenarios**:

1. **Given** a workspace with concepts and edges, **When** user runs graph summary, **Then** they see total counts and breakdowns by type/relation
2. **Given** an empty graph, **When** user runs graph summary, **Then** they see zeros with a helpful message
3. **Given** an uninitialized workspace, **When** user runs graph summary, **Then** they see an initialization prompt

---

### User Story 2 - List Concepts with Filtering (Priority: P2)

Users can list all concepts in their graph, optionally filtered by type. This enables inventory checks and targeted exploration.

**Why this priority**: After seeing the summary, users want to drill into specific concepts. Filtering by type is the most common exploration pattern.

**Independent Test**: Run `brane graph concepts` to list all; run `brane graph concepts --type Entity` to filter.

**Acceptance Scenarios**:

1. **Given** concepts exist, **When** user lists concepts, **Then** they see ID, name, and type for each
2. **Given** a type filter is provided, **When** user lists concepts, **Then** only matching concepts appear
3. **Given** no concepts match filter, **When** user lists concepts, **Then** they see an empty result message

---

### User Story 3 - List Edges with Filtering (Priority: P3)

Users can list all edges in their graph, optionally filtered by relation type or by source/target concept. This enables understanding relationships.

**Why this priority**: Understanding connections is crucial for graph exploration. Filtering helps focus on specific relationship types.

**Independent Test**: Run `brane graph edges` to list all; run `brane graph edges --relation DEPENDS_ON` to filter.

**Acceptance Scenarios**:

1. **Given** edges exist, **When** user lists edges, **Then** they see source, target, relation, and weight
2. **Given** a relation filter, **When** user lists edges, **Then** only matching edges appear
3. **Given** a concept filter (--from or --to), **When** user lists edges, **Then** only edges involving that concept appear

---

### User Story 4 - Show Concept Neighbors (Priority: P4)

Users can see all concepts connected to a specific concept (its "neighborhood"). This is the primary drill-down exploration pattern.

**Why this priority**: Once users find a concept of interest, they want to see what it's connected to. This is the core graph exploration action.

**Independent Test**: Run `brane graph neighbors 1` to see all concepts connected to concept ID 1.

**Acceptance Scenarios**:

1. **Given** a concept with edges, **When** user requests neighbors, **Then** they see connected concepts with relationship info
2. **Given** a concept with no edges, **When** user requests neighbors, **Then** they see an empty result
3. **Given** an invalid concept ID, **When** user requests neighbors, **Then** they see an error message

---

### User Story 5 - Graph Visualization (Priority: P5)

Users can see a visualization of their graph or a subgraph in ASCII (terminal-native) or Mermaid (for docs/rendering). This provides intuitive understanding of structure.

**Why this priority**: Visual representation helps users understand complex relationships. ASCII for quick terminal use, Mermaid for documentation and external rendering.

**Independent Test**: Run `brane graph viz` for ASCII; run `brane graph viz --format mermaid` for Mermaid output.

**Acceptance Scenarios**:

1. **Given** a small graph (<20 nodes), **When** user requests ASCII visualization, **Then** they see a readable ASCII diagram
2. **Given** any graph, **When** user requests Mermaid visualization, **Then** they see valid Mermaid flowchart syntax
3. **Given** a large graph, **When** user requests visualization, **Then** they see a summary with option to limit scope
4. **Given** a concept ID, **When** user requests visualization centered on it, **Then** they see that concept's neighborhood in chosen format

---

### Edge Cases

- What happens with very large graphs (1000+ concepts)? Pagination and limits with helpful messages
- What happens with disconnected subgraphs? Show all components in summary, allow focusing on specific subgraphs
- What happens with cycles in the graph? Handle gracefully in visualization, show cycle indicators

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a graph summary showing total concepts, edges, type distribution, and relation distribution
- **FR-002**: System MUST allow listing concepts with optional type filter
- **FR-003**: System MUST allow listing edges with optional relation filter and concept filters
- **FR-004**: System MUST show a concept's neighbors (directly connected concepts) with relationship details
- **FR-005**: System MUST provide visualization in ASCII format (default) or Mermaid format (--format mermaid)
- **FR-006**: System MUST handle large graphs gracefully with pagination/limits
- **FR-007**: System MUST support JSON output for all commands (--json flag)

### Key Entities

- **GraphSummary**: Concept count, edge count, type histogram, relation histogram
- **ConceptListItem**: ID, name, type
- **EdgeListItem**: ID, source, target, relation, weight
- **NeighborResult**: Concept details plus incoming/outgoing relationship info

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can understand graph structure within 10 seconds of running summary command
- **SC-002**: Concept and edge lists display in under 1 second for graphs up to 1000 items
- **SC-003**: All exploration commands provide consistent, parseable output formats
- **SC-004**: ASCII visualization is readable for graphs up to 20 nodes
- **SC-005**: Mermaid output renders correctly in GitHub/VS Code markdown preview

## Assumptions

- Graph data is already populated via existing concept/edge commands
- CLI follows existing brane command patterns (subcommands, --json flag, etc.)
- ASCII visualization is a nice-to-have; core value is in summary/list/neighbors commands
- No external dependencies for visualization (pure text-based)
