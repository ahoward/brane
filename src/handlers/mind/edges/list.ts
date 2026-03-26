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
  agent_id?: string
  after?:    string
  before?:   string
}

interface Edge {
  id:       number
  source:   number
  target:   number
  relation: string
  weight:   number
  agent_id: string | null
}

interface ListResult {
  edges: Edge[]
  total: number
}

export async function handler(params: Params, emit?: Emit): Promise<Result<ListResult>> {
  const p = (params ?? {}) as ListParams

  // Open mind.db
  const mind = await open_mind()

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

    if (typeof p.agent_id === "string" && p.agent_id.length > 0) {
      conditions.push(`agent_id = '${p.agent_id.replace(/'/g, "''")}'`)
    }

    const has_time_filter = p.after || p.before
    let query: string

    if (has_time_filter) {
      const time_conditions: string[] = []
      if (p.after) {
        time_conditions.push(`created_at > '${p.after.replace(/'/g, "''")}'`)
      }
      if (p.before) {
        time_conditions.push(`created_at < '${p.before.replace(/'/g, "''")}'`)
      }
      const edge_clause = conditions.length > 0 ? `, ${conditions.join(", ")}` : ""
      const time_clause = time_conditions.length > 0 ? `, ${time_conditions.join(", ")}` : ""
      query = `
        ?[id, source, target, relation, weight, agent_id] := *edges[id, source, target, relation, weight, agent_id]${edge_clause}, *entity_timestamps['edge', id, created_at]${time_clause}
      `
    } else {
      const where_clause = conditions.length > 0
        ? `, ${conditions.join(", ")}`
        : ""
      query = `
        ?[id, source, target, relation, weight, agent_id] := *edges[id, source, target, relation, weight, agent_id]${where_clause}
      `
    }

    const result = await db.run(query)
    const rows = result.rows as [number, number, number, string, number, string][]

    const edges: Edge[] = rows.map(([id, source, target, relation, weight, agent_id]) => ({
      id,
      source,
      target,
      relation,
      weight,
      agent_id: agent_id || null,
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
