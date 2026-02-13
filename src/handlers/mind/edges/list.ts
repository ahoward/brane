//
// list.ts - list edges with optional filters
//

import type { Params, Result, Emit } from "../../../lib/types.ts"
import { success, error } from "../../../lib/result.ts"
import { open_mind, is_mind_error } from "../../../lib/mind.ts"

interface ListParams {
  source?:   number
  target?:   number
  relation?: string
}

interface Edge {
  id:       number
  source:   number
  target:   number
  relation: string
  weight:   number
}

interface ListResult {
  edges: Edge[]
  total: number
}

export async function handler(params: Params, emit?: Emit): Promise<Result<ListResult>> {
  const p = (params ?? {}) as ListParams

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
    // Build query with optional filters
    const conditions: string[] = []

    if (p.source !== undefined && p.source !== null) {
      conditions.push(`source = ${p.source}`)
    }

    if (p.target !== undefined && p.target !== null) {
      conditions.push(`target = ${p.target}`)
    }

    if (p.relation !== undefined && p.relation !== null && p.relation !== "") {
      conditions.push(`relation = '${p.relation}'`)
    }

    const where_clause = conditions.length > 0
      ? `, ${conditions.join(", ")}`
      : ""

    const query = `
      ?[id, source, target, relation, weight] := *edges[id, source, target, relation, weight]${where_clause}
    `

    const result = await db.run(query)
    const rows = result.rows as [number, number, number, string, number][]

    const edges: Edge[] = rows.map(([id, source, target, relation, weight]) => ({
      id,
      source,
      target,
      relation,
      weight
    }))

    db.close()

    return success({
      edges,
      total: edges.length
    })
  } catch (err) {
    db.close()
    const message = err instanceof Error ? err.message : String(err)
    return error({
      mind: [{
        code:    "query_error",
        message: `failed to list edges: ${message}`
      }]
    })
  }
}
