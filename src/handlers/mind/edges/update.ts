//
// update.ts - update an edge's relation or weight
//

import type { Params, Result } from "../../../lib/types.ts"
import { success, error } from "../../../lib/result.ts"
import { open_mind, is_mind_error, is_valid_edge_relation } from "../../../lib/mind.ts"
import { update_relation_usage } from "../../../lib/lens.ts"

interface UpdateParams {
  id?:       number
  relation?: string
  weight?:   number
}

interface Edge {
  id:       number
  source:   number
  target:   number
  relation: string
  weight:   number
}

export async function handler(params: Params): Promise<Result<Edge>> {
  const p = (params ?? {}) as UpdateParams

  // Validate id
  if (p.id === undefined || p.id === null) {
    return error({
      id: [{
        code:    "required",
        message: "id is required"
      }]
    })
  }

  // Validate relation if provided
  if (p.relation !== undefined && p.relation !== null && p.relation !== "") {
    if (!is_valid_edge_relation(p.relation)) {
      return error({
        relation: [{
          code:    "invalid",
          message: "relation must be a non-empty string"
        }]
      })
    }
  }

  // Validate weight if provided
  if (p.weight !== undefined && p.weight !== null) {
    if (typeof p.weight !== "number" || p.weight < 0) {
      return error({
        weight: [{
          code:    "invalid",
          message: "weight must be a positive number"
        }]
      })
    }
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
    // Get existing edge
    const existing = await db.run(`
      ?[id, source, target, relation, weight] := *edges[id, source, target, relation, weight], id = ${p.id}
    `)

    const rows = existing.rows as [number, number, number, string, number][]

    if (rows.length === 0) {
      db.close()
      return error({
        id: [{
          code:    "not_found",
          message: "edge not found"
        }]
      })
    }

    const [id, source, target, old_relation, old_weight] = rows[0]

    // Apply updates
    const new_relation = (p.relation !== undefined && p.relation !== null && p.relation !== "")
      ? p.relation
      : old_relation
    const new_weight = (p.weight !== undefined && p.weight !== null)
      ? p.weight
      : old_weight

    // Update edge
    await db.run(`
      ?[id, source, target, relation, weight] <- [[${id}, ${source}, ${target}, '${new_relation}', ${new_weight}]]
      :put edges { id, source, target, relation, weight }
    `)

    // Track relation usage silently if relation changed
    if (new_relation !== old_relation) {
      try {
        await update_relation_usage(db, new_relation)
      } catch {
        // Silent tracking failure is acceptable
      }
    }

    db.close()

    return success({
      id,
      source,
      target,
      relation: new_relation,
      weight:   new_weight
    })
  } catch (err) {
    db.close()
    const message = err instanceof Error ? err.message : String(err)
    return error({
      mind: [{
        code:    "query_error",
        message: `failed to update edge: ${message}`
      }]
    })
  }
}
