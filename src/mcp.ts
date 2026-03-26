//
// mcp.ts - MCP server for brane (Model Context Protocol)
//
// JSON-RPC 2.0 over stdio. Exposes brane handlers as MCP tools.
// Pattern follows ahoward/xenv.
//

import { sys } from "./index.ts"

//
// Constants
//

const MCP_VERSION = "2024-11-05"
const SERVER_NAME = "brane"
const SERVER_VERSION = "0.2.0"

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
        query: { type: "string", description: "Natural language search query" },
        limit: { type: "number", description: "Max results to return (default 10)" },
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
    description: "List all concepts in the knowledge graph, optionally filtered by type.",
    inputSchema: {
      type: "object",
      properties: {
        type:  { type: "string", description: "Filter by concept type (Entity, Caveat, Rule)" },
        limit: { type: "number", description: "Max results (default all)" },
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
  {
    name: "learn",
    description: "Ingest files or a directory into the knowledge graph. Runs AST extraction + LLM extraction + adversarial re-extraction. Can take significant time for large directories.",
    inputSchema: {
      type: "object",
      properties: {
        path:    { type: "string", description: "File or directory path to ingest (default: current directory)" },
        dry_run: { type: "boolean", description: "Preview what would be ingested without modifying the graph" },
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
]

//
// Tool name → sys.call path mapping
//

const TOOL_ROUTES: Record<string, string> = {
  search:           "/mind/search",
  graph_summary:    "/graph/summary",
  graph_viz:        "/graph/viz",
  graph_neighbors:  "/graph/neighbors",
  concepts_list:    "/mind/concepts/list",
  concepts_create:  "/mind/concepts/create",
  edges_list:       "/mind/edges/list",
  edges_create:     "/mind/edges/create",
  learn:            "/calabi/ingest",
  verify:           "/mind/verify",
  context_query:    "/context/query",
}

//
// State
//

let initialized = false

//
// Handle initialize
//

function handle_initialize(_params: Record<string, unknown>): unknown {
  return {
    protocolVersion: MCP_VERSION,
    capabilities: { tools: {} },
    serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
  }
}

//
// Handle tools/list
//

function handle_tools_list(): unknown {
  return { tools: TOOLS }
}

//
// Handle tools/call — dispatch to sys.call
//

async function handle_tools_call(params: Record<string, unknown>): Promise<unknown> {
  const name = String(params.name ?? "")
  const args = (params.arguments ?? {}) as Record<string, unknown>

  // Validate tool exists
  const route = TOOL_ROUTES[name]
  if (!route) {
    const available = TOOLS.map(t => t.name).join(", ")
    return {
      content: [{ type: "text", text: `unknown tool: ${name}. Available: ${available}` }],
      isError: true,
    }
  }

  // Validate required params from schema
  const tool_def = TOOLS.find(t => t.name === name)
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

  // Dispatch to sys.call
  try {
    const result = await sys.call(route, args)
    const text = JSON.stringify(result, null, 2)

    return {
      content: [{ type: "text", text }],
      isError: result.status === "error",
    }
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
        result = handle_initialize(req.params ?? {})
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
    const resp: JsonRpcResponse = {
      jsonrpc: "2.0",
      id: req.id,
      error: { code: -32603, message },
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
