//
// viz.ts - Graph visualization utilities (ASCII and Mermaid)
//

export interface VizConcept {
  id: number
  name: string
  type: string
}

export interface VizEdge {
  id: number
  source: number
  target: number
  relation: string
  weight: number
}

export interface VizOptions {
  format: "ascii" | "mermaid"
  center?: number
  limit?: number
}

export interface VizOutput {
  format: "ascii" | "mermaid"
  output: string
  nodes: number
  edges: number
  truncated: boolean
  message?: string
}

const DEFAULT_ASCII_LIMIT = 20
const DEFAULT_MERMAID_LIMIT = 100

/**
 * Render graph as ASCII with box-drawing characters
 */
export function render_ascii(
  concepts: VizConcept[],
  edges: VizEdge[],
  options: VizOptions
): VizOutput {
  const limit = options.limit ?? DEFAULT_ASCII_LIMIT
  const truncated = concepts.length > limit
  const visible_concepts = truncated ? concepts.slice(0, limit) : concepts
  const visible_ids = new Set(visible_concepts.map(c => c.id))

  // Filter edges to only include visible concepts
  const visible_edges = edges.filter(
    e => visible_ids.has(e.source) && visible_ids.has(e.target)
  )

  if (visible_concepts.length === 0) {
    return {
      format: "ascii",
      output: "(empty graph)",
      nodes: 0,
      edges: 0,
      truncated: false
    }
  }

  // Build adjacency list for outgoing edges
  const outgoing = new Map<number, VizEdge[]>()
  for (const edge of visible_edges) {
    if (!outgoing.has(edge.source)) {
      outgoing.set(edge.source, [])
    }
    outgoing.get(edge.source)!.push(edge)
  }

  // Create concept lookup
  const concept_map = new Map<number, VizConcept>()
  for (const c of visible_concepts) {
    concept_map.set(c.id, c)
  }

  // Render each concept with its outgoing edges
  const lines: string[] = []

  for (const concept of visible_concepts) {
    lines.push(`[${concept.name}] ${concept.type}`)

    const edges_out = outgoing.get(concept.id) || []

    if (edges_out.length === 0) {
      lines.push("└── (no outgoing edges)")
    } else {
      for (let i = 0; i < edges_out.length; i++) {
        const edge = edges_out[i]
        const target = concept_map.get(edge.target)
        const is_last = i === edges_out.length - 1
        const prefix = is_last ? "└──" : "├──"

        if (target) {
          lines.push(`${prefix} ${edge.relation} → [${target.name}] ${target.type}`)
        }
      }
    }

    lines.push("")
  }

  // Remove trailing empty line
  if (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop()
  }

  const result: VizOutput = {
    format: "ascii",
    output: lines.join("\n"),
    nodes: visible_concepts.length,
    edges: visible_edges.length,
    truncated
  }

  if (truncated) {
    result.message = `Graph truncated to ${limit} nodes. Use --limit to increase or --center to focus on specific concept.`
  }

  return result
}

/**
 * Render graph as Mermaid flowchart syntax
 */
export function render_mermaid(
  concepts: VizConcept[],
  edges: VizEdge[],
  options: VizOptions
): VizOutput {
  const limit = options.limit ?? DEFAULT_MERMAID_LIMIT
  const truncated = concepts.length > limit
  const visible_concepts = truncated ? concepts.slice(0, limit) : concepts
  const visible_ids = new Set(visible_concepts.map(c => c.id))

  // Filter edges to only include visible concepts
  const visible_edges = edges.filter(
    e => visible_ids.has(e.source) && visible_ids.has(e.target)
  )

  if (visible_concepts.length === 0) {
    return {
      format: "mermaid",
      output: "graph TD\n    empty[\"(empty graph)\"]",
      nodes: 0,
      edges: 0,
      truncated: false
    }
  }

  const lines: string[] = ["graph TD"]

  // Add node definitions
  for (const concept of visible_concepts) {
    // Escape quotes in name
    const safe_name = concept.name.replace(/"/g, '\\"')
    lines.push(`    ${concept.id}["${safe_name} (${concept.type})"]`)
  }

  // Add edge definitions
  for (const edge of visible_edges) {
    lines.push(`    ${edge.source} -->|${edge.relation}| ${edge.target}`)
  }

  const result: VizOutput = {
    format: "mermaid",
    output: lines.join("\n"),
    nodes: visible_concepts.length,
    edges: visible_edges.length,
    truncated
  }

  if (truncated) {
    result.message = `Graph truncated to ${limit} nodes. Use --limit to increase or --center to focus on specific concept.`
  }

  return result
}

/**
 * Render graph in specified format
 */
export function render_graph(
  concepts: VizConcept[],
  edges: VizEdge[],
  options: VizOptions
): VizOutput {
  if (options.format === "mermaid") {
    return render_mermaid(concepts, edges, options)
  }
  return render_ascii(concepts, edges, options)
}

/**
 * Check if graph size warrants a warning
 */
export function should_warn_size(node_count: number, format: "ascii" | "mermaid"): boolean {
  if (format === "ascii") {
    return node_count > DEFAULT_ASCII_LIMIT
  }
  return node_count > DEFAULT_MERMAID_LIMIT
}
