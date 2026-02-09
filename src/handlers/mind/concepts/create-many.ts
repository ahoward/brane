//
// create-many.ts - batch create concepts
//

import type { Params, Result } from "../../../lib/types.ts"
import { success, error } from "../../../lib/result.ts"
import { open_mind, is_mind_error, is_valid_concept_type } from "../../../lib/mind.ts"
import { generate_embeddings } from "../../../lib/embed.ts"
import { update_type_usage } from "../../../lib/lens.ts"

interface ItemParams {
  name?: string
  type?: string
}

interface CreateManyParams {
  items?: ItemParams[]
}

interface Concept {
  id:   number
  name: string
  type: string
}

export async function handler(params: Params): Promise<Result<{ items: Concept[] }>> {
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

    if (item.name === undefined || item.name === null || item.name === "") {
      return error({
        items: [{
          code:    "required",
          message: `items[${i}].name is required`
        }]
      })
    }

    if (item.type === undefined || item.type === null || item.type === "") {
      return error({
        items: [{
          code:    "required",
          message: `items[${i}].type is required`
        }]
      })
    }

    if (!is_valid_concept_type(item.type)) {
      return error({
        items: [{
          code:    "invalid",
          message: `items[${i}].type must be a non-empty string`
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
    // Reserve ID range: read current counter, advance by items.length
    const counter_result = await db.run(`
      ?[value] := *schema_meta['concept_next_id', value]
    `)
    const counter_rows = counter_result.rows as string[][]
    let start_id = 1
    if (counter_rows.length > 0) {
      start_id = parseInt(counter_rows[0][0], 10)
    }
    const end_id = start_id + p.items.length

    // Update counter to end_id
    await db.run(`
      ?[key, value] <- [['concept_next_id', '${end_id}']]
      :put schema_meta { key => value }
    `)

    // Batch generate embeddings
    const names = p.items.map(item => item.name!)
    const embeddings = await generate_embeddings(names)

    // Build single :put with all rows
    const rows = p.items.map((item, i) => {
      const id = start_id + i
      const escaped_name = item.name!.replace(/'/g, "''")
      const vector_str = embeddings[i] !== null ? `vec(${JSON.stringify(embeddings[i])})` : "null"
      return `[${id}, '${escaped_name}', '${item.type}', ${vector_str}]`
    })

    await db.run(`
      ?[id, name, type, vector] <- [${rows.join(", ")}]
      :put concepts { id, name, type, vector }
    `)

    // Track type usage (deduplicated)
    const unique_types = [...new Set(p.items.map(item => item.type!))]
    for (const type of unique_types) {
      try {
        await update_type_usage(db, type)
      } catch {
        // Silent tracking failure is acceptable
      }
    }

    db.close()

    const items: Concept[] = p.items.map((item, i) => ({
      id:   start_id + i,
      name: item.name!,
      type: item.type!
    }))

    return success({ items })
  } catch (err) {
    db.close()
    const message = err instanceof Error ? err.message : String(err)
    return error({
      mind: [{
        code:    "query_error",
        message: `failed to create concepts: ${message}`
      }]
    })
  }
}
