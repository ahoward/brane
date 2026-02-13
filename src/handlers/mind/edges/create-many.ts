//
// create-many.ts - batch create edges between concepts
//

import type { Params, Result, Emit } from "../../../lib/types.ts"
import { success, error } from "../../../lib/result.ts"
import { open_mind, is_mind_error, is_valid_edge_relation } from "../../../lib/mind.ts"
import { update_relation_usage } from "../../../lib/lens.ts"

interface ItemParams {
  source?:   number
  target?:   number
  relation?: string
  weight?:   number
}

interface CreateManyParams {
  items?: ItemParams[]
}

interface Edge {
  id:       number
  source:   number
  target:   number
  relation: string
  weight:   number
}

export async function handler(params: Params, emit?: Emit): Promise<Result<{ items: Edge[] }>> {
  const p = (params ?? {}) as CreateManyParams

  // Validate items array
  if (!Array.isArray(p.items)) {
    return error({
      items: [{
        code:    "required",
        message: "items is required and must be an array"
      }]
    })
  }

  if (p.items.length === 0) {
    return error({
      items: [{
        code:    "invalid",
        message: "items must not be empty"
      }]
    })
  }

  // Validate all items up front
  for (let i = 0; i < p.items.length; i++) {
    const item = p.items[i]

    if (item.source === undefined || item.source === null) {
      return error({
        items: [{
          code:    "required",
          message: `items[${i}].source is required`
        }]
      })
    }

    if (item.target === undefined || item.target === null) {
      return error({
        items: [{
          code:    "required",
          message: `items[${i}].target is required`
        }]
      })
    }

    if (item.relation === undefined || item.relation === null || item.relation === "") {
      return error({
        items: [{
          code:    "required",
          message: `items[${i}].relation is required`
        }]
      })
    }

    if (!is_valid_edge_relation(item.relation)) {
      return error({
        items: [{
          code:    "invalid",
          message: `items[${i}].relation must be a non-empty string`
        }]
      })
    }

    const weight = item.weight ?? 1.0
    if (typeof weight !== "number" || weight < 0) {
      return error({
        items: [{
          code:    "invalid",
          message: `items[${i}].weight must be a positive number`
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
    // Collect all unique concept IDs and verify existence in one query
    const all_ids = new Set<number>()
    for (const item of p.items) {
      all_ids.add(item.source!)
      all_ids.add(item.target!)
    }

    const id_list = [...all_ids].map(id => `[${id}]`).join(", ")
    const check_result = await db.run(`
      input[id] <- [${id_list}]
      ?[id] := input[id], *concepts[id, _, _, _]
    `)
    const found_ids = new Set((check_result.rows as number[][]).map(r => r[0]))

    // Check which IDs are missing
    for (const id of all_ids) {
      if (!found_ids.has(id)) {
        db.close()
        // Find first item referencing this missing ID
        for (let i = 0; i < p.items.length; i++) {
          if (p.items[i].source === id) {
            return error({
              items: [{
                code:    "not_found",
                message: `items[${i}].source concept ${id} not found`
              }]
            })
          }
          if (p.items[i].target === id) {
            return error({
              items: [{
                code:    "not_found",
                message: `items[${i}].target concept ${id} not found`
              }]
            })
          }
        }
      }
    }

    // Reserve edge ID range
    const counter_result = await db.run(`
      ?[value] := *schema_meta['edge_next_id', value]
    `)
    const counter_rows = counter_result.rows as string[][]
    let start_id = 1
    if (counter_rows.length > 0) {
      start_id = parseInt(counter_rows[0][0], 10)
    }
    const end_id = start_id + p.items.length

    // Update counter
    await db.run(`
      ?[key, value] <- [['edge_next_id', '${end_id}']]
      :put schema_meta { key => value }
    `)

    // Build single :put with all rows
    const rows = p.items.map((item, i) => {
      const id = start_id + i
      const weight = item.weight ?? 1.0
      return `[${id}, ${item.source}, ${item.target}, '${item.relation}', ${weight}]`
    })

    await db.run(`
      ?[id, source, target, relation, weight] <- [${rows.join(", ")}]
      :put edges { id, source, target, relation, weight }
    `)

    // Track relation usage (deduplicated)
    const unique_relations = [...new Set(p.items.map(item => item.relation!))]
    for (const relation of unique_relations) {
      try {
        await update_relation_usage(db, relation)
      } catch {
        // Silent tracking failure is acceptable
      }
    }

    db.close()

    const items: Edge[] = p.items.map((item, i) => ({
      id:       start_id + i,
      source:   item.source!,
      target:   item.target!,
      relation: item.relation!,
      weight:   item.weight ?? 1.0
    }))

    return success({ items })
  } catch (err) {
    db.close()
    const message = err instanceof Error ? err.message : String(err)
    return error({
      mind: [{
        code:    "query_error",
        message: `failed to create edges: ${message}`
      }]
    })
  }
}
