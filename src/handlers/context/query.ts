//
// query.ts - query context for AI agents
//

import type { Params, Result } from "../../lib/types.ts"
import { success, error } from "../../lib/result.ts"
import { open_mind, is_mind_error } from "../../lib/mind.ts"
import { resolve } from "node:path"
import { existsSync } from "node:fs"
import Database from "bun:sqlite"

interface QueryParams {
  query?: string
  depth?: number
  limit?: number
}

interface ConceptResult {
  id:        number
  name:      string
  type:      string
  relevance: "direct" | "neighbor"
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

export async function handler(params: Params): Promise<Result<ContextResult>> {
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

  try {
    // Step 1: Search concepts by name (case-insensitive via lowercase comparison)
    const query_lower = p.query.toLowerCase()
    const search_result = await mind_db.run(`
      ?[id, name, type] := *concepts[id, name, type, _]
    `)

    const all_concepts = search_result.rows as [number, string, string][]
    const direct_matches: ConceptResult[] = []

    for (const [id, name, type] of all_concepts) {
      if (name.toLowerCase().includes(query_lower)) {
        direct_matches.push({ id, name, type, relevance: "direct" })
        if (direct_matches.length >= limit) break
      }
    }

    // Track all concept IDs we've seen
    const concept_ids = new Set<number>(direct_matches.map(c => c.id))
    const all_concepts_result: ConceptResult[] = [...direct_matches]

    // Step 2: Graph expansion
    if (depth >= 1 && direct_matches.length > 0) {
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
