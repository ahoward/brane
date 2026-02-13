//
// neighbors.ts - Get neighbors of a concept
//

import type { Params, Result, Emit } from "../../lib/types.ts"
import { success, error } from "../../lib/result.ts"
import { open_mind, is_mind_error } from "../../lib/mind.ts"

interface Neighbor {
  id: number
  name: string
  type: string
  edge_id: number
  relation: string
  weight: number
}

interface NeighborsResult {
  concept: {
    id: number
    name: string
    type: string
  }
  neighbors: {
    incoming: Neighbor[]
    outgoing: Neighbor[]
    total: number
  }
}

export async function handler(params: Params, emit?: Emit): Promise<Result<NeighborsResult>> {
  const p = params as { id?: number }

  // Validate required id
  if (p.id === undefined || p.id === null) {
    return error({
      id: [{
        code:    "required",
        message: "id is required"
      }]
    })
  }

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
    // Get the concept
    const concept_result = await db.run(`
      ?[id, name, type] := *concepts[id, name, type, _], id = ${p.id}
    `)

    if (concept_result.rows.length === 0) {
      db.close()
      return error({
        id: [{
          code:    "not_found",
          message: `concept with id ${p.id} not found`
        }]
      })
    }

    const [id, name, type] = concept_result.rows[0] as [number, string, string]

    // Get incoming edges (edges where this concept is the target)
    const incoming_result = await db.run(`
      ?[source_id, source_name, source_type, edge_id, relation, weight] :=
        *edges[edge_id, source_id, target_id, relation, weight],
        *concepts[source_id, source_name, source_type, _],
        target_id = ${p.id}
    `)

    const incoming: Neighbor[] = incoming_result.rows.map((row) => {
      const [source_id, source_name, source_type, edge_id, relation, weight] = row as [number, string, string, number, string, number]
      return {
        id: source_id,
        name: source_name,
        type: source_type,
        edge_id,
        relation,
        weight
      }
    })

    // Get outgoing edges (edges where this concept is the source)
    const outgoing_result = await db.run(`
      ?[target_id, target_name, target_type, edge_id, relation, weight] :=
        *edges[edge_id, source_id, target_id, relation, weight],
        *concepts[target_id, target_name, target_type, _],
        source_id = ${p.id}
    `)

    const outgoing: Neighbor[] = outgoing_result.rows.map((row) => {
      const [target_id, target_name, target_type, edge_id, relation, weight] = row as [number, string, string, number, string, number]
      return {
        id: target_id,
        name: target_name,
        type: target_type,
        edge_id,
        relation,
        weight
      }
    })

    db.close()

    return success({
      concept: { id, name, type },
      neighbors: {
        incoming,
        outgoing,
        total: incoming.length + outgoing.length
      }
    })
  } catch (err) {
    db.close()
    const message = err instanceof Error ? err.message : String(err)
    return error({
      mind: [{
        code:    "query_error",
        message: `failed to get neighbors: ${message}`
      }]
    })
  }
}
