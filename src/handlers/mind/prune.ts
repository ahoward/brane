//
// prune.ts - remove orphaned concepts, dangling edges, and stale provenance
//

import type { Params, Result, Emit } from "../../lib/types.ts"
import { success, error } from "../../lib/result.ts"
import { open_mind, is_mind_error } from "../../lib/mind.ts"
import { resolve_lens_paths } from "../../lib/state.ts"
import { existsSync } from "node:fs"
import Database from "bun:sqlite"

interface PruneParams {
  dry_run?: boolean
}

interface PruneDetail {
  concepts:   { id: number; name: string; type: string }[]
  edges:      { id: number; source: number; target: number; relation: string }[]
  provenance: { concept_id: number; file_url: string }[]
}

interface PruneResult {
  concepts_removed:   number
  edges_removed:      number
  provenance_removed: number
  details:            PruneDetail
}

export async function handler(params: Params, emit?: Emit): Promise<Result<PruneResult>> {
  const p = (params ?? {}) as PruneParams
  const dry_run = p.dry_run ?? false

  const paths = resolve_lens_paths()

  if (!existsSync(paths.brane_path)) {
    return error({
      brane: [{
        code:    "not_initialized",
        message: "brane not initialized (run brane init)"
      }]
    })
  }

  // Step 1: Get valid file_urls from body.db
  // SAFETY: If body.db is missing, abort — treating empty as "all files deleted" would wipe everything
  if (!existsSync(paths.body_db_path)) {
    return error({
      body: [{
        code:    "not_found",
        message: "body.db not found — cannot determine valid files (run brane init)"
      }]
    })
  }

  const valid_urls = new Set<string>()
  const body_db = new Database(paths.body_db_path, { readonly: true })
  try {
    const rows = body_db.query("SELECT url FROM files").all() as { url: string }[]
    for (const row of rows) {
      valid_urls.add(row.url)
    }
  } finally {
    body_db.close()
  }

  // Step 2: Open mind.db
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
    // Step 3: Get all provenance records
    const prov_result = await db.run(`
      ?[concept_id, file_url] := *provenance[concept_id, file_url]
    `)
    const all_provenance = (prov_result.rows as [number, string][]).map(r => ({
      concept_id: r[0],
      file_url:   r[1]
    }))

    // Step 4: Find stale provenance (file_url not in body.db)
    const stale_provenance = all_provenance.filter(p => !valid_urls.has(p.file_url))

    if (stale_provenance.length === 0) {
      db.close()
      return success({
        concepts_removed:   0,
        edges_removed:      0,
        provenance_removed: 0,
        details: { concepts: [], edges: [], provenance: [] }
      })
    }

    // Step 5: Find orphan concepts — all provenance is stale
    // Group provenance by concept_id
    const concept_prov = new Map<number, { total: number; stale: number }>()
    for (const p of all_provenance) {
      const entry = concept_prov.get(p.concept_id) ?? { total: 0, stale: 0 }
      entry.total++
      concept_prov.set(p.concept_id, entry)
    }
    for (const p of stale_provenance) {
      const entry = concept_prov.get(p.concept_id)!
      entry.stale++
    }

    const orphan_ids = new Set<number>()
    for (const [concept_id, counts] of concept_prov) {
      if (counts.stale === counts.total) {
        orphan_ids.add(concept_id)
      }
    }

    // Step 6: Get details of orphan concepts
    const orphan_concepts: { id: number; name: string; type: string }[] = []
    if (orphan_ids.size > 0) {
      const ids_list = [...orphan_ids].map(id => `[${id}]`).join(", ")
      const concept_result = await db.run(`
        ?[id, name, type] := *concepts[id, name, type, _], id in [${[...orphan_ids].join(", ")}]
      `)
      for (const row of concept_result.rows as [number, string, string][]) {
        orphan_concepts.push({ id: row[0], name: row[1], type: row[2] })
      }
    }

    // Step 7: Find dangling edges (source or target is an orphan)
    const dangling_edges: { id: number; source: number; target: number; relation: string }[] = []
    if (orphan_ids.size > 0) {
      const edges_result = await db.run(`
        ?[id, source, target, relation] := *edges[id, source, target, relation, _]
      `)
      for (const row of edges_result.rows as [number, number, number, string][]) {
        if (orphan_ids.has(row[1]) || orphan_ids.has(row[2])) {
          dangling_edges.push({ id: row[0], source: row[1], target: row[2], relation: row[3] })
        }
      }
    }

    // Step 8: Delete (unless dry_run)
    if (!dry_run) {
      // Delete edges
      if (dangling_edges.length > 0) {
        const edge_data = dangling_edges.map(e => `[${e.id}, ${e.source}, ${e.target}, '${e.relation.replace(/'/g, "''")}', 1.0]`).join(", ")
        await db.run(`
          ?[id, source, target, relation, weight] <- [${edge_data}]
          :rm edges { id, source, target, relation, weight }
        `)
      }

      // Delete stale provenance
      if (stale_provenance.length > 0) {
        const prov_data = stale_provenance.map(p => `[${p.concept_id}, '${p.file_url.replace(/'/g, "''")}']`).join(", ")
        await db.run(`
          ?[concept_id, file_url] <- [${prov_data}]
          :rm provenance { concept_id, file_url }
        `)
      }

      // Delete orphan concepts (batch: look up full rows by id, then remove)
      if (orphan_ids.size > 0) {
        const id_list = [...orphan_ids].join(", ")
        await db.run(`
          ?[id, name, type, vector] := *concepts[id, name, type, vector], id in [${id_list}]
          :rm concepts { id, name, type, vector }
        `)
      }
    }

    db.close()

    return success({
      concepts_removed:   orphan_concepts.length,
      edges_removed:      dangling_edges.length,
      provenance_removed: stale_provenance.length,
      details: {
        concepts:   orphan_concepts,
        edges:      dangling_edges,
        provenance: stale_provenance
      }
    })
  } catch (err) {
    db.close()
    const message = err instanceof Error ? err.message : String(err)
    return error({
      mind: [{
        code:    "query_error",
        message: `failed to prune: ${message}`
      }]
    })
  }
}
