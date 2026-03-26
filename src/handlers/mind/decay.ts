//
// decay.ts - intelligent memory decay
//
// Scores episodes by recency + connections + consolidation bonus,
// then archives or deletes low-scoring ones.
//
// Modes:
//   soft     — archive low-score items (excluded from search)
//   hard     — delete low-score items (cascade-safe: preserves DERIVED_FROM targets)
//   capacity — keep top N by score, archive the rest
//

import type { Params, Result, Emit } from "../../lib/types.ts"
import { success, error } from "../../lib/result.ts"
import { open_mind, is_mind_error, archive_episode } from "../../lib/mind.ts"

type DecayMode = "soft" | "hard" | "capacity"

interface DecayParams {
  agent_id?:              string
  dry_run?:               boolean
  mode?:                  DecayMode
  min_score?:             number   // threshold for soft/hard mode (default 0.1)
  max_episodes?:          number   // for capacity mode (default 1000)
  recency_half_life_days?: number  // default 30
}

interface ScoredEpisode {
  id:        number
  score:     number
  timestamp: string
  observation: string
  protected: boolean  // true if DERIVED_FROM edge exists
}

interface DecayResult {
  scored:   ScoredEpisode[]
  archived: number
  deleted:  number
  protected_count: number
}

const VALID_MODES: DecayMode[] = ["soft", "hard", "capacity"]

export async function handler(params: Params, emit?: Emit): Promise<Result<DecayResult>> {
  const p = (params ?? {}) as DecayParams

  if (!p.agent_id || typeof p.agent_id !== "string" || p.agent_id.trim() === "") {
    return error({
      agent_id: [{
        code:    "required",
        message: "agent_id is required"
      }]
    })
  }

  const dry_run = p.dry_run ?? false
  const mode: DecayMode = p.mode ?? "soft"
  const min_score = p.min_score ?? 0.1
  const max_episodes = p.max_episodes ?? 1000
  const half_life_days = p.recency_half_life_days ?? 30

  if (!VALID_MODES.includes(mode)) {
    return error({
      mode: [{
        code:    "invalid",
        message: `mode must be one of: ${VALID_MODES.join(", ")}`
      }]
    })
  }

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
  const esc = (s: string) => s.replace(/'/g, "''")

  try {
    // Step 1: Fetch all non-archived episodes for this agent
    const ep_result = await db.run(`
      ?[id, timestamp, observation] :=
        *episodes[id, agent_id, timestamp, observation, _, _, _, _, _, archived],
        agent_id = '${esc(p.agent_id)}',
        archived == false
    `)

    const episodes = (ep_result.rows as [number, string, string][]).map(([id, timestamp, observation]) => ({
      id,
      timestamp,
      observation,
    }))

    if (episodes.length === 0) {
      db.close()
      return success({ scored: [], archived: 0, deleted: 0, protected_count: 0 })
    }

    // Step 2: Get DERIVED_FROM targets (protected episodes)
    const derived_result = await db.run(`
      ?[target] := *edges[_, _, target, 'DERIVED_FROM', _, _]
    `)
    const protected_ids = new Set<number>(
      (derived_result.rows as [number][]).map(([target]) => target)
    )

    // Step 3: Get edge counts per episode (bulk query instead of N+1)
    const edge_counts = new Map<number, number>()
    const source_result = await db.run(`?[source, count(id)] := *edges[id, source, _, _, _, _]`)
    for (const [src, cnt] of source_result.rows as [number, number][]) {
      edge_counts.set(src, (edge_counts.get(src) ?? 0) + cnt)
    }
    const target_result = await db.run(`?[target, count(id)] := *edges[id, _, target, _, _, _]`)
    for (const [tgt, cnt] of target_result.rows as [number, number][]) {
      edge_counts.set(tgt, (edge_counts.get(tgt) ?? 0) + cnt)
    }

    // Step 4: Score each episode
    const now = Date.now()
    const half_life_ms = half_life_days * 24 * 60 * 60 * 1000

    const scored: ScoredEpisode[] = episodes.map(ep => {
      const age_ms = now - new Date(ep.timestamp).getTime()

      // Recency: exponential decay with half-life
      // score = 2^(-age/half_life)
      const recency = Math.pow(2, -age_ms / half_life_ms)

      // Connection bonus: 0.1 per connected edge
      const connections = (edge_counts.get(ep.id) ?? 0) * 0.1

      // Consolidation bonus: +0.5 if this episode has been consolidated into a concept
      const consolidation = protected_ids.has(ep.id) ? 0.5 : 0

      const score = Math.round((recency + connections + consolidation) * 1000) / 1000

      return {
        id:          ep.id,
        score,
        timestamp:   ep.timestamp,
        observation: ep.observation,
        protected:   protected_ids.has(ep.id),
      }
    })

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score)

    // Step 5: Determine which episodes to decay
    let to_decay: ScoredEpisode[]

    if (mode === "capacity") {
      // Archive everything beyond max_episodes
      to_decay = scored.slice(max_episodes)
    } else {
      // soft or hard: decay items below min_score
      to_decay = scored.filter(s => s.score < min_score)
    }

    if (dry_run || to_decay.length === 0) {
      db.close()
      return success({
        scored,
        archived: 0,
        deleted: 0,
        protected_count: to_decay.filter(s => s.protected).length,
      })
    }

    // Step 6: Apply decay
    let archived = 0
    let deleted = 0
    let protected_count = 0

    for (const ep of to_decay) {
      if (ep.protected) {
        // Cascade safety: only soft-archive, never delete
        protected_count++
        if (mode !== "hard") {
          await archive_episode(db, ep.id)
          archived++
        }
        continue
      }

      if (mode === "hard") {
        // Hard delete: remove entirely
        await db.run(`
          ?[id, agent_id, timestamp, observation, context, outcome, tags, vector, source_concept_id, archived] :=
            *episodes[id, agent_id, timestamp, observation, context, outcome, tags, vector, source_concept_id, archived],
            id = ${ep.id}
          :rm episodes { id, agent_id, timestamp, observation, context, outcome, tags, vector, source_concept_id, archived }
        `)
        deleted++
      } else {
        await archive_episode(db, ep.id)
        archived++
      }
    }

    db.close()

    return success({
      scored,
      archived,
      deleted,
      protected_count,
    })
  } catch (err) {
    db.close()
    const message = err instanceof Error ? err.message : String(err)
    return error({
      mind: [{
        code:    "query_error",
        message: `failed to run decay: ${message}`
      }]
    })
  }
}
