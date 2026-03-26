//
// create.ts - create a new concept
//

import type { Params, Result, Emit } from "../../../lib/types.ts"
import { success, error } from "../../../lib/result.ts"
import { open_mind, is_mind_error, is_valid_concept_type, get_next_concept_id, record_entity_timestamp } from "../../../lib/mind.ts"
import { generate_embedding } from "../../../lib/embed.ts"
import { update_type_usage } from "../../../lib/lens.ts"
import { find_fuzzy_match } from "../../../lib/dedup.ts"

interface CreateParams {
  name?: string
  type?: string
  agent_id?: string
  fuzzy_dedup?: boolean  // default true
}

interface Concept {
  id:              number
  name:            string
  type:            string
  agent_id:        string | null
  matched_existing?: boolean
  match_type?:     string
}

export async function handler(params: Params, emit?: Emit): Promise<Result<Concept>> {
  const p = (params ?? {}) as CreateParams

  // Validate name
  if (p.name === undefined || p.name === null || p.name === "") {
    return error({
      name: [{
        code:    "required",
        message: "name is required"
      }]
    })
  }

  // Validate type
  if (p.type === undefined || p.type === null || p.type === "") {
    return error({
      type: [{
        code:    "required",
        message: "type is required"
      }]
    })
  }

  if (!is_valid_concept_type(p.type)) {
    return error({
      type: [{
        code:    "invalid",
        message: "type must be a non-empty string"
      }]
    })
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
    // Fuzzy dedup: check for existing concept with similar name
    const fuzzy = p.fuzzy_dedup !== false  // default true
    if (fuzzy) {
      const match = await find_fuzzy_match(db, p.name)
      if (match) {
        db.close()
        return success({
          id:               match.id,
          name:             match.name,
          type:             match.type,
          agent_id:         null,  // existing match — don't know agent
          matched_existing: true,
          match_type:       match.match_type,
        })
      }
    }

    // Get next ID
    const id = await get_next_concept_id(db)

    // Resolve agent_id (empty string = unattributed)
    const agent_id = (typeof p.agent_id === "string" && p.agent_id.length > 0) ? p.agent_id : ""

    // Generate embedding for concept name (graceful degradation - null if fails)
    const embedding = await generate_embedding(p.name)
    const vector_str = embedding !== null ? `vec(${JSON.stringify(embedding)})` : "null"

    // Insert concept with vector and agent_id
    await db.run(`
      ?[id, name, type, vector, agent_id] <- [[${id}, '${p.name.replace(/'/g, "''")}', '${p.type}', ${vector_str}, '${agent_id.replace(/'/g, "''")}']]
      :put concepts { id, name, type, vector, agent_id }
    `)

    // Record creation timestamp
    await record_entity_timestamp(db, "concept", id)

    // Track type usage silently (don't fail on tracking errors)
    try {
      await update_type_usage(db, p.type)
    } catch {
      // Silent tracking failure is acceptable
    }

    db.close()

    return success({
      id:       id,
      name:     p.name,
      type:     p.type,
      agent_id: agent_id || null,
    })
  } catch (err) {
    db.close()
    const message = err instanceof Error ? err.message : String(err)
    return error({
      mind: [{
        code:    "query_error",
        message: `failed to create concept: ${message}`
      }]
    })
  }
}
