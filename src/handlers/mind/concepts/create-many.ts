//
// create-many.ts - batch create concepts
//

import type { Params, Result, Emit } from "../../../lib/types.ts"
import { success, error } from "../../../lib/result.ts"
import { open_mind, is_mind_error, is_valid_concept_type } from "../../../lib/mind.ts"
import { generate_embeddings } from "../../../lib/embed.ts"
import { update_type_usage } from "../../../lib/lens.ts"
import { find_fuzzy_match, find_fuzzy_match_in_batch } from "../../../lib/dedup.ts"

interface ItemParams {
  name?: string
  type?: string
}

interface CreateManyParams {
  items?: ItemParams[]
  fuzzy_dedup?: boolean  // default true
}

interface Concept {
  id:   number
  name: string
  type: string
}

export async function handler(params: Params, emit?: Emit): Promise<Result<{ items: Concept[] }>> {
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
    const fuzzy = p.fuzzy_dedup !== false  // default true
    // Each result entry: { name, type, create_index } where create_index >= 0 means "to be created"
    // or { name, type, id } where id > 0 means "matched existing"
    const results: Concept[] = []
    const to_create: Array<{ name: string; type: string }> = []
    // Track names we've already decided to create (for within-batch dedup)
    // Uses index into to_create as provisional ID (resolved after DB insert)
    const pending: Array<{ id: number; name: string; type: string }> = []

    if (fuzzy) {
      for (const item of p.items) {
        // Check DB first
        const db_match = await find_fuzzy_match(db, item.name!)
        if (db_match) {
          results.push({ id: db_match.id, name: db_match.name, type: db_match.type })
          continue
        }

        // Check within this batch (items we've already decided to create)
        const batch_match = find_fuzzy_match_in_batch(item.name!, pending)
        if (batch_match) {
          // Point to the same pending item — will resolve to same ID
          results.push({ id: batch_match.id, name: batch_match.name, type: batch_match.type })
          continue
        }

        // No match — will create. Use negative provisional ID = -(to_create index + 1)
        const prov_id = -(to_create.length + 1)
        to_create.push({ name: item.name!, type: item.type! })
        pending.push({ id: prov_id, name: item.name!, type: item.type! })
        results.push({ id: prov_id, name: item.name!, type: item.type! })
      }
    } else {
      for (const item of p.items) {
        const prov_id = -(to_create.length + 1)
        to_create.push({ name: item.name!, type: item.type! })
        results.push({ id: prov_id, name: item.name!, type: item.type! })
      }
    }

    // Create the new concepts in batch
    if (to_create.length > 0) {
      // Reserve ID range
      const counter_result = await db.run(`
        ?[value] := *schema_meta['concept_next_id', value]
      `)
      const counter_rows = counter_result.rows as string[][]
      let start_id = 1
      if (counter_rows.length > 0) {
        start_id = parseInt(counter_rows[0][0], 10)
      }
      const end_id = start_id + to_create.length

      // Update counter
      await db.run(`
        ?[key, value] <- [['concept_next_id', '${end_id}']]
        :put schema_meta { key => value }
      `)

      // Batch generate embeddings
      const names = to_create.map(item => item.name)
      const embeddings = await generate_embeddings(names)

      // Build single :put
      const rows = to_create.map((item, i) => {
        const id = start_id + i
        const escaped_name = item.name.replace(/'/g, "''")
        const vector_str = embeddings[i] !== null ? `vec(${JSON.stringify(embeddings[i])})` : "null"
        return `[${id}, '${escaped_name}', '${item.type}', ${vector_str}]`
      })

      await db.run(`
        ?[id, name, type, vector] <- [${rows.join(", ")}]
        :put concepts { id, name, type, vector }
      `)

      // Build provisional → real ID map
      const id_map = new Map<number, number>()
      for (let i = 0; i < to_create.length; i++) {
        id_map.set(-(i + 1), start_id + i)
      }

      // Resolve provisional IDs in results
      for (let i = 0; i < results.length; i++) {
        if (results[i].id < 0) {
          results[i].id = id_map.get(results[i].id) ?? results[i].id
        }
      }
    }

    // Track type usage (deduplicated)
    const unique_types = [...new Set(to_create.map(item => item.type))]
    for (const type of unique_types) {
      try {
        await update_type_usage(db, type)
      } catch {
        // Silent tracking failure is acceptable
      }
    }

    db.close()

    return success({ items: results })
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
