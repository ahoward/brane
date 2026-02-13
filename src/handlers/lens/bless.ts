//
// bless.ts - promote a detected type or relation to golden status
//

import type { Params, Result, Emit } from "../../lib/types.ts"
import { success, error } from "../../lib/result.ts"
import { open_mind, is_mind_error } from "../../lib/lens.ts"

interface BlessResult {
  blessed:     "type" | "relation"
  name:        string
  description: string
  symmetric?:  boolean
}

export async function handler(params: Params, emit?: Emit): Promise<Result<BlessResult>> {
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

  // Validate params
  const type_name = params.type as string | undefined
  const rel_name = params.relation as string | undefined
  const description = params.description as string | undefined
  const symmetric = params.symmetric === true

  // Must have exactly one of type or relation
  if (!type_name && !rel_name) {
    db.close()
    return error({
      params: [{
        code:    "invalid",
        message: "must specify either type or relation"
      }]
    })
  }

  // Description is required
  if (!description) {
    db.close()
    return error({
      description: [{
        code:    "required",
        message: "description is required"
      }]
    })
  }

  try {
    if (type_name) {
      // Bless a type
      const escaped_type = type_name.replace(/'/g, "''")
      const escaped_desc = description.replace(/'/g, "''")

      await db.run(`
        ?[type, description, authority] <- [['${escaped_type}', '${escaped_desc}', 'manual']]
        :put golden_types { type => description, authority }
      `)

      // Update usage tracking to mark as golden (if exists)
      const usage = await db.run(`
        ?[count, first_seen, last_seen] := *type_usage['${escaped_type}', count, first_seen, last_seen, _]
      `)
      const rows = usage.rows as [number, string, string][]
      if (rows.length > 0) {
        const [count, first_seen, last_seen] = rows[0]
        await db.run(`
          ?[type, count, first_seen, last_seen, golden] <- [['${escaped_type}', ${count}, '${first_seen}', '${last_seen}', true]]
          :put type_usage { type => count, first_seen, last_seen, golden }
        `)
      }

      db.close()
      return success({
        blessed:     "type",
        name:        type_name,
        description: description
      })
    } else {
      // Bless a relation
      const escaped_rel = rel_name!.replace(/'/g, "''")
      const escaped_desc = description.replace(/'/g, "''")

      await db.run(`
        ?[rel, description, symmetric, authority] <- [['${escaped_rel}', '${escaped_desc}', ${symmetric}, 'manual']]
        :put golden_relations { rel => description, symmetric, authority }
      `)

      // Update usage tracking to mark as golden (if exists)
      const usage = await db.run(`
        ?[count, first_seen, last_seen] := *relation_usage['${escaped_rel}', count, first_seen, last_seen, _]
      `)
      const rows = usage.rows as [number, string, string][]
      if (rows.length > 0) {
        const [count, first_seen, last_seen] = rows[0]
        await db.run(`
          ?[rel, count, first_seen, last_seen, golden] <- [['${escaped_rel}', ${count}, '${first_seen}', '${last_seen}', true]]
          :put relation_usage { rel => count, first_seen, last_seen, golden }
        `)
      }

      db.close()
      return success({
        blessed:     "relation",
        name:        rel_name!,
        description: description,
        symmetric:   symmetric
      })
    }
  } catch (err) {
    db.close()
    const message = err instanceof Error ? err.message : String(err)
    return error({
      lens: [{
        code:    "query_error",
        message: `failed to bless: ${message}`
      }]
    })
  }
}
