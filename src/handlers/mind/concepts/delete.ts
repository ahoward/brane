//
// delete.ts - delete a concept
//

import type { Params, Result, Emit } from "../../../lib/types.ts"
import { success, error } from "../../../lib/result.ts"
import { open_mind, is_mind_error } from "../../../lib/mind.ts"

interface DeleteParams {
  id?: number
}

interface DeleteResult {
  deleted: boolean
  cascade: {
    edges_removed: number
    annotations_removed: number
    provenance_removed: number
  }
}

export async function handler(params: Params, emit?: Emit): Promise<Result<DeleteResult>> {
  const p = (params ?? {}) as DeleteParams

  // Validate id
  if (p.id === undefined || p.id === null) {
    return error({
      id: [{
        code:    "required",
        message: "id is required"
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
    // First check if concept exists
    const existing = await db.run(`
      ?[id, name, type] := *concepts[id, name, type, _, _], id = ${p.id}
    `)

    const rows = existing.rows as (number | string)[][]

    if (rows.length === 0) {
      db.close()
      return error({
        id: [{
          code:    "not_found",
          message: "concept not found"
        }]
      })
    }

    // Cascade: remove edges where this concept is source or target
    let edges_removed = 0
    try {
      const edge_count = await db.run(`?[count(id)] := *edges[id, source, target, _, _, _], source = ${p.id} or target = ${p.id}`)
      edges_removed = (edge_count.rows[0]?.[0] as number) ?? 0
      if (edges_removed > 0) {
        await db.run(`
          ?[id, source, target, relation, weight, agent_id] := *edges[id, source, target, relation, weight, agent_id], source = ${p.id} or target = ${p.id}
          :rm edges { id, source, target, relation, weight, agent_id }
        `)
      }
    } catch { /* edges relation may not exist */ }

    // Cascade: remove annotations targeting this concept
    let annotations_removed = 0
    try {
      const ann_count = await db.run(`?[count(id)] := *annotations[id, target, _, _, _, _], target = ${p.id}`)
      annotations_removed = (ann_count.rows[0]?.[0] as number) ?? 0
      if (annotations_removed > 0) {
        await db.run(`
          ?[id, target, text, type, authority, created_at] := *annotations[id, target, text, type, authority, created_at], target = ${p.id}
          :rm annotations { id, target, text, type, authority, created_at }
        `)
      }
    } catch { /* annotations relation may not exist */ }

    // Cascade: remove provenance links for this concept
    let provenance_removed = 0
    try {
      const prov_count = await db.run(`?[count(concept_id)] := *provenance[concept_id, file_url], concept_id = ${p.id}`)
      provenance_removed = (prov_count.rows[0]?.[0] as number) ?? 0
      if (provenance_removed > 0) {
        await db.run(`
          ?[concept_id, file_url] := *provenance[concept_id, file_url], concept_id = ${p.id}
          :rm provenance { concept_id, file_url }
        `)
      }
    } catch { /* provenance relation may not exist */ }

    // Delete the concept itself
    await db.run(`
      ?[id, name, type, vector, agent_id] := *concepts[id, name, type, vector, agent_id], id = ${p.id}
      :rm concepts { id, name, type, vector, agent_id }
    `)

    db.close()

    return success({
      deleted: true,
      cascade: {
        edges_removed,
        annotations_removed,
        provenance_removed,
      },
    })
  } catch (err) {
    db.close()
    const message = err instanceof Error ? err.message : String(err)
    return error({
      mind: [{
        code:    "query_error",
        message: `failed to delete concept: ${message}`
      }]
    })
  }
}
