//
// mcp.ts - MCP server for brane (Model Context Protocol)
//
// JSON-RPC 2.0 over stdio. Exposes brane handlers as MCP tools.
// Pattern follows ahoward/xenv.
//

import { sys } from "./index.ts"
import { resolve_lens_paths } from "./lib/state.ts"
import { acquire_lock, auto_release_on_exit } from "./lib/lock.ts"
import { reset_rate_limiter, get_session_stats } from "./lib/rate-limit.ts"
import { auto_tag, STANDARD_TAGS } from "./lib/auto-tag.ts"
import { maybe_flush, auto_flush_on_exit } from "./lib/access-log.ts"
import { open_memories, record_memory, tombstone_by_graph_id, get_memory_by_graph_id } from "./lib/memories.ts"
import { resolve } from "node:path"

//
// Constants
//

const MCP_VERSION = "2024-11-05"
const SERVER_NAME = "brane"
const SERVER_VERSION = "0.3.0"

//
// MCP mode: "simple" (default) exposes only 3 hippocampus verbs.
// "full" exposes all tools for power users / admin.
//
const MCP_MODE = process.env.BRANE_MCP_MODE ?? "simple"

//
// Hippocampus tools — the 3 verbs agents see by default
//
const HIPPOCAMPUS_TOOLS: McpTool[] = [
  {
    name: "remember",
    description: "Store a memory. Auto-tags from text (decision, preference, fact, event, lesson, caveat). Dual-writes to graph + audit trail.",
    inputSchema: {
      type: "object",
      properties: {
        observation: { type: "string", description: "What you observed, learned, or decided" },
        context:     { type: "string", description: "What you were doing when you learned this" },
        outcome:     { type: "string", description: "What happened as a result" },
        tags:        { type: "array", items: { type: "string" }, description: "Tags: decision, preference, fact, event, lesson, caveat. Auto-detected if omitted." },
      },
      required: ["observation"],
    },
  },
  {
    name: "recall",
    description: "Search your memories by meaning. Returns relevant past experiences with trust tiers (self/file/external).",
    inputSchema: {
      type: "object",
      properties: {
        query:  { type: "string", description: "What you're trying to remember" },
        limit:  { type: "number", description: "Max memories to return (default 5)" },
        tag:    { type: "string", description: "Filter to memories with this tag" },
        after:  { type: "string", description: "Only memories after this ISO timestamp" },
        before: { type: "string", description: "Only memories before this ISO timestamp" },
      },
      required: ["query"],
    },
  },
  {
    name: "forget",
    description: "Remove a memory that is no longer relevant or correct. Dual-deletes from graph + audit trail.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number", description: "Episode ID to forget" },
      },
      required: ["id"],
    },
  },
]

//
// JSON-RPC types
//

interface JsonRpcRequest {
  jsonrpc: "2.0"
  id?: string | number
  method: string
  params?: Record<string, unknown>
}

interface JsonRpcResponse {
  jsonrpc: "2.0"
  id: string | number | null
  result?: unknown
  error?: { code: number; message: string; data?: unknown }
}

//
// MCP tool definition
//

interface McpTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

//
// Tool definitions — each maps to a sys.call handler
//

const TOOLS: McpTool[] = [
  {
    name: "search",
    description: "Semantic vector search for concepts in the knowledge graph. Returns concepts ranked by similarity to the query.",
    inputSchema: {
      type: "object",
      properties: {
        query:    { type: "string", description: "Natural language search query" },
        limit:    { type: "number", description: "Max results to return (default 10)" },
        agent_id: { type: "string", description: "Filter by agent ID" },
      },
      required: ["query"],
    },
  },
  {
    name: "graph_summary",
    description: "Get a summary of the knowledge graph: concept counts by type, edge counts by relation.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "graph_viz",
    description: "Visualize the knowledge graph as mermaid or ascii.",
    inputSchema: {
      type: "object",
      properties: {
        format:  { type: "string", enum: ["mermaid", "ascii"], description: "Output format (default mermaid)" },
        limit:   { type: "number", description: "Max nodes to include (default 50)" },
        center:  { type: "string", description: "Center visualization on this concept name" },
      },
    },
  },
  {
    name: "graph_neighbors",
    description: "Explore the neighborhood of a concept — its direct connections in the knowledge graph.",
    inputSchema: {
      type: "object",
      properties: {
        id:    { type: "number", description: "Concept ID to explore" },
        name:  { type: "string", description: "Concept name to explore (alternative to id)" },
        depth: { type: "number", description: "Traversal depth (default 1)" },
      },
    },
  },
  {
    name: "concepts_list",
    description: "List all concepts in the knowledge graph, optionally filtered by type or agent.",
    inputSchema: {
      type: "object",
      properties: {
        type:     { type: "string", description: "Filter by concept type (Entity, Caveat, Rule)" },
        agent_id: { type: "string", description: "Filter by agent ID (e.g., 'claude-code')" },
        limit:    { type: "number", description: "Max results (default all)" },
      },
    },
  },
  {
    name: "concepts_create",
    description: "Create a new concept in the knowledge graph.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Concept name" },
        type: { type: "string", description: "Concept type (Entity, Caveat, Rule)" },
      },
      required: ["name", "type"],
    },
  },
  {
    name: "edges_list",
    description: "List all edges (relationships) in the knowledge graph.",
    inputSchema: {
      type: "object",
      properties: {
        relation: { type: "string", description: "Filter by relation type (DEPENDS_ON, CONFLICTS_WITH, DEFINED_IN)" },
        agent_id: { type: "string", description: "Filter by agent ID" },
      },
    },
  },
  {
    name: "edges_create",
    description: "Create a relationship between two concepts.",
    inputSchema: {
      type: "object",
      properties: {
        source:   { type: "number", description: "Source concept ID" },
        target:   { type: "number", description: "Target concept ID" },
        relation: { type: "string", description: "Relationship type (DEPENDS_ON, CONFLICTS_WITH, DEFINED_IN)" },
        weight:   { type: "number", description: "Relationship strength 0-1 (default 1.0)" },
      },
      required: ["source", "target", "relation"],
    },
  },
  //
  // Full CRUD for concepts, edges, annotations, provenance, rules
  //
  {
    name: "concepts_get",
    description: "Get a single concept by ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number", description: "Concept ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "concepts_update",
    description: "Update an existing concept's name or type.",
    inputSchema: {
      type: "object",
      properties: {
        id:   { type: "number", description: "Concept ID to update" },
        name: { type: "string", description: "New concept name" },
        type: { type: "string", description: "New concept type" },
      },
      required: ["id"],
    },
  },
  {
    name: "concepts_delete",
    description: "Delete a concept and cascade-remove its edges, annotations, and provenance.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number", description: "Concept ID to delete" },
      },
      required: ["id"],
    },
  },
  {
    name: "edges_get",
    description: "Get a single edge by ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number", description: "Edge ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "edges_update",
    description: "Update an existing edge's relation or weight.",
    inputSchema: {
      type: "object",
      properties: {
        id:       { type: "number", description: "Edge ID to update" },
        relation: { type: "string", description: "New relation type" },
        weight:   { type: "number", description: "New weight (0-1)" },
      },
      required: ["id"],
    },
  },
  {
    name: "edges_delete",
    description: "Delete an edge by ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number", description: "Edge ID to delete" },
      },
      required: ["id"],
    },
  },
  {
    name: "annotations_create",
    description: "Annotate a concept with a note, caveat, or todo.",
    inputSchema: {
      type: "object",
      properties: {
        target: { type: "number", description: "Concept ID to annotate" },
        text:   { type: "string", description: "Annotation text (max 4096 chars)" },
        type:   { type: "string", enum: ["note", "caveat", "todo"], description: "Annotation type" },
      },
      required: ["target", "text", "type"],
    },
  },
  {
    name: "annotations_list",
    description: "List annotations, optionally filtered by concept or type.",
    inputSchema: {
      type: "object",
      properties: {
        target: { type: "number", description: "Filter by concept ID" },
        type:   { type: "string", enum: ["note", "caveat", "todo"], description: "Filter by annotation type" },
      },
    },
  },
  {
    name: "annotations_get",
    description: "Get a single annotation by ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number", description: "Annotation ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "annotations_delete",
    description: "Delete an annotation by ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number", description: "Annotation ID to delete" },
      },
      required: ["id"],
    },
  },
  {
    name: "provenance_create",
    description: "Link a concept to its source file for traceability.",
    inputSchema: {
      type: "object",
      properties: {
        concept_id: { type: "number", description: "Concept ID" },
        file_url:   { type: "string", description: "Source file path" },
      },
      required: ["concept_id", "file_url"],
    },
  },
  {
    name: "provenance_list",
    description: "List provenance links, optionally filtered by concept or file.",
    inputSchema: {
      type: "object",
      properties: {
        concept_id: { type: "number", description: "Filter by concept ID" },
        file_url:   { type: "string", description: "Filter by file path" },
      },
    },
  },
  {
    name: "provenance_delete",
    description: "Delete a provenance link.",
    inputSchema: {
      type: "object",
      properties: {
        concept_id: { type: "number", description: "Concept ID" },
        file_url:   { type: "string", description: "File path" },
      },
      required: ["concept_id", "file_url"],
    },
  },
  {
    name: "rules_create",
    description: "Create a Datalog integrity rule for the knowledge graph.",
    inputSchema: {
      type: "object",
      properties: {
        name:        { type: "string", description: "Rule name (e.g., 'no_self_edges')" },
        description: { type: "string", description: "Human-readable description" },
        body:        { type: "string", description: "Datalog rule body" },
      },
      required: ["name", "description", "body"],
    },
  },
  {
    name: "rules_list",
    description: "List all integrity rules.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "rules_get",
    description: "Get a single rule by name.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Rule name" },
      },
      required: ["name"],
    },
  },
  {
    name: "rules_delete",
    description: "Delete an integrity rule by name.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Rule name to delete" },
      },
      required: ["name"],
    },
  },
  {
    name: "prune",
    description: "Remove orphaned concepts (no edges) and their provenance/annotations. Returns what was removed.",
    inputSchema: {
      type: "object",
      properties: {
        dry_run: { type: "boolean", description: "Preview what would be pruned without deleting" },
      },
    },
  },
  {
    name: "lens_create",
    description: "Create a new lens (isolated knowledge graph).",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Lens name" },
      },
      required: ["name"],
    },
  },
  {
    name: "lens_use",
    description: "Switch to a lens (activate it as the current knowledge graph).",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Lens name to activate" },
      },
      required: ["name"],
    },
  },
  {
    name: "lens_list",
    description: "List all available lenses.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "lens_delete",
    description: "Delete a lens and its databases.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Lens name to delete" },
      },
      required: ["name"],
    },
  },
  {
    name: "digest",
    description: "Universal intake: consume a URL, file, directory, or text into the knowledge graph. For local code directories, runs AST + LLM extraction with provenance. For URLs/files/stdin, extracts concepts, edges, and episodes via LLM. Deduplicates by content hash. Rate-limited.",
    inputSchema: {
      type: "object",
      properties: {
        source:   { type: "string", description: "URL, file path, directory, or \"-\" for stdin" },
        lens:     { type: "string", description: "Lens prompt to shape extraction (e.g. 'Focus on security concerns')" },
        dry_run:  { type: "boolean", description: "Preview what would be extracted without writing" },
      },
      required: ["source"],
    },
  },
  {
    name: "ask",
    description: "Ask a question and get a synthesized answer from the knowledge graph. Vector-searches concepts and episodes for relevant context, enriches with graph neighbors, then uses LLM to synthesize an answer with citations. Rate-limited.",
    inputSchema: {
      type: "object",
      properties: {
        question: { type: "string", description: "The question to answer" },
        limit:    { type: "number", description: "Max context items to load (default 20)" },
        agent_id: { type: "string", description: "Filter by agent ID" },
        after:    { type: "string", description: "Only use knowledge after this ISO timestamp" },
        before:   { type: "string", description: "Only use knowledge before this ISO timestamp" },
        lens:     { type: "string", description: "Lens prompt to shape the answer" },
      },
      required: ["question"],
    },
  },
  {
    name: "storm",
    description: "Divergent brainstorming over accumulated knowledge. Finds gaps, surfaces blind spots, proposes new connections, and suggests next actions. Generates new concepts, edges, and episodes. Supports multi-round deepening. Rate-limited.",
    inputSchema: {
      type: "object",
      properties: {
        seed:    { type: "string", description: "Topic to seed brainstorming (optional — omit for broad brainstorm)" },
        input:   { type: "string", description: "File path to brainstorm against" },
        rounds:  { type: "number", description: "Iterative deepening rounds (default 1, max 5)" },
        limit:   { type: "number", description: "Max context items per round (default 20)" },
        dry_run: { type: "boolean", description: "Preview without writing to graph" },
      },
    },
  },
  {
    name: "enhance",
    description: "Convergent refinement of existing knowledge. Merges duplicate concepts, adds missing edges between related concepts, and surfaces contradictions and quality issues. Does NOT add new topics — only refines what's there. Rate-limited.",
    inputSchema: {
      type: "object",
      properties: {
        focus:   { type: "string", description: "Topic to focus refinement on (optional)" },
        rounds:  { type: "number", description: "Iterative refinement rounds (default 1, max 5)" },
        limit:   { type: "number", description: "Max context items (default 30)" },
        dry_run: { type: "boolean", description: "Preview without writing" },
      },
    },
  },
  {
    name: "loop",
    description: "Autonomous goal-directed research. Give a goal and brane reflects on gaps, searches the web, digests findings, and repeats until convergent. Rate-limited.",
    inputSchema: {
      type: "object",
      properties: {
        goal:    { type: "string", description: "Research goal" },
        rounds:  { type: "number", description: "Max rounds (default 5, max 10)" },
        resume:  { type: "string", description: "Resume a paused loop by ID" },
        dry_run: { type: "boolean", description: "Preview without searching/digesting" },
      },
      required: ["goal"],
    },
  },
  {
    name: "loop_list",
    description: "List all research loops with their status.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "rebuild",
    description: "Re-extract all digested sources through current active lenses. Clears digest records and re-processes each source chronologically. Use after changing active lenses.",
    inputSchema: {
      type: "object",
      properties: {
        lens:    { type: "string", description: "Override lens prompt for rebuild" },
        dry_run: { type: "boolean", description: "Show what would be rebuilt" },
      },
    },
  },
  {
    name: "tldr",
    description: "Show a structured outline of what brane knows. Groups concepts into topics with one-line synopses and lists recent learnings.",
    inputSchema: {
      type: "object",
      properties: {
        focus: { type: "string", description: "Focus on a topic area" },
        limit: { type: "number", description: "Max items to load (default: 50)" },
      },
    },
  },
  {
    name: "lens_prompt_set",
    description: "Create or update a lens prompt (cognitive filter). Lens prompts shape how digest, storm, enhance, and ask process information. Use lens_prompt_on to activate after creating.",
    inputSchema: {
      type: "object",
      properties: {
        name:        { type: "string", description: "Lens name" },
        prompt:      { type: "string", description: "The lens prompt text" },
        description: { type: "string", description: "Optional description" },
      },
      required: ["name", "prompt"],
    },
  },
  {
    name: "lens_prompt_on",
    description: "Activate a lens prompt. Active lenses shape all future digest/storm/enhance/ask operations. Multiple lenses can be active simultaneously.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Lens name to activate" },
      },
      required: ["name"],
    },
  },
  {
    name: "lens_prompt_off",
    description: "Deactivate a lens prompt.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Lens name to deactivate" },
      },
      required: ["name"],
    },
  },
  {
    name: "ingest_sessions",
    description: "Passively ingest Claude Code session logs into episodic memory. Parses JSONL conversation logs to extract human↔assistant exchanges and store them as episodes. Tracks ingested sessions to avoid duplicates.",
    inputSchema: {
      type: "object",
      properties: {
        path:    { type: "string", description: "Explicit session file (.jsonl) or project directory. Auto-discovers for current project if omitted." },
        limit:   { type: "number", description: "Max sessions to process (default 10)" },
        dry_run: { type: "boolean", description: "Preview what would be ingested without creating episodes" },
      },
    },
  },
  {
    name: "verify",
    description: "Run integrity checks on the knowledge graph (detect cycles, orphans, and custom rules).",
    inputSchema: {
      type: "object",
      properties: {
        rules: { type: "array", items: { type: "string" }, description: "Specific rule names to check (default: all)" },
      },
    },
  },
  {
    name: "context_query",
    description: "Query the knowledge graph with natural language and get a context bundle (relevant concepts, edges, provenance).",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Natural language question about the codebase" },
        limit: { type: "number", description: "Max concepts to include (default 10)" },
      },
      required: ["query"],
    },
  },
  {
    name: "episodes_create",
    description: "Record an episodic memory — what an agent observed, did, or learned.",
    inputSchema: {
      type: "object",
      properties: {
        agent_id:          { type: "string", description: "Which agent is recording this (e.g., 'claude-code')" },
        observation:       { type: "string", description: "What the agent noticed or learned" },
        context:           { type: "string", description: "What was happening (task, file, conversation)" },
        outcome:           { type: "string", description: "What happened as a result" },
        tags:              { type: "array", items: { type: "string" }, description: "Labels for this episode" },
        source_concept_id: { type: "number", description: "Optional link to a related concept ID" },
      },
      required: ["agent_id", "observation"],
    },
  },
  {
    name: "episodes_list",
    description: "List episodic memories with optional filters: agent, tag, time range.",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: { type: "string", description: "Filter by agent ID" },
        tag:      { type: "string", description: "Filter by tag" },
        after:    { type: "string", description: "Only episodes after this ISO timestamp" },
        before:   { type: "string", description: "Only episodes before this ISO timestamp" },
        limit:    { type: "number", description: "Max results (default 100)" },
      },
    },
  },
  {
    name: "episodes_search",
    description: "Semantic search over episodic memories — find relevant past experiences by meaning.",
    inputSchema: {
      type: "object",
      properties: {
        query:    { type: "string", description: "Natural language search query" },
        limit:    { type: "number", description: "Max results (default 10)" },
        agent_id: { type: "string", description: "Filter by agent ID" },
        after:    { type: "string", description: "Only episodes after this ISO timestamp" },
        before:   { type: "string", description: "Only episodes before this ISO timestamp" },
      },
      required: ["query"],
    },
  },
  //
  // High-level agent memory tools (remember/recall/forget)
  //
  //
  // High-level knowledge graph tools (ask/reflect/relate)
  //
  {
    name: "ask",
    description: "Search the knowledge graph for concepts related to a question. Returns relevant concepts with their connections for richer context.",
    inputSchema: {
      type: "object",
      properties: {
        query:  { type: "string", description: "Natural language question or topic" },
        limit:  { type: "number", description: "Max concepts to return (default 5)" },
        after:  { type: "string", description: "Only concepts created after this ISO timestamp" },
        before: { type: "string", description: "Only concepts created before this ISO timestamp" },
      },
      required: ["query"],
    },
  },
  {
    name: "reflect",
    description: "Get a summary of what brane knows — concept counts, edge counts, type distribution. Optionally render as a graph diagram.",
    inputSchema: {
      type: "object",
      properties: {
        format: { type: "string", enum: ["summary", "mermaid", "ascii"], description: "Output format (default summary)" },
        limit:  { type: "number", description: "Max nodes for mermaid/ascii (default 50)" },
      },
    },
  },
  {
    name: "relate",
    description: "Create a relationship between two concepts in the knowledge graph.",
    inputSchema: {
      type: "object",
      properties: {
        source:   { type: "number", description: "Source concept ID" },
        target:   { type: "number", description: "Target concept ID" },
        relation: { type: "string", description: "Relationship type (DEPENDS_ON, CONFLICTS_WITH, DEFINED_IN, or any string)" },
        weight:   { type: "number", description: "Relationship strength 0-1 (default 1.0)" },
      },
      required: ["source", "target", "relation"],
    },
  },
  //
  // High-level agent memory tools (remember/recall/forget)
  //
  {
    name: "remember",
    description: "Store a memory about something you observed, learned, or decided. Auto-detects and adds type tags (decision, preference, fact, event, lesson, caveat) from observation text, merged with any tags you provide.",
    inputSchema: {
      type: "object",
      properties: {
        observation: { type: "string", description: "What you observed, learned, or decided" },
        context:     { type: "string", description: "What you were doing when you learned this" },
        outcome:     { type: "string", description: "What happened as a result" },
        tags:        { type: "array", items: { type: "string" }, description: "Standard tags: decision, preference, fact, event, lesson, caveat. Auto-detected if omitted." },
      },
      required: ["observation"],
    },
  },
  {
    name: "recall",
    description: "Search your memories for relevant past experiences. Use this when you want to remember something from a previous conversation or task.",
    inputSchema: {
      type: "object",
      properties: {
        query:  { type: "string", description: "What you're trying to remember — describe the topic or situation" },
        limit:  { type: "number", description: "Max memories to return (default 5)" },
        tag:    { type: "string", description: "Filter to memories with this tag" },
        after:  { type: "string", description: "Only memories after this ISO timestamp (e.g. 2026-03-20T00:00:00Z)" },
        before: { type: "string", description: "Only memories before this ISO timestamp" },
      },
      required: ["query"],
    },
  },
  {
    name: "forget",
    description: "Remove a memory that is no longer relevant or correct.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number", description: "Episode ID to forget" },
      },
      required: ["id"],
    },
  },
  {
    name: "consolidate",
    description: "Review episodic memories for patterns and propose distilling them into semantic concepts. Returns a dry-run diff showing proposed merges. Does NOT auto-apply — present results to user for approval.",
    inputSchema: {
      type: "object",
      properties: {
        agent_id:  { type: "string", description: "Agent ID to consolidate episodes for (auto-populated)" },
        threshold: { type: "number", description: "Similarity threshold 0-1 (default 0.85)" },
        min_size:  { type: "number", description: "Minimum cluster size (default 2)" },
      },
    },
  },
  {
    name: "decay",
    description: "Score memories by recency and relevance, and identify low-value ones for pruning. Returns scored list with recommendations. Always runs as dry_run via MCP.",
    inputSchema: {
      type: "object",
      properties: {
        agent_id:               { type: "string", description: "Agent ID (auto-populated)" },
        mode:                   { type: "string", enum: ["soft", "hard", "capacity"], description: "Decay mode (default: soft)" },
        min_score:              { type: "number", description: "Minimum retention score (default 0.1)" },
        max_episodes:           { type: "number", description: "Max episodes to keep (capacity mode, default 1000)" },
        recency_half_life_days: { type: "number", description: "Half-life in days for recency scoring (default 30)" },
      },
    },
  },
]

//
// Tool name → sys.call path mapping
//

const TOOL_ROUTES: Record<string, string> = {
  search:              "/mind/search",
  graph_summary:       "/graph/summary",
  graph_viz:           "/graph/viz",
  graph_neighbors:     "/graph/neighbors",
  concepts_list:       "/mind/concepts/list",
  concepts_create:     "/mind/concepts/create",
  concepts_get:        "/mind/concepts/get",
  concepts_update:     "/mind/concepts/update",
  concepts_delete:     "/mind/concepts/delete",
  edges_list:          "/mind/edges/list",
  edges_create:        "/mind/edges/create",
  edges_get:           "/mind/edges/get",
  edges_update:        "/mind/edges/update",
  edges_delete:        "/mind/edges/delete",
  annotations_create:  "/mind/annotations/create",
  annotations_list:    "/mind/annotations/list",
  annotations_get:     "/mind/annotations/get",
  annotations_delete:  "/mind/annotations/delete",
  provenance_create:   "/mind/provenance/create",
  provenance_list:     "/mind/provenance/list",
  provenance_delete:   "/mind/provenance/delete",
  rules_create:        "/mind/rules/create",
  rules_list:          "/mind/rules/list",
  rules_get:           "/mind/rules/get",
  rules_delete:        "/mind/rules/delete",
  prune:               "/mind/prune",
  lens_create:         "/lens/create",
  lens_use:            "/lens/use",
  lens_list:           "/lens/list",
  lens_delete:         "/lens/delete",
  verify:              "/mind/verify",
  context_query:       "/context/query",
  episodes_create:     "/mind/episodes/create",
  episodes_list:       "/mind/episodes/list",
  episodes_search:     "/mind/episodes/search",
  relate:              "/mind/edges/create",
  ingest_sessions:     "/calabi/ingest-sessions",
  digest:              "/calabi/digest",
  ask:                 "/calabi/ask",
  storm:               "/calabi/storm",
  enhance:             "/calabi/enhance",
  loop:                "/calabi/loop",
  loop_list:           "/calabi/loop",
  rebuild:             "/calabi/rebuild",
  tldr:                "/calabi/tldr",
  lens_prompt_set:     "/lens/prompt",
  lens_prompt_on:      "/lens/prompt",
  lens_prompt_off:     "/lens/prompt",
}

//
// MCP Resource definitions (#41)
//

interface McpResource {
  uri:         string
  name:        string
  description: string
  mimeType:    string
}

interface McpResourceTemplate {
  uriTemplate: string
  name:        string
  description: string
  mimeType:    string
}

const RESOURCES: McpResource[] = [
  {
    uri:         "brane://concepts",
    name:        "Concepts",
    description: "All concepts in the knowledge graph",
    mimeType:    "application/json",
  },
  {
    uri:         "brane://episodes",
    name:        "Episodes",
    description: "Recent episodic memories",
    mimeType:    "application/json",
  },
  {
    uri:         "brane://graph/summary",
    name:        "Graph Summary",
    description: "Knowledge graph statistics (concept count, edge count, types)",
    mimeType:    "application/json",
  },
]

const RESOURCE_TEMPLATES: McpResourceTemplate[] = [
  {
    uriTemplate: "brane://concepts/{id}",
    name:        "Concept by ID",
    description: "A single concept with its edges and neighbors",
    mimeType:    "application/json",
  },
  {
    uriTemplate: "brane://episodes/{id}",
    name:        "Episode by ID",
    description: "A single episodic memory",
    mimeType:    "application/json",
  },
  {
    uriTemplate: "brane://search?q={query}",
    name:        "Semantic Search",
    description: "Search concepts by semantic similarity",
    mimeType:    "application/json",
  },
  {
    uriTemplate: "brane://neighbors/{id}",
    name:        "Neighbors",
    description: "Graph neighborhood of a concept",
    mimeType:    "application/json",
  },
]

//
// MCP Prompt definitions (#42)
//

interface McpPromptDef {
  name:        string
  description: string
  arguments?:  { name: string; description: string; required: boolean }[]
}

const PROMPTS: McpPromptDef[] = [
  {
    name:        "memory-protocol",
    description: "System prompt for how to use brane as memory — when to remember, recall, digest, and reflect",
  },
  {
    name:        "pre-task-recall",
    description: "Recall relevant memories before starting a task",
    arguments:   [{ name: "task_description", description: "What you are about to do", required: true }],
  },
  {
    name:        "post-task-remember",
    description: "Remember what was learned after completing a task",
    arguments:   [
      { name: "task_description", description: "What you just did", required: true },
      { name: "outcome", description: "What happened — success, failure, surprising findings", required: true },
    ],
  },
  {
    name:        "codebase-analysis",
    description: "Systematic approach to learning a new codebase via brane",
    arguments:   [{ name: "path", description: "Path to the codebase or directory to analyze", required: true }],
  },
  {
    name:        "knowledge-audit",
    description: "Review and clean up accumulated knowledge — find gaps, stale entries, consolidation opportunities",
  },
]

type PromptRenderer = (args: Record<string, string>) => { role: string; content: { type: string; text: string } }[]

const PROMPT_CONTENT: Record<string, PromptRenderer> = {
  "memory-protocol": () => [{
    role: "user",
    content: {
      type: "text",
      text: `You have access to brane — 3 verbs, that's it.

## remember
Store what you learned. Tags auto-detected (decision, preference, fact, event, lesson, caveat).
- Something surprising or non-obvious happened
- The user shared context you'll need later
- A task succeeded or failed unexpectedly

## recall
Search by meaning. Results include trust tiers (high=self, medium=file, low=external).
- Starting a task — check for relevant past experience
- Hitting an error — have you seen this before?
- Making a decision — what worked last time?

## forget
Remove a memory by ID. Use when a memory is wrong or stale.

## Principles
- Remember outcomes, not actions: "auth timeout in CI" > "something broke"
- Be specific: one clear sentence per memory
- Trust the tiers: high-trust memories can be acted on, low-trust should be verified
- Tags enable filtered recall: recall with tag="decision" finds only decisions`
    }
  }],

  "pre-task-recall": (args) => [{
    role: "user",
    content: {
      type: "text",
      text: `Before starting this task, recall any relevant memories from brane.

TASK: ${args.task_description ?? "(no task specified)"}

Steps:
1. Use \`recall\` with keywords from the task description
2. Use \`ask\` to search the knowledge graph for related concepts
3. Review any relevant episodes (past experiences with similar tasks)
4. Note any patterns, warnings, or successful approaches from past work
5. Proceed with the task, informed by your recalled context`
    }
  }],

  "post-task-remember": (args) => [{
    role: "user",
    content: {
      type: "text",
      text: `You just completed a task. Remember what you learned for next time.

TASK: ${args.task_description ?? "(no task specified)"}
OUTCOME: ${args.outcome ?? "(no outcome specified)"}

Remember:
1. What was the task and what happened?
2. Were there any surprises or unexpected challenges?
3. What approach worked (or didn't)?
4. What would you do differently next time?
5. Are there any concepts or relationships worth adding to the knowledge graph?

Use \`remember\` to save the key takeaways as episodic memories.
Tags are auto-detected, but you can be explicit: decision, preference, fact, event, lesson, caveat.
Use \`digest\` if you discovered structural relationships worth capturing.`
    }
  }],

  "codebase-analysis": (args) => [{
    role: "user",
    content: {
      type: "text",
      text: `Systematically analyze and learn a codebase using brane.

TARGET: ${args.path ?? "(no path specified)"}

Approach:
1. Start with the entry point (main, index, app)
2. Identify key modules, services, and their responsibilities
3. Map dependencies between components
4. Note any patterns, conventions, or architectural decisions
5. Identify potential issues (circular deps, tight coupling, etc.)

For each component you discover:
- Use \`digest\` to ingest the codebase path and extract concepts with the right types
- Use \`relate\` to capture relationships (DEPENDS_ON, CONTAINS, IMPLEMENTS)
- Use \`remember\` for observations about code quality, conventions, or gotchas

End with \`reflect\` to summarize what you've learned.`
    }
  }],

  "knowledge-audit": () => [{
    role: "user",
    content: {
      type: "text",
      text: `Audit your accumulated brane knowledge. Find gaps, stale entries, and consolidation opportunities.

Steps:
1. Use \`reflect\` to get a high-level summary of what's in the knowledge graph
2. Review the concept types — are they consistent? Any duplicates?
3. Check edge relationships — do they accurately represent the codebase?
4. Look at recent episodes — any that should be consolidated into concepts?
5. Identify knowledge gaps — what important parts of the system are missing?

Actions:
- Use \`decay\` (dry run) to see which memories are losing relevance
- Use \`consolidate\` (dry run) to see which episodes could merge into concepts
- Clean up duplicates or incorrect relationships
- Add missing concepts for important system components`
    }
  }],
}

//
// Max payload size for recall results (bytes). Prevents overflowing agent context windows.
//
//
// Max payload sizes (bytes). Prevents overflowing agent context windows.
// BRANE_MCP_MAX_RESPONSE env var overrides the default.
//
const MAX_RESPONSE_BYTES = parseInt(process.env.BRANE_MCP_MAX_RESPONSE ?? "", 10) || (64 * 1024)  // 64KB default
const MAX_RECALL_PAYLOAD = 32 * 1024  // 32KB (tighter limit for recall, fits within MAX_RESPONSE_BYTES)

//
// MCP client metadata (populated during initialize)
//
let mcp_agent_id = "unknown"

//
// State
//

let initialized = false

//
// Handle initialize
//

async function handle_initialize(params: Record<string, unknown>): Promise<unknown> {
  // Reset rate limiter for new session (#51)
  reset_rate_limiter()

  // Extract agent_id from client info
  const client_info = params.clientInfo as { name?: string } | undefined
  if (client_info?.name) {
    mcp_agent_id = client_info.name
  }

  // Auto-create per-agent lens for isolation (#40)
  if (mcp_agent_id !== "unknown") {
    await sys.call("/mind/agent-lens/init", { agent_id: mcp_agent_id })
  }

  // Acquire advisory lock on the active lens directory (#48)
  try {
    const paths = resolve_lens_paths()
    const lens_dir = paths.lens_name === "default"
      ? resolve(paths.brane_path, "lens", "default")
      : resolve(paths.brane_path, "lens", paths.lens_name)
    const lock_path = resolve(lens_dir, ".lock")
    const lock = acquire_lock(lock_path)

    if (!lock.acquired) {
      throw new McpError(-32002, lock.error ?? "Failed to acquire lens lock")
    }

    // Auto-release on process exit/crash
    auto_release_on_exit(lock_path)

    // Auto-flush access log on process exit (#54)
    auto_flush_on_exit()
  } catch (err) {
    if (err instanceof McpError) throw err
    // Lock failure is advisory — don't block initialization
    console.error(`brane: warning: lock acquisition failed: ${err instanceof Error ? err.message : String(err)}`)
  }

  return {
    protocolVersion: MCP_VERSION,
    capabilities: { tools: {}, resources: {}, prompts: {} },
    serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
  }
}

//
// Handle tools/list
//

function handle_tools_list(): unknown {
  if (MCP_MODE === "full") {
    return { tools: TOOLS }
  }
  // Default: only the 3 hippocampus verbs
  return { tools: HIPPOCAMPUS_TOOLS }
}

//
// Handle resources/list
//

function handle_resources_list(): unknown {
  return { resources: RESOURCES }
}

//
// Handle resources/templates/list
//

function handle_resources_templates_list(): unknown {
  return { resourceTemplates: RESOURCE_TEMPLATES }
}

//
// Handle resources/read
//

async function handle_resources_read(params: Record<string, unknown>): Promise<unknown> {
  const uri = String(params.uri ?? "")

  if (!uri.startsWith("brane://")) {
    throw new McpError(-32602, `Invalid resource URI: ${uri}`)
  }

  const path = uri.slice("brane://".length)

  // Static resources
  if (path === "concepts") {
    const result = await sys.call("/mind/concepts/list", {})
    if (result.status === "error") throw new McpError(-32603, "Failed to list concepts")
    const data = result.result as Record<string, unknown>
    return {
      contents: [{
        uri,
        mimeType: "application/json",
        text: JSON.stringify(data, null, 2),
      }]
    }
  }

  if (path === "episodes") {
    const result = await sys.call("/mind/episodes/list", { agent_id: mcp_agent_id !== "unknown" ? mcp_agent_id : undefined })
    if (result.status === "error") throw new McpError(-32603, "Failed to list episodes")
    const data = result.result as Record<string, unknown>
    return {
      contents: [{
        uri,
        mimeType: "application/json",
        text: JSON.stringify(data, null, 2),
      }]
    }
  }

  if (path === "graph/summary") {
    const result = await sys.call("/graph/summary", {})
    if (result.status === "error") throw new McpError(-32603, "Failed to get graph summary")
    const data = result.result as Record<string, unknown>
    return {
      contents: [{
        uri,
        mimeType: "application/json",
        text: JSON.stringify(data, null, 2),
      }]
    }
  }

  // Parameterized resources: concepts/{id}
  const concept_match = path.match(/^concepts\/(\d+)$/)
  if (concept_match) {
    const id = parseInt(concept_match[1], 10)
    const result = await sys.call("/mind/concepts/get", { id })
    if (result.status === "error") throw new McpError(-32603, `Failed to get concept ${id}`)
    const data = result.result as Record<string, unknown>

    // Enrich with edges (null-safe)
    if (data && typeof data === "object") {
      const neighbors = await sys.call("/graph/neighbors", { id })
      if (neighbors.status === "success") {
        data.neighbors = (neighbors.result as Record<string, unknown>)
      }
    }

    return {
      contents: [{
        uri,
        mimeType: "application/json",
        text: JSON.stringify(data, null, 2),
      }]
    }
  }

  // Parameterized resources: episodes/{id}
  const episode_match = path.match(/^episodes\/(\d+)$/)
  if (episode_match) {
    const id = parseInt(episode_match[1], 10)
    const result = await sys.call("/mind/episodes/get", { id })
    if (result.status === "error") throw new McpError(-32603, `Failed to get episode ${id}`)
    const data = result.result as Record<string, unknown>
    return {
      contents: [{
        uri,
        mimeType: "application/json",
        text: JSON.stringify(data, null, 2),
      }]
    }
  }

  // Parameterized resources: search?q={query}
  if (path.startsWith("search?")) {
    const search_params = new URLSearchParams(path.slice("search?".length))
    const query = search_params.get("q") ?? ""
    if (!query) throw new McpError(-32602, "Missing required parameter: q")
    const result = await sys.call("/mind/search", { query, limit: 10 })
    if (result.status === "error") throw new McpError(-32603, "Failed to search")
    const data = result.result as Record<string, unknown>
    return {
      contents: [{
        uri,
        mimeType: "application/json",
        text: JSON.stringify(data, null, 2),
      }]
    }
  }

  // Parameterized resources: neighbors/{id}
  const neighbors_match = path.match(/^neighbors\/(\d+)$/)
  if (neighbors_match) {
    const id = parseInt(neighbors_match[1], 10)
    const result = await sys.call("/graph/neighbors", { id })
    if (result.status === "error") throw new McpError(-32603, `Failed to get neighbors for ${id}`)
    const data = result.result as Record<string, unknown>
    return {
      contents: [{
        uri,
        mimeType: "application/json",
        text: JSON.stringify(data, null, 2),
      }]
    }
  }

  throw new McpError(-32602, `Unknown resource URI: ${uri}`)
}

//
// Handle prompts/list
//

function handle_prompts_list(): unknown {
  return { prompts: PROMPTS }
}

//
// Handle prompts/get
//

function handle_prompts_get(params: Record<string, unknown>): unknown {
  const name = String(params.name ?? "")
  const renderer = PROMPT_CONTENT[name]

  if (!renderer) {
    throw new McpError(-32602, `Unknown prompt: ${name}`)
  }

  const args = (params.arguments ?? {}) as Record<string, string>
  const messages = renderer(args)

  return {
    description: PROMPTS.find(p => p.name === name)?.description ?? "",
    messages,
  }
}

class McpError extends Error {
  code: number
  constructor(code: number, message: string) {
    super(message)
    this.code = code
  }
}

//
// Custom tool handlers for high-level agent memory tools
//

type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>

function truncate_payload(text: string, max_bytes: number): string {
  const buf = Buffer.from(text, "utf8")
  if (buf.length <= max_bytes) return text
  // Slice raw bytes, avoiding partial UTF-8 sequences
  const truncated = buf.subarray(0, max_bytes - 50)
  // toString replaces partial trailing bytes with U+FFFD; strip those
  return truncated.toString("utf8").replace(/\uFFFD+$/, "") + "\n...(truncated)"
}

//
// Trust tier derivation from from_source (#106 foundation)
//
function derive_trust(from_source: string): "high" | "medium" | "low" {
  if (from_source === "self") return "high"
  if (from_source.startsWith("file://") || from_source.startsWith("/")) return "medium"
  return "low"  // url, stdin, etc.
}

const CUSTOM_HANDLERS: Record<string, ToolHandler> = {
  //
  // ask — semantic search + graph neighbors for richer context
  //
  async ask(args) {
    if (typeof args.query !== "string" || args.query.trim().length === 0) {
      return {
        content: [{ type: "text", text: "missing required parameter: query" }],
        isError: true,
      }
    }

    const limit = typeof args.limit === "number" ? Math.max(1, Math.min(args.limit, 50)) : 5

    // Step 1: Semantic search for relevant concepts
    const search_params: Record<string, unknown> = {
      query: args.query,
      limit,
    }
    if (args.after && typeof args.after === "string") search_params.after = args.after
    if (args.before && typeof args.before === "string") search_params.before = args.before

    const search_result = await sys.call("/mind/search", search_params)

    if (search_result.status === "error") {
      return {
        content: [{ type: "text", text: JSON.stringify(search_result, null, 2) }],
        isError: true,
      }
    }

    const raw = (search_result.result as Record<string, unknown> | null) ?? {}
    const matches = Array.isArray((raw as { matches?: unknown }).matches)
      ? (raw as { matches: { id: number; name: string; type: string; score: number }[] }).matches
      : []

    if (matches.length === 0) {
      return {
        content: [{ type: "text", text: "No relevant concepts found in the knowledge graph." }],
        isError: false,
      }
    }

    // Step 2: Get 1-hop neighbors for top results (up to 3) — in parallel
    const top = matches.slice(0, 3)
    const neighbor_results = await Promise.allSettled(
      top.map(m => sys.call("/graph/neighbors", { id: m.id, depth: 1 }))
    )

    const enriched: string[] = []
    for (let i = 0; i < top.length; i++) {
      const match = top[i]
      const parts = [`[${match.name}] (id=${match.id}, type=${match.type}, score=${match.score})`]

      const nr_settled = neighbor_results[i]
      if (nr_settled.status === "fulfilled" && nr_settled.value.status === "success") {
        const nr = nr_settled.value.result as { edges?: { source_name: string; target_name: string; relation: string }[] }
        if (nr.edges && nr.edges.length > 0) {
          parts.push("  connections:")
          for (const edge of nr.edges.slice(0, 5)) {
            parts.push(`    ${edge.source_name} --${edge.relation}--> ${edge.target_name}`)
          }
          if (nr.edges.length > 5) {
            parts.push(`    ... and ${nr.edges.length - 5} more`)
          }
        }
      }

      enriched.push(parts.join("\n"))
    }

    // Remaining matches without enrichment
    for (const match of matches.slice(3)) {
      enriched.push(`[${match.name}] (id=${match.id}, type=${match.type}, score=${match.score})`)
    }

    let text = `Found ${matches.length} relevant concepts:\n\n` + enriched.join("\n\n")
    text = truncate_payload(text, MAX_RECALL_PAYLOAD)

    return {
      content: [{ type: "text", text }],
      isError: false,
    }
  },

  //
  // reflect — graph summary or visualization
  //
  async reflect(args) {
    const valid_formats = ["summary", "mermaid", "ascii"]
    const format = typeof args.format === "string" ? args.format : "summary"

    if (!valid_formats.includes(format)) {
      return {
        content: [{ type: "text", text: `invalid format: ${format}. Must be one of: ${valid_formats.join(", ")}` }],
        isError: true,
      }
    }

    if (format === "summary") {
      const result = await sys.call("/graph/summary", {})
      if (result.status === "error") {
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          isError: true,
        }
      }

      const summary = result.result as {
        total_concepts?: number
        total_edges?: number
        concepts_by_type?: Record<string, number>
        edges_by_relation?: Record<string, number>
      } | null

      if (!summary) {
        return {
          content: [{ type: "text", text: "Knowledge graph is empty." }],
          isError: false,
        }
      }

      const parts = [`Knowledge Graph Summary:`]
      parts.push(`  Concepts: ${summary.total_concepts ?? 0}`)
      parts.push(`  Edges: ${summary.total_edges ?? 0}`)

      if (summary.concepts_by_type) {
        parts.push(`  Concept types:`)
        for (const [type, count] of Object.entries(summary.concepts_by_type)) {
          parts.push(`    ${type}: ${count}`)
        }
      }

      if (summary.edges_by_relation) {
        parts.push(`  Edge relations:`)
        for (const [rel, count] of Object.entries(summary.edges_by_relation)) {
          parts.push(`    ${rel}: ${count}`)
        }
      }

      return {
        content: [{ type: "text", text: parts.join("\n") }],
        isError: false,
      }
    }

    // mermaid or ascii
    const viz_format = format === "ascii" ? "ascii" : "mermaid"
    const limit = typeof args.limit === "number" ? Math.max(1, Math.min(args.limit, 200)) : 50

    const result = await sys.call("/graph/viz", { format: viz_format, limit })

    if (result.status === "error") {
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        isError: true,
      }
    }

    const viz = result.result as { output?: string } | null
    const text = viz?.output ?? "No graph data to visualize."

    return {
      content: [{ type: "text", text: truncate_payload(text, MAX_RECALL_PAYLOAD) }],
      isError: false,
    }
  },

  //
  // remember — dual-write: graph episode + memories.db audit trail (#103)
  //
  async remember(args) {
    const observation = String(args.observation ?? "")
    const outcome = String(args.outcome ?? "")
    const agent_tags = Array.isArray(args.tags) ? args.tags.map(String) : []

    // Auto-tag: detect tags from observation + outcome text (#55)
    const tag_text = [observation, outcome].filter(Boolean).join(" ")
    const detected_tags = auto_tag(tag_text)
    const merged_tags = [...new Set([...agent_tags, ...detected_tags])]

    const episode_args = {
      agent_id:    mcp_agent_id,
      observation,
      context:     args.context ?? "",
      outcome:     args.outcome ?? "",
      tags:        merged_tags,
    }

    // 1. Write to graph (episodes)
    const result = await sys.call("/mind/episodes/create", episode_args)

    if (result.status === "error") {
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        isError: true,
      }
    }

    const ep = result.result as Record<string, unknown>
    const ep_id = ep.id as number

    // 2. Dual-write to memories.db audit trail
    let memory_id: string | undefined
    try {
      const mdb = open_memories()
      if (mdb) {
        const mem = record_memory(mdb, {
          what:        observation,
          from_source: "self",
          tags:        merged_tags,
          agent:       mcp_agent_id,
          graph_id:    ep_id,
        })
        memory_id = mem.id
        mdb.close()
      }
    } catch {
      // Audit trail failure is non-fatal — graph write succeeded
    }

    // 3. Auto-connect: find related concepts in graph (#108)
    let connections: string[] = []
    try {
      const search_result = await sys.call("/mind/search", { query: observation, limit: 3 })
      if (search_result.status === "success") {
        const raw = (search_result.result as Record<string, unknown> | null) ?? {}
        const matches = Array.isArray((raw as { matches?: unknown }).matches)
          ? (raw as { matches: { id: number; name: string; score: number }[] }).matches
          : []
        // Report connections with score > 0.3 (meaningful similarity)
        connections = matches
          .filter(m => m.score > 0.3)
          .map(m => `${m.name} (score=${m.score})`)
      }
    } catch {
      // Non-fatal — connections are informational
    }

    const ep_tags = (ep.tags as string[]) ?? merged_tags
    const tag_info = ep_tags.length > 0 ? ` [${ep_tags.join(", ")}]` : ""
    const audit = memory_id ? ` audit=${memory_id}` : ""
    const conn_info = connections.length > 0 ? `\n  related: ${connections.join(", ")}` : ""
    const summary = `Remembered (id=${ep_id}${audit})${tag_info}: ${ep.observation}${conn_info}`
    return {
      content: [{ type: "text", text: summary }],
      isError: false,
    }
  },

  //
  // recall — semantic search + trust tier enrichment from memories.db (#103)
  //
  async recall(args) {
    const search_args: Record<string, unknown> = {
      query: args.query,
      limit: args.limit ?? 5,
      // Blood-brain barrier: always scoped to current agent (#105)
      agent_id: mcp_agent_id,
    }

    // Pass time-range filters if provided
    if (args.after && typeof args.after === "string") search_args.after = args.after
    if (args.before && typeof args.before === "string") search_args.before = args.before

    const result = await sys.call("/mind/episodes/search", search_args)

    if (result.status === "error") {
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        isError: true,
      }
    }

    const raw = (result.result as Record<string, unknown> | null) ?? {}
    let matches = Array.isArray((raw as { matches?: unknown }).matches)
      ? (raw as { matches: Record<string, unknown>[] }).matches
      : []

    // Post-filter by tag if specified
    if (args.tag && typeof args.tag === "string") {
      matches = matches.filter(m => {
        const tags = m.tags as string[] | undefined
        return tags && tags.includes(args.tag as string)
      })
    }

    // Enrich with trust tier from memories.db audit trail
    let mdb: ReturnType<typeof open_memories> = null
    try { mdb = open_memories() } catch { /* non-fatal */ }

    // Format for agent consumption — concise, readable, trust-annotated
    const memories = matches.map((m, i) => {
      const parts = [`[${i + 1}] (id=${m.id}, score=${m.score})`]
      parts.push(`  ${m.observation}`)
      if (m.context) parts.push(`  context: ${m.context}`)
      if (m.outcome) parts.push(`  outcome: ${m.outcome}`)
      const tags = m.tags as string[]
      if (tags && tags.length > 0) parts.push(`  tags: ${tags.join(", ")}`)

      // Trust tier from memories.db cross-reference
      if (mdb && typeof m.id === "number") {
        const audit = get_memory_by_graph_id(mdb, m.id)
        if (audit) {
          const trust = derive_trust(audit.from_source)
          parts.push(`  trust: ${trust} (from: ${audit.from_source})`)
        }
      }

      parts.push(`  when: ${m.timestamp}`)
      return parts.join("\n")
    })

    if (mdb) try { mdb.close() } catch { /* ignore */ }

    // Graph-backed recall: also search concepts for related knowledge (#108)
    let concept_section = ""
    try {
      const concept_search = await sys.call("/mind/search", {
        query: args.query as string,
        limit: 3,
      })
      if (concept_search.status === "success") {
        const craw = (concept_search.result as Record<string, unknown> | null) ?? {}
        const cmatches = Array.isArray((craw as { matches?: unknown }).matches)
          ? (craw as { matches: { id: number; name: string; type: string; score: number }[] }).matches
          : []
        // Only include meaningful matches
        const relevant = cmatches.filter(c => c.score > 0.2)
        if (relevant.length > 0) {
          const concept_lines = relevant.map(c => `  - ${c.name} (${c.type}, score=${c.score})`)

          // Get 1-hop neighbors for top concept
          let neighbor_info = ""
          try {
            const nbr = await sys.call("/graph/neighbors", { id: relevant[0].id, depth: 1 })
            if (nbr.status === "success") {
              const nr = nbr.result as { edges?: { source_name: string; target_name: string; relation: string }[] }
              if (nr.edges && nr.edges.length > 0) {
                const edge_lines = nr.edges.slice(0, 3).map(e =>
                  `    ${e.source_name} --${e.relation}--> ${e.target_name}`)
                neighbor_info = "\n  graph context:\n" + edge_lines.join("\n")
              }
            }
          } catch { /* non-fatal */ }

          concept_section = "\n\nRelated concepts:\n" + concept_lines.join("\n") + neighbor_info
        }
      }
    } catch {
      // Non-fatal — concept search is supplementary
    }

    const header = matches.length > 0
      ? `Found ${matches.length} relevant memories:`
      : "No relevant memories found."

    let text = header + "\n\n" + memories.join("\n\n") + concept_section
    text = truncate_payload(text, MAX_RECALL_PAYLOAD)

    return {
      content: [{ type: "text", text }],
      isError: false,
    }
  },

  //
  // forget — dual-delete: graph episode + memories.db tombstone (#103)
  //
  async forget(args) {
    const graph_id = args.id as number

    // 1. Delete from graph
    const result = await sys.call("/mind/episodes/delete", { id: graph_id })

    if (result.status === "error") {
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        isError: true,
      }
    }

    // 2. Tombstone in memories.db audit trail
    let tombstoned_id: string | null = null
    try {
      const mdb = open_memories()
      if (mdb) {
        tombstoned_id = tombstone_by_graph_id(mdb, graph_id)
        mdb.close()
      }
    } catch {
      // Audit trail failure is non-fatal — graph delete succeeded
    }

    const audit = tombstoned_id ? ` (audit ${tombstoned_id} tombstoned)` : ""
    return {
      content: [{ type: "text", text: `Forgot memory id=${graph_id}${audit}` }],
      isError: false,
    }
  },

  //
  // decay — always dry_run via MCP (no auto-apply)
  //
  async decay(args) {
    const decay_args: Record<string, unknown> = {
      agent_id:               args.agent_id || mcp_agent_id,
      dry_run:                true,  // Always dry_run via MCP
      mode:                   args.mode ?? "soft",
      min_score:              args.min_score ?? 0.1,
      max_episodes:           args.max_episodes ?? 1000,
      recency_half_life_days: args.recency_half_life_days ?? 30,
    }

    const result = await sys.call("/mind/decay", decay_args)

    if (result.status === "error") {
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        isError: true,
      }
    }

    const data = result.result as { scored?: any[]; archived?: number; deleted?: number; protected_count?: number } | null
    const scored = data?.scored ?? []

    if (scored.length === 0) {
      return {
        content: [{ type: "text", text: "No episodes to score for decay." }],
        isError: false,
      }
    }

    const lines: string[] = [`Memory decay analysis (${scored.length} episodes scored):\n`]

    for (const ep of scored) {
      const status = ep.protected ? " [PROTECTED]" : (ep.score < (args.min_score ?? 0.1) ? " [WOULD DECAY]" : "")
      lines.push(`  [#${ep.id}] score=${ep.score}${status}`)
      lines.push(`    ${ep.observation.slice(0, 80)}`)
    }

    lines.push("")
    lines.push("To apply: run `brane /mind/decay` with agent_id and desired mode.")

    const text = truncate_payload(lines.join("\n"), MAX_RECALL_PAYLOAD)

    return {
      content: [{ type: "text", text }],
      isError: false,
    }
  },

  //
  // consolidate — dry-run only via MCP (no auto-apply)
  //
  async consolidate(args) {
    const consolidate_args: Record<string, unknown> = {
      agent_id:  args.agent_id || mcp_agent_id,
      dry_run:   true,  // Always dry_run via MCP — user must approve
      threshold: args.threshold ?? 0.85,
      min_size:  args.min_size ?? 2,
    }

    const result = await sys.call("/mind/consolidate", consolidate_args)

    if (result.status === "error") {
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        isError: true,
      }
    }

    const data = result.result as { clusters?: unknown[] } | null
    const clusters = data?.clusters ?? []

    if (clusters.length === 0) {
      return {
        content: [{ type: "text", text: "No episode clusters found to consolidate." }],
        isError: false,
      }
    }

    // Format clusters for human review
    const lines: string[] = [`Found ${clusters.length} cluster(s) for consolidation:\n`]
    for (const [i, cluster] of (clusters as any[]).entries()) {
      lines.push(`Cluster ${i + 1} (${cluster.episode_ids.length} episodes, similarity ${cluster.similarity}):`)
      for (const [j, obs] of cluster.observations.entries()) {
        lines.push(`  - [#${cluster.episode_ids[j]}] "${obs}"`)
      }
      lines.push(`  → Proposed concept: ${cluster.proposed_concept.name} (${cluster.proposed_concept.type})`)
      lines.push("")
    }
    lines.push("To apply: run `brane /mind/consolidate` with agent_id (without dry_run).")

    const text = truncate_payload(lines.join("\n"), MAX_RECALL_PAYLOAD)

    return {
      content: [{ type: "text", text }],
      isError: false,
    }
  },
}

//
// Handle tools/call — dispatch to custom handlers or sys.call
//

async function handle_tools_call(params: Record<string, unknown>): Promise<unknown> {
  const name = String(params.name ?? "")
  const args = (params.arguments ?? {}) as Record<string, unknown>

  // Validate tool exists (check both route map and custom handlers)
  const route = TOOL_ROUTES[name]
  const custom = CUSTOM_HANDLERS[name]

  if (!route && !custom) {
    const active_tools = MCP_MODE === "full" ? TOOLS : HIPPOCAMPUS_TOOLS
    const available = active_tools.map(t => t.name).join(", ")
    return {
      content: [{ type: "text", text: `unknown tool: ${name}. Available: ${available}` }],
      isError: true,
    }
  }

  // Validate required params from schema (check both tool lists)
  const tool_def = TOOLS.find(t => t.name === name) ?? HIPPOCAMPUS_TOOLS.find(t => t.name === name)
  if (tool_def) {
    const required = (tool_def.inputSchema as { required?: string[] }).required ?? []
    for (const param of required) {
      if (args[param] === undefined || args[param] === null || args[param] === "") {
        return {
          content: [{ type: "text", text: `missing required parameter: ${param}` }],
          isError: true,
        }
      }
    }
  }

  // Auto-inject agent_id from MCP client info for tools that support it
  const AGENT_ID_TOOLS = ["concepts_create", "concepts_update", "edges_create", "edges_update", "concepts_list", "edges_list", "search", "relate", "ingest_sessions"]
  if (AGENT_ID_TOOLS.includes(name) && !args.agent_id && mcp_agent_id !== "unknown") {
    // For create/update tools, always inject. For list/search, don't inject (let them show all by default)
    if (name === "concepts_create" || name === "concepts_update" || name === "edges_create" || name === "edges_update" || name === "relate" || name === "ingest_sessions") {
      args.agent_id = mcp_agent_id
    }
  }

  // Inject action for lens_prompt_* tools
  if (name === "loop_list") args.action = "list"
  else if (name === "lens_prompt_set") args.action = "set"
  else if (name === "lens_prompt_on") args.action = "on"
  else if (name === "lens_prompt_off") args.action = "off"

  // Use custom handler if available, otherwise dispatch via route
  try {
    let response: { content: { type: string; text: string }[]; isError: boolean }

    if (custom) {
      response = await custom(args) as typeof response
    } else {
      const result = await sys.call(route!, args)
      const text = JSON.stringify(result, null, 2)
      response = {
        content: [{ type: "text", text }],
        isError: result.status === "error",
      }
    }

    // Universal truncation: enforce max response size on all tool outputs (#50)
    if (response.content && response.content.length > 0) {
      for (let i = 0; i < response.content.length; i++) {
        if (response.content[i].text && response.content[i].text.length > MAX_RESPONSE_BYTES) {
          response.content[i].text = truncate_payload(response.content[i].text, MAX_RESPONSE_BYTES)
        }
      }
    }

    // Time-based flush of access log (#54)
    maybe_flush()

    return response
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      content: [{ type: "text", text: message }],
      isError: true,
    }
  }
}

//
// JSON-RPC message handler
//

async function handle_jsonrpc_message(raw: string): Promise<string | null> {
  // Parse JSON
  let req: JsonRpcRequest
  try {
    req = JSON.parse(raw) as JsonRpcRequest
  } catch {
    const resp: JsonRpcResponse = {
      jsonrpc: "2.0",
      id: null,
      error: { code: -32700, message: "Parse error" },
    }
    return JSON.stringify(resp)
  }

  // Validate structure
  if (req.jsonrpc !== "2.0" || typeof req.method !== "string") {
    const resp: JsonRpcResponse = {
      jsonrpc: "2.0",
      id: req.id ?? null,
      error: { code: -32600, message: "Invalid request" },
    }
    return JSON.stringify(resp)
  }

  // Handle notifications (no id = no response)
  if (req.id === undefined) {
    if (req.method === "notifications/initialized") {
      initialized = true
    }
    // notifications/cancelled and others — no response
    return null
  }

  // Block requests before initialization (except initialize and ping)
  if (!initialized && req.method !== "initialize" && req.method !== "ping") {
    const resp: JsonRpcResponse = {
      jsonrpc: "2.0",
      id: req.id,
      error: { code: -32600, message: "Server not initialized" },
    }
    return JSON.stringify(resp)
  }

  // Dispatch by method
  try {
    let result: unknown

    switch (req.method) {
      case "initialize":
        result = await handle_initialize(req.params ?? {})
        break
      case "ping":
        result = {}
        break
      case "tools/list":
        result = handle_tools_list()
        break
      case "tools/call":
        result = await handle_tools_call(req.params ?? {})
        break
      case "resources/list":
        result = handle_resources_list()
        break
      case "resources/templates/list":
        result = handle_resources_templates_list()
        break
      case "resources/read":
        result = await handle_resources_read(req.params ?? {})
        break
      case "prompts/list":
        result = handle_prompts_list()
        break
      case "prompts/get":
        result = handle_prompts_get(req.params ?? {})
        break
      default: {
        const resp: JsonRpcResponse = {
          jsonrpc: "2.0",
          id: req.id,
          error: { code: -32601, message: `Method not found: ${req.method}` },
        }
        return JSON.stringify(resp)
      }
    }

    const resp: JsonRpcResponse = {
      jsonrpc: "2.0",
      id: req.id,
      result,
    }
    return JSON.stringify(resp)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    const code = err instanceof McpError ? err.code : -32603
    const resp: JsonRpcResponse = {
      jsonrpc: "2.0",
      id: req.id,
      error: { code, message },
    }
    return JSON.stringify(resp)
  }
}

//
// Main loop — read stdin line by line, write responses to stdout
//

export async function run_mcp_server(): Promise<void> {
  const decoder = new TextDecoder()
  let buffer = ""

  for await (const chunk of Bun.stdin.stream()) {
    buffer += decoder.decode(chunk, { stream: true })

    let newline_idx: number
    while ((newline_idx = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newline_idx).trim()
      buffer = buffer.slice(newline_idx + 1)

      if (line.length === 0) continue

      const response = await handle_jsonrpc_message(line)
      if (response !== null) {
        process.stdout.write(response + "\n")
      }
    }
  }
}
