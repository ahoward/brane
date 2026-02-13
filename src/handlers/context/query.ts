//
// query.ts - query context for AI agents
//

import type { Params, Result, Emit } from "../../lib/types.ts"
import { success, error } from "../../lib/result.ts"
import { open_mind, is_mind_error } from "../../lib/mind.ts"
import { generate_embedding } from "../../lib/embed.ts"
import { resolve } from "node:path"
import { existsSync } from "node:fs"
import Database from "bun:sqlite"

type SearchMode = "semantic" | "exact" | "hybrid"

interface QueryParams {
  query?: string
  depth?: number
  limit?: number
  mode?:  SearchMode
}

interface ConceptResult {
  id:        number
  name:      string
  type:      string
  relevance: "exact" | "semantic" | "both" | "neighbor"
  score?:    number
}

interface FileResult {
  url:      string
  concepts: number[]
  preview:  string | null
}

interface EdgeResult {
  source:   number
  target:   number
  relation: string
}

interface GraphResult {
  nodes: number[]
  edges: EdgeResult[]
}

interface ContextResult {
  concepts: ConceptResult[]
  files:    FileResult[]
  graph:    GraphResult
}

const DEFAULT_DEPTH = 1
const DEFAULT_LIMIT = 10
const PREVIEW_LENGTH = 500

export async function handler(params: Params, emit?: Emit): Promise<Result<ContextResult>> {
  const p = (params ?? {}) as QueryParams

  // Validate query
  if (p.query === undefined || p.query === null || p.query === "") {
    return error({
      query: [{
        code:    "required",
        message: "query is required"
      }]
    })
  }

  const depth = Math.min(Math.max(p.depth ?? DEFAULT_DEPTH, 0), 2)
  const limit = Math.min(Math.max(p.limit ?? DEFAULT_LIMIT, 1), 50)

  // Check body.db exists
  const brane_path = resolve(process.cwd(), ".brane")
  const body_db_path = resolve(brane_path, "body.db")

  if (!existsSync(brane_path) || !existsSync(body_db_path)) {
    return error({
      body: [{
        code:    "not_initialized",
        message: "brane not initialized (run brane init)"
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

  const { db: mind_db } = mind

  // Parse mode parameter
  const mode: SearchMode = p.mode ?? "hybrid"
  const valid_modes: SearchMode[] = ["semantic", "exact", "hybrid"]

  if (!valid_modes.includes(mode)) {
    mind_db.close()
    return error({
      mode: [{
        code:    "invalid",
        message: `mode must be one of: ${valid_modes.join(", ")}`
      }]
    })
  }

  // Validate query length for semantic mode
  if (mode === "semantic" && p.query.length < 3) {
    mind_db.close()
    return error({
      query: [{
        code:    "too_short",
        message: "semantic search requires query length >= 3"
      }]
    })
  }

  try {
    // Step 1: Search for anchor concepts based on mode
    let anchor_matches: ConceptResult[] = []

    if (mode === "exact") {
      // Exact only
      const exact = await search_exact(mind_db, p.query, limit)
      anchor_matches = exact.map(m => ({
        id:        m.id,
        name:      m.name,
        type:      m.type,
        relevance: "exact" as const
      }))
    } else if (mode === "semantic") {
      // Semantic only
      const semantic = await search_semantic(mind_db, p.query, limit)
      anchor_matches = semantic.map(m => ({
        id:        m.id,
        name:      m.name,
        type:      m.type,
        relevance: "semantic" as const,
        score:     m.score
      }))
    } else {
      // Hybrid mode (default)
      const exact = await search_exact(mind_db, p.query, limit)

      // Only do semantic search if query is long enough
      if (p.query.length >= 3) {
        const semantic = await search_semantic(mind_db, p.query, limit)
        anchor_matches = merge_results(exact, semantic, limit)
      } else {
        // Short query - exact only
        anchor_matches = exact.map(m => ({
          id:        m.id,
          name:      m.name,
          type:      m.type,
          relevance: "exact" as const
        }))
      }
    }

    // Track all concept IDs we've seen
    const concept_ids = new Set<number>(anchor_matches.map(c => c.id))
    const all_concepts_result: ConceptResult[] = [...anchor_matches]

    // Step 2: Graph expansion
    if (depth >= 1 && anchor_matches.length > 0) {
      const neighbors_1 = await expand_neighbors(mind_db, [...concept_ids])
      for (const neighbor of neighbors_1) {
        if (!concept_ids.has(neighbor.id) && all_concepts_result.length < limit) {
          concept_ids.add(neighbor.id)
          all_concepts_result.push({ ...neighbor, relevance: "neighbor" })
        }
      }
    }

    if (depth >= 2 && all_concepts_result.length > 0) {
      const level1_ids = all_concepts_result
        .filter(c => c.relevance === "neighbor")
        .map(c => c.id)

      if (level1_ids.length > 0) {
        const neighbors_2 = await expand_neighbors(mind_db, level1_ids)
        for (const neighbor of neighbors_2) {
          if (!concept_ids.has(neighbor.id) && all_concepts_result.length < limit) {
            concept_ids.add(neighbor.id)
            all_concepts_result.push({ ...neighbor, relevance: "neighbor" })
          }
        }
      }
    }

    // Step 3: Get provenance links for all concepts
    const file_to_concepts = new Map<string, number[]>()

    for (const concept of all_concepts_result) {
      const prov_result = await mind_db.run(`
        ?[file_url] := *provenance[concept_id, file_url], concept_id = ${concept.id}
      `)
      const prov_rows = prov_result.rows as [string][]

      for (const [file_url] of prov_rows) {
        if (!file_to_concepts.has(file_url)) {
          file_to_concepts.set(file_url, [])
        }
        file_to_concepts.get(file_url)!.push(concept.id)
      }
    }

    // Step 4: Get file previews from body.db FTS
    const body_db = new Database(body_db_path, { readonly: true })
    const files: FileResult[] = []

    for (const [url, concepts] of file_to_concepts) {
      let preview: string | null = null

      try {
        // Try to get content from FTS index
        const fts_result = body_db.query(
          "SELECT content FROM files_fts WHERE url = ?"
        ).get(url) as { content: string } | null

        if (fts_result && fts_result.content) {
          preview = fts_result.content.slice(0, PREVIEW_LENGTH)
          if (fts_result.content.length > PREVIEW_LENGTH) {
            preview += "..."
          }
        }
      } catch {
        // FTS table might not exist or file not indexed
        preview = null
      }

      files.push({ url, concepts, preview })
    }

    body_db.close()

    // Step 5: Build graph structure
    const edges: EdgeResult[] = []
    const node_ids = [...concept_ids]

    // Get edges between concepts in our result set
    if (node_ids.length > 1) {
      for (const id of node_ids) {
        const edge_result = await mind_db.run(`
          ?[source, target, relation] := *edges[_, source, target, relation, _], source = ${id}
        `)
        const edge_rows = edge_result.rows as [number, number, string][]

        for (const [source, target, relation] of edge_rows) {
          if (concept_ids.has(target)) {
            edges.push({ source, target, relation })
          }
        }
      }
    }

    mind_db.close()

    return success({
      concepts: all_concepts_result,
      files:    files,
      graph: {
        nodes: node_ids,
        edges: edges
      }
    })
  } catch (err) {
    mind_db.close()
    const message = err instanceof Error ? err.message : String(err)
    return error({
      query: [{
        code:    "query_error",
        message: `failed to query context: ${message}`
      }]
    })
  }
}

//
// Helper functions
//

interface NeighborConcept {
  id:   number
  name: string
  type: string
}

interface AnchorMatch {
  id:    number
  name:  string
  type:  string
  score?: number
}

//
// Exact search - case-insensitive substring matching
//
async function search_exact(
  db: any,
  query: string,
  limit: number
): Promise<AnchorMatch[]> {
  const query_lower = query.toLowerCase()
  const result = await db.run(`
    ?[id, name, type] := *concepts[id, name, type, _]
  `)

  const all_concepts = result.rows as [number, string, string][]
  const matches: AnchorMatch[] = []

  for (const [id, name, type] of all_concepts) {
    if (name.toLowerCase().includes(query_lower)) {
      matches.push({ id, name, type })
      if (matches.length >= limit) break
    }
  }

  return matches
}

//
// Semantic search - vector similarity via HNSW index
//
async function search_semantic(
  db: any,
  query: string,
  limit: number
): Promise<AnchorMatch[]> {
  // Generate embedding for query
  const query_embedding = await generate_embedding(query)

  if (query_embedding === null) {
    // Graceful degradation - return empty array
    return []
  }

  try {
    const vector_str = JSON.stringify(query_embedding)
    const result = await db.run(`
      ?[id, name, type, distance] := ~concepts:semantic{
        id, name, type |
        query: vec(${vector_str}),
        k: ${limit},
        ef: 50,
        bind_distance: distance
      }
    `)

    const rows = result.rows as [number, string, string, number][]

    // Convert distance to similarity score (cosine distance -> similarity)
    return rows.map(([id, name, type, distance]) => ({
      id,
      name,
      type,
      score: Math.round((1 - distance) * 1000) / 1000
    }))
  } catch {
    // HNSW index may not exist or query failed - graceful degradation
    return []
  }
}

//
// Merge exact and semantic results
//
function merge_results(
  exact: AnchorMatch[],
  semantic: AnchorMatch[],
  limit: number
): ConceptResult[] {
  const results: ConceptResult[] = []
  const seen = new Set<number>()

  // Build a map of semantic results for quick lookup
  const semantic_map = new Map<number, AnchorMatch>()
  for (const m of semantic) {
    semantic_map.set(m.id, m)
  }

  // First pass: exact matches (mark as "both" if also in semantic)
  for (const m of exact) {
    if (results.length >= limit) break

    const sem = semantic_map.get(m.id)
    if (sem) {
      results.push({
        id:        m.id,
        name:      m.name,
        type:      m.type,
        relevance: "both",
        score:     sem.score
      })
    } else {
      results.push({
        id:        m.id,
        name:      m.name,
        type:      m.type,
        relevance: "exact"
      })
    }
    seen.add(m.id)
  }

  // Second pass: semantic-only matches (sorted by score descending)
  const semantic_only = semantic
    .filter(m => !seen.has(m.id))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))

  for (const m of semantic_only) {
    if (results.length >= limit) break

    results.push({
      id:        m.id,
      name:      m.name,
      type:      m.type,
      relevance: "semantic",
      score:     m.score
    })
    seen.add(m.id)
  }

  return results
}

async function expand_neighbors(
  db: any,
  concept_ids: number[]
): Promise<NeighborConcept[]> {
  const neighbors: NeighborConcept[] = []
  const seen = new Set<number>()

  for (const cid of concept_ids) {
    // Outgoing edges (this concept is source)
    const out_result = await db.run(`
      ?[id, name, type] :=
        *edges[_, source, target, _, _],
        source = ${cid},
        *concepts[id, name, type, _],
        id = target
    `)
    for (const [id, name, type] of out_result.rows as [number, string, string][]) {
      if (!seen.has(id)) {
        seen.add(id)
        neighbors.push({ id, name, type })
      }
    }

    // Incoming edges (this concept is target)
    const in_result = await db.run(`
      ?[id, name, type] :=
        *edges[_, source, target, _, _],
        target = ${cid},
        *concepts[id, name, type, _],
        id = source
    `)
    for (const [id, name, type] of in_result.rows as [number, string, string][]) {
      if (!seen.has(id)) {
        seen.add(id)
        neighbors.push({ id, name, type })
      }
    }
  }

  return neighbors
}
