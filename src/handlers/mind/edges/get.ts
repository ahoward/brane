//
// get.ts - get an edge by ID
//

import type { Params, Result, Emit } from "../../../lib/types.ts"
import { success, error } from "../../../lib/result.ts"
import { open_mind, is_mind_error } from "../../../lib/mind.ts"

interface GetParams {
  id?: number
}

interface Edge {
  id:       number
  source:   number
  target:   number
  relation: string
  weight:   number
}

export async function handler(params: Params, emit?: Emit): Promise<Result<Edge>> {
  const p = (params ?? {}) as GetParams

  // Validate id
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
    // Get edge by ID
    const result = await db.run(`
      ?[id, source, target, relation, weight] := *edges[id, source, target, relation, weight], id = ${p.id}
    `)

    const rows = result.rows as [number, number, number, string, number][]

    if (rows.length === 0) {
      db.close()
      return error({
        id: [{
          code:    "not_found",
          message: "edge not found"
        }]
      })
    }

    const [id, source, target, relation, weight] = rows[0]

    db.close()

    return success({
      id,
      source,
      target,
      relation,
      weight
    })
  } catch (err) {
    db.close()
    const message = err instanceof Error ? err.message : String(err)
    return error({
      mind: [{
        code:    "query_error",
        message: `failed to get edge: ${message}`
      }]
    })
  }
}
