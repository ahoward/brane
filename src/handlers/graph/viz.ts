//
// viz.ts - Graph visualization
//

import type { Params, Result } from "../../lib/types.ts"
import { success, error } from "../../lib/result.ts"
import { open_mind, is_mind_error } from "../../lib/mind.ts"
import { render_graph, type VizConcept, type VizEdge, type VizOutput } from "../../lib/viz.ts"

interface VizParams {
  format?: "ascii" | "mermaid"
  center?: number
  limit?: number
}

export async function handler(params: Params): Promise<Result<VizOutput>> {
  const p = params as VizParams

  // Validate format if provided
  if (p.format !== undefined && p.format !== "ascii" && p.format !== "mermaid") {
    return error({
      format: [{
        code:    "invalid",
        message: "format must be 'ascii' or 'mermaid'"
      }]
    })
  }

  const format = p.format ?? "ascii"

  // Open mind.db
  const mind = open_mind()

  if (is_mind_error(mind)) {
    return error({
      mind: [{
        code:    mind.code,
        message: mind.message
      }]
    })
  }

  const { db } = mind

  try {
    let concepts: VizConcept[]
    let edges: VizEdge[]

    if (p.center !== undefined) {
      // Centered mode: get the center concept and its neighbors
      const center_result = await db.run(`
        ?[id, name, type] := *concepts[id, name, type, _], id = ${p.center}
      `)

      if (center_result.rows.length === 0) {
        db.close()
        return error({
          center: [{
            code:    "not_found",
            message: `concept with id ${p.center} not found`
          }]
        })
      }

      // Get center concept and its direct neighbors
      const concepts_result = await db.run(`
        center[id, name, type] := *concepts[id, name, type, _], id = ${p.center}
        neighbors[id, name, type] := *edges[_, ${p.center}, id, _, _], *concepts[id, name, type, _]
        neighbors[id, name, type] := *edges[_, id, ${p.center}, _, _], *concepts[id, name, type, _]
        ?[id, name, type] := center[id, name, type]
        ?[id, name, type] := neighbors[id, name, type]
      `)

      concepts = concepts_result.rows.map((row) => {
        const [id, name, type] = row as [number, string, string]
        return { id, name, type }
      })

      // Get edges between these concepts
      const concept_ids = concepts.map(c => c.id)
      const edges_result = await db.run(`
        ?[id, source, target, relation, weight] :=
          *edges[id, source, target, relation, weight],
          source in [${concept_ids.join(", ")}],
          target in [${concept_ids.join(", ")}]
      `)

      edges = edges_result.rows.map((row) => {
        const [id, source, target, relation, weight] = row as [number, number, number, string, number]
        return { id, source, target, relation, weight }
      })
    } else {
      // Full graph mode
      const concepts_result = await db.run(`
        ?[id, name, type] := *concepts[id, name, type, _]
      `)

      concepts = concepts_result.rows.map((row) => {
        const [id, name, type] = row as [number, string, string]
        return { id, name, type }
      })

      const edges_result = await db.run(`
        ?[id, source, target, relation, weight] := *edges[id, source, target, relation, weight]
      `)

      edges = edges_result.rows.map((row) => {
        const [id, source, target, relation, weight] = row as [number, number, number, string, number]
        return { id, source, target, relation, weight }
      })
    }

    db.close()

    // Render the graph
    const result = render_graph(concepts, edges, {
      format,
      center: p.center,
      limit: p.limit
    })

    return success(result)
  } catch (err) {
    db.close()
    const message = err instanceof Error ? err.message : String(err)
    return error({
      mind: [{
        code:    "query_error",
        message: `failed to generate visualization: ${message}`
      }]
    })
  }
}
