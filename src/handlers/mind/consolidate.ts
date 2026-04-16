//
// consolidate.ts - distill episodes into semantic knowledge
//
// Groups similar episodes by vector similarity, proposes concept names
// via LLM, creates concepts + CAUSED_BY edges. Append-only: source
// episodes are never mutated or archived (#109).
//

import type { Params, Result, Emit } from "../../lib/types.ts"
import { success, error } from "../../lib/result.ts"
import { open_mind, is_mind_error, get_next_concept_id, get_next_edge_id } from "../../lib/mind.ts"
import { generate_embedding } from "../../lib/embed.ts"
import { name_cluster } from "../../lib/llm.ts"

interface ConsolidateParams {
  agent_id?:  string
  dry_run?:   boolean
  threshold?: number  // similarity threshold 0-1, default 0.85
  min_size?:  number  // minimum cluster size, default 2
}

interface ClusterProposal {
  episode_ids:      number[]
  observations:     string[]
  similarity:       number
  proposed_concept: {
    name: string
    type: string
  }
}

interface DryRunResult {
  clusters: ClusterProposal[]
}

interface ApplyResult {
  clusters:          ClusterProposal[]
  concepts_created:  number
  edges_created:     number
}

export async function handler(params: Params, emit?: Emit): Promise<Result<DryRunResult | ApplyResult>> {
  const p = (params ?? {}) as ConsolidateParams

  // Validate agent_id
  if (!p.agent_id || typeof p.agent_id !== "string" || p.agent_id.trim() === "") {
    return error({
      agent_id: [{
        code:    "required",
        message: "agent_id is required"
      }]
    })
  }

  const dry_run = p.dry_run ?? false
  const threshold = p.threshold ?? 0.85
  const min_size = p.min_size ?? 2

  if (threshold < 0 || threshold > 1) {
    return error({
      threshold: [{
        code:    "invalid",
        message: "threshold must be between 0 and 1"
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
    // Step 1: Fetch all non-archived episodes for this agent
    const esc = (s: string) => s.replace(/'/g, "''")
    const ep_result = await db.run(`
      ?[id, observation, vector] :=
        *episodes[id, agent_id, _, observation, _, _, _, vector, _, archived],
        agent_id = '${esc(p.agent_id)}',
        archived == false,
        is_null(vector) == false
    `)

    const episodes = (ep_result.rows as [number, string, number[]][]).map(([id, observation, vector]) => ({
      id,
      observation,
      vector
    }))

    if (episodes.length < min_size) {
      db.close()
      return success(dry_run
        ? { clusters: [] }
        : { clusters: [], concepts_created: 0, edges_created: 0 }
      )
    }

    // Step 2: Cluster by pairwise cosine similarity
    const clusters = cluster_episodes(episodes, threshold, min_size)

    if (clusters.length === 0) {
      db.close()
      return success(dry_run
        ? { clusters: [] }
        : { clusters: [], concepts_created: 0, edges_created: 0 }
      )
    }

    // Step 3: Name each cluster via LLM
    const proposals: ClusterProposal[] = []
    for (const cluster of clusters) {
      const observations = cluster.episodes.map(e => e.observation)
      const naming = await name_cluster(observations)
      proposals.push({
        episode_ids:      cluster.episodes.map(e => e.id),
        observations,
        similarity:       cluster.avg_similarity,
        proposed_concept: naming,
      })
    }

    // Step 4: If dry_run, return proposals without applying
    if (dry_run) {
      db.close()
      return success({ clusters: proposals })
    }

    // Step 5: Apply — append-only: create concepts + CAUSED_BY edges (#109)
    // Source episodes are NEVER mutated or archived.
    let concepts_created = 0
    let edges_created = 0

    for (const proposal of proposals) {
      // Create concept
      const concept_id = await get_next_concept_id(db)
      const concept_name = proposal.proposed_concept.name
      const concept_type = proposal.proposed_concept.type

      // Generate embedding for concept
      const embedding = await generate_embedding(concept_name)
      const vector_str = embedding !== null ? `vec(${JSON.stringify(embedding)})` : "null"

      await db.run(`
        ?[id, name, type, vector, agent_id] <- [[${concept_id}, '${esc(concept_name)}', '${concept_type}', ${vector_str}, '${esc(p.agent_id)}']]
        :put concepts { id, name, type, vector, agent_id }
      `)
      concepts_created++

      // Create CAUSED_BY edges: new concept was caused by these episodes
      // Episode IDs as targets for traceability (episodes aren't concepts,
      // but the edge records the provenance chain)
      for (const ep_id of proposal.episode_ids) {
        const edge_id = await get_next_edge_id(db)
        await db.run(`
          ?[id, source, target, relation, weight, agent_id] <- [[${edge_id}, ${concept_id}, ${ep_id}, 'CAUSED_BY', 1.0, '${esc(p.agent_id)}']]
          :put edges { id, source, target, relation, weight, agent_id }
        `)
        edges_created++
      }
    }

    db.close()

    return success({
      clusters: proposals,
      concepts_created,
      edges_created,
    })
  } catch (err) {
    db.close()
    const message = err instanceof Error ? err.message : String(err)
    return error({
      mind: [{
        code:    "query_error",
        message: `failed to consolidate: ${message}`
      }]
    })
  }
}

//
// Clustering helpers
//

interface EpisodeVec {
  id:          number
  observation: string
  vector:      number[]
}

interface Cluster {
  episodes:       EpisodeVec[]
  avg_similarity: number
}

function cosine_similarity(a: number[], b: number[]): number {
  let dot = 0, norm_a = 0, norm_b = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    norm_a += a[i] * a[i]
    norm_b += b[i] * b[i]
  }
  const denom = Math.sqrt(norm_a) * Math.sqrt(norm_b)
  return denom === 0 ? 0 : dot / denom
}

//
// Simple greedy clustering: for each un-assigned episode, find all
// episodes within threshold similarity, form a cluster.
//
function cluster_episodes(
  episodes: EpisodeVec[],
  threshold: number,
  min_size: number,
): Cluster[] {
  const assigned = new Set<number>()
  const clusters: Cluster[] = []

  for (let i = 0; i < episodes.length; i++) {
    if (assigned.has(episodes[i].id)) continue

    const cluster_eps: EpisodeVec[] = [episodes[i]]
    const similarities: number[] = []

    for (let j = i + 1; j < episodes.length; j++) {
      if (assigned.has(episodes[j].id)) continue

      const sim = cosine_similarity(episodes[i].vector, episodes[j].vector)
      if (sim >= threshold) {
        cluster_eps.push(episodes[j])
        similarities.push(sim)
      }
    }

    if (cluster_eps.length >= min_size) {
      // Mark all as assigned
      for (const ep of cluster_eps) {
        assigned.add(ep.id)
      }

      const avg_sim = similarities.length > 0
        ? Math.round(similarities.reduce((a, b) => a + b, 0) / similarities.length * 100) / 100
        : 1.0

      clusters.push({
        episodes: cluster_eps,
        avg_similarity: avg_sim,
      })
    }
  }

  return clusters
}
