//
// summary.ts - Graph summary statistics
//

import type { Params, Result, Emit } from "../../lib/types.ts"
import { success, error } from "../../lib/result.ts"
import { open_mind, is_mind_error } from "../../lib/mind.ts"

interface SummaryResult {
  concepts: {
    total: number
    by_type: Record<string, number>
  }
  edges: {
    total: number
    by_relation: Record<string, number>
  }
}

export async function handler(_params: Params, _emit?: Emit): Promise<Result<SummaryResult>> {
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

  try {
    // Query concept count
    const concept_count_result = await db.run(`
      ?[count(id)] := *concepts[id, _, _, _]
    `)
    const concept_total = (concept_count_result.rows[0]?.[0] as number) ?? 0

    // Query concepts by type
    const concepts_by_type_result = await db.run(`
      ?[type, count(id)] := *concepts[id, _, type, _]
    `)
    const by_type: Record<string, number> = {}
    for (const row of concepts_by_type_result.rows as [string, number][]) {
      by_type[row[0]] = row[1]
    }

    // Query edge count
    const edge_count_result = await db.run(`
      ?[count(id)] := *edges[id, _, _, _, _]
    `)
    const edge_total = (edge_count_result.rows[0]?.[0] as number) ?? 0

    // Query edges by relation
    const edges_by_relation_result = await db.run(`
      ?[relation, count(id)] := *edges[id, _, _, relation, _]
    `)
    const by_relation: Record<string, number> = {}
    for (const row of edges_by_relation_result.rows as [string, number][]) {
      by_relation[row[0]] = row[1]
    }

    db.close()

    return success({
      concepts: {
        total: concept_total,
        by_type
      },
      edges: {
        total: edge_total,
        by_relation
      }
    })
  } catch (err) {
    db.close()
    const message = err instanceof Error ? err.message : String(err)
    return error({
      mind: [{
        code:    "query_error",
        message: `failed to get graph summary: ${message}`
      }]
    })
  }
}
