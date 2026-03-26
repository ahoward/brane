//
// create.ts - create a new episode (agent experience record)
//

import type { Params, Result, Emit } from "../../../lib/types.ts"
import { success, error } from "../../../lib/result.ts"
import { open_mind, is_mind_error, get_next_episode_id, concept_exists } from "../../../lib/mind.ts"
import { generate_embedding } from "../../../lib/embed.ts"

interface CreateParams {
  agent_id?:          string
  observation?:       string
  context?:           string
  outcome?:           string
  tags?:              string[]
  source_concept_id?: number
}

interface Episode {
  id:                number
  agent_id:          string
  timestamp:         string
  observation:       string
  context:           string
  outcome:           string
  tags:              string[]
  source_concept_id: number
}

export async function handler(params: Params, emit?: Emit): Promise<Result<Episode>> {
  const p = (params ?? {}) as CreateParams

  // Validate required fields
  if (!p.observation || typeof p.observation !== "string" || p.observation.trim() === "") {
    return error({
      observation: [{
        code:    "required",
        message: "observation is required"
      }]
    })
  }

  if (!p.agent_id || typeof p.agent_id !== "string" || p.agent_id.trim() === "") {
    return error({
      agent_id: [{
        code:    "required",
        message: "agent_id is required"
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
    // Validate optional string fields are actually strings
    if (p.context !== undefined && typeof p.context !== "string") {
      db.close()
      return error({
        context: [{ code: "invalid", message: "context must be a string" }]
      })
    }
    if (p.outcome !== undefined && typeof p.outcome !== "string") {
      db.close()
      return error({
        outcome: [{ code: "invalid", message: "outcome must be a string" }]
      })
    }

    // Validate source_concept_id if provided
    const source_id = typeof p.source_concept_id === "number" && Number.isInteger(p.source_concept_id) ? p.source_concept_id : 0
    if (source_id !== 0) {
      const exists = await concept_exists(db, source_id)
      if (!exists) {
        db.close()
        return error({
          source_concept_id: [{
            code:    "not_found",
            message: "concept not found"
          }]
        })
      }
    }

    // Validate tags if provided
    const tags = p.tags ?? []
    if (!Array.isArray(tags) || tags.some(t => typeof t !== "string" || t.trim() === "")) {
      db.close()
      return error({
        tags: [{
          code:    "invalid",
          message: "tags must be an array of non-empty strings"
        }]
      })
    }

    // Generate ID and timestamp
    const id = await get_next_episode_id(db)
    const timestamp = new Date().toISOString()
    const context = p.context ?? ""
    const outcome = p.outcome ?? ""
    const tags_json = JSON.stringify(tags)

    // Generate embedding from observation
    const embedding = await generate_embedding(p.observation)

    // Build vector clause
    const vector_str = embedding ? `vec(${JSON.stringify(embedding)})` : "null"

    // Escape single quotes for CozoDB
    const esc = (s: string) => s.replace(/'/g, "''")

    // Store episode
    await db.run(`
      ?[id, agent_id, timestamp, observation, context, outcome, tags, vector, source_concept_id] <- [[
        ${id},
        '${esc(p.agent_id)}',
        '${esc(timestamp)}',
        '${esc(p.observation)}',
        '${esc(context)}',
        '${esc(outcome)}',
        '${esc(tags_json)}',
        ${vector_str},
        ${source_id}
      ]]
      :put episodes {
        id, agent_id, timestamp, observation, context, outcome, tags, vector, source_concept_id
      }
    `)

    db.close()

    return success({
      id,
      agent_id:          p.agent_id,
      timestamp,
      observation:       p.observation,
      context,
      outcome,
      tags,
      source_concept_id: source_id,
    })
  } catch (err) {
    db.close()
    const message = err instanceof Error ? err.message : String(err)
    return error({
      mind: [{
        code:    "query_error",
        message: `failed to create episode: ${message}`
      }]
    })
  }
}
