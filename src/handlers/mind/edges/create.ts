//
// create.ts - create a new edge between concepts
//

import type { Params, Result } from "../../../lib/types.ts"
import { success, error } from "../../../lib/result.ts"
import { open_mind, is_mind_error, is_valid_edge_relation, get_next_edge_id, concept_exists } from "../../../lib/mind.ts"

interface CreateParams {
  source?:   number
  target?:   number
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
  const p = (params ?? {}) as CreateParams

  // Validate source
  if (p.source === undefined || p.source === null) {
    return error({
      source: [{
        code:    "required",
        message: "source is required"
      }]
    })
  }

  // Validate target
  if (p.target === undefined || p.target === null) {
    return error({
      target: [{
        code:    "required",
        message: "target is required"
      }]
    })
  }

  // Validate relation
  if (p.relation === undefined || p.relation === null || p.relation === "") {
    return error({
      relation: [{
        code:    "required",
        message: "relation is required"
      }]
    })
  }

  if (!is_valid_edge_relation(p.relation)) {
    return error({
      relation: [{
        code:    "invalid",
        message: "relation must be one of: DEPENDS_ON, CONFLICTS_WITH, DEFINED_IN"
      }]
    })
  }

  // Validate weight if provided
  const weight = p.weight ?? 1.0
  if (typeof weight !== "number" || weight < 0) {
    return error({
      weight: [{
        code:    "invalid",
        message: "weight must be a positive number"
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
    // Check source concept exists
    if (!await concept_exists(db, p.source)) {
      db.close()
      return error({
        source: [{
          code:    "not_found",
          message: "source concept not found"
        }]
      })
    }

    // Check target concept exists
    if (!await concept_exists(db, p.target)) {
      db.close()
      return error({
        target: [{
          code:    "not_found",
          message: "target concept not found"
        }]
      })
    }

    // Get next ID
    const id = await get_next_edge_id(db)

    // Insert edge
    await db.run(`
      ?[id, source, target, relation, weight] <- [[${id}, ${p.source}, ${p.target}, '${p.relation}', ${weight}]]
      :put edges { id, source, target, relation, weight }
    `)

    db.close()

    return success({
      id:       id,
      source:   p.source,
      target:   p.target,
      relation: p.relation,
      weight:   weight
    })
  } catch (err) {
    db.close()
    const message = err instanceof Error ? err.message : String(err)
    return error({
      mind: [{
        code:    "query_error",
        message: `failed to create edge: ${message}`
      }]
    })
  }
}
