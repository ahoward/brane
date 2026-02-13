//
// extract.ts - apply extraction patch to mind.db
//

import type { Params, Result, Emit } from "../../lib/types.ts"
import { success, error } from "../../lib/result.ts"
import { open_mind, is_mind_error, is_valid_concept_type, is_valid_edge_relation, get_next_concept_id, get_next_edge_id } from "../../lib/mind.ts"
import { file_exists_in_body } from "../../lib/body.ts"

interface ConceptInput {
  name?: string
  type?: string
}

interface EdgeInput {
  source_name?: string
  target_name?: string
  relation?:    string
  weight?:      number
}

interface ExtractParams {
  file_url?:  string
  concepts?:  ConceptInput[]
  edges?:     EdgeInput[]
}

interface ExtractResult {
  file_url:           string
  concepts_created:   number
  concepts_reused:    number
  edges_created:      number
  provenance_created: number
  concepts_orphaned?: number
}

export async function handler(params: Params, emit?: Emit): Promise<Result<ExtractResult>> {
  const p = (params ?? {}) as ExtractParams

  // Validate file_url
  if (p.file_url === undefined || p.file_url === null || p.file_url === "") {
    return error({
      file_url: [{
        code:    "required",
        message: "file_url is required"
      }]
    })
  }

  // Validate concepts array
  const concepts = p.concepts ?? []
  if (!Array.isArray(concepts)) {
    return error({
      concepts: [{
        code:    "invalid",
        message: "concepts must be an array"
      }]
    })
  }

  // Validate each concept
  for (let i = 0; i < concepts.length; i++) {
    const c = concepts[i]
    if (!c.name || c.name === "") {
      return error({
        concepts: {
          [i]: {
            name: [{
              code:    "required",
              message: "name is required"
            }]
          }
        }
      })
    }
    if (!c.type || c.type === "") {
      return error({
        concepts: {
          [i]: {
            type: [{
              code:    "required",
              message: "type is required"
            }]
          }
        }
      })
    }
    if (!is_valid_concept_type(c.type)) {
      return error({
        concepts: {
          [i]: {
            type: [{
              code:    "invalid",
              message: "type must be one of: Entity, Caveat, Rule"
            }]
          }
        }
      })
    }
  }

  // Validate edges array
  const edges = p.edges ?? []
  if (!Array.isArray(edges)) {
    return error({
      edges: [{
        code:    "invalid",
        message: "edges must be an array"
      }]
    })
  }

  // Validate each edge
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i]
    if (!e.source_name || e.source_name === "") {
      return error({
        edges: {
          [i]: {
            source_name: [{
              code:    "required",
              message: "source_name is required"
            }]
          }
        }
      })
    }
    if (!e.target_name || e.target_name === "") {
      return error({
        edges: {
          [i]: {
            target_name: [{
              code:    "required",
              message: "target_name is required"
            }]
          }
        }
      })
    }
    if (!e.relation || e.relation === "") {
      return error({
        edges: {
          [i]: {
            relation: [{
              code:    "required",
              message: "relation is required"
            }]
          }
        }
      })
    }
    if (!is_valid_edge_relation(e.relation)) {
      return error({
        edges: {
          [i]: {
            relation: [{
              code:    "invalid",
              message: "relation must be one of: DEPENDS_ON, CONFLICTS_WITH, DEFINED_IN"
            }]
          }
        }
      })
    }
  }

  // Check file exists in body.db
  if (!file_exists_in_body(p.file_url)) {
    return error({
      file_url: [{
        code:    "not_found",
        message: "file not found in body.db"
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

  const { db } = mind

  try {
    // Build concept names from patch (for edge validation)
    const concept_names = new Set(concepts.map(c => c.name!))

    // Validate edge references (source_name and target_name must exist in patch or in db)
    for (let i = 0; i < edges.length; i++) {
      const e = edges[i]

      // Check source
      if (!concept_names.has(e.source_name!)) {
        const existing = await find_concept_by_name(db, e.source_name!)
        if (!existing) {
          db.close()
          return error({
            edges: {
              [i]: {
                source_name: [{
                  code:    "not_found",
                  message: `concept '${e.source_name}' not found in patch or mind.db`
                }]
              }
            }
          })
        }
      }

      // Check target
      if (!concept_names.has(e.target_name!)) {
        const existing = await find_concept_by_name(db, e.target_name!)
        if (!existing) {
          db.close()
          return error({
            edges: {
              [i]: {
                target_name: [{
                  code:    "not_found",
                  message: `concept '${e.target_name}' not found in patch or mind.db`
                }]
              }
            }
          })
        }
      }
    }

    // Step 1: Get old provenance links for this file
    const old_concepts = await get_concepts_for_file(db, p.file_url)

    // Step 2: Remove old provenance links
    await db.run(`
      ?[concept_id, file_url] := *provenance[concept_id, file_url], file_url = '${escape_string(p.file_url)}'
      :rm provenance { concept_id, file_url }
    `)

    // Step 3: Create/reuse concepts and build name->id map
    const name_to_id = new Map<string, number>()
    let concepts_created = 0
    let concepts_reused = 0

    // First, load existing concept mappings
    for (const name of concept_names) {
      const existing = await find_concept_by_name(db, name!)
      if (existing) {
        name_to_id.set(name!, existing)
        concepts_reused++
      }
    }

    // Create new concepts (with null vector - embedding generated separately)
    for (const c of concepts) {
      if (!name_to_id.has(c.name!)) {
        const id = await get_next_concept_id(db)
        await db.run(`
          ?[id, name, type, vector] <- [[${id}, '${escape_string(c.name!)}', '${c.type}', null]]
          :put concepts { id, name, type, vector }
        `)
        name_to_id.set(c.name!, id)
        concepts_created++
      }
    }

    // Step 4: Create provenance links for all concepts in patch
    let provenance_created = 0
    for (const c of concepts) {
      const id = name_to_id.get(c.name!)!
      await db.run(`
        ?[concept_id, file_url] <- [[${id}, '${escape_string(p.file_url)}']]
        :put provenance { concept_id, file_url }
      `)
      provenance_created++
    }

    // Step 5: Create edges
    let edges_created = 0
    for (const e of edges) {
      // Resolve source
      let source_id = name_to_id.get(e.source_name!)
      if (source_id === undefined) {
        source_id = await find_concept_by_name(db, e.source_name!)
      }

      // Resolve target
      let target_id = name_to_id.get(e.target_name!)
      if (target_id === undefined) {
        target_id = await find_concept_by_name(db, e.target_name!)
      }

      const weight = e.weight ?? 1.0
      const edge_id = await get_next_edge_id(db)

      await db.run(`
        ?[id, source, target, relation, weight] <- [[${edge_id}, ${source_id}, ${target_id}, '${e.relation}', ${weight}]]
        :put edges { id, source, target, relation, weight }
      `)
      edges_created++
    }

    // Step 6: Find and remove orphan concepts (no remaining provenance, not Caveats)
    let concepts_orphaned = 0

    for (const old_id of old_concepts) {
      // Skip if concept is now linked via new extraction
      const new_ids = [...name_to_id.values()]
      if (new_ids.includes(old_id)) {
        continue
      }

      // Check if concept has any remaining provenance
      const has_provenance = await concept_has_provenance(db, old_id)
      if (has_provenance) {
        continue
      }

      // Check if concept is a Caveat (never auto-delete)
      const is_caveat = await is_concept_caveat(db, old_id)
      if (is_caveat) {
        continue
      }

      // Remove edges where this concept is source
      const source_edges = await db.run(`
        ?[id, source, target, relation, weight] := *edges[id, source, target, relation, weight], source = ${old_id}
      `)
      for (const edge of source_edges.rows as [number, number, number, string, number][]) {
        const [id, source, target, relation, weight] = edge
        await db.run(`
          ?[id, source, target, relation, weight] <- [[${id}, ${source}, ${target}, '${relation}', ${weight}]]
          :rm edges { id, source, target, relation, weight }
        `)
      }

      // Remove edges where this concept is target
      const target_edges = await db.run(`
        ?[id, source, target, relation, weight] := *edges[id, source, target, relation, weight], target = ${old_id}
      `)
      for (const edge of target_edges.rows as [number, number, number, string, number][]) {
        const [id, source, target, relation, weight] = edge
        await db.run(`
          ?[id, source, target, relation, weight] <- [[${id}, ${source}, ${target}, '${relation}', ${weight}]]
          :rm edges { id, source, target, relation, weight }
        `)
      }

      // Get concept data for deletion (including vector)
      const concept_data = await db.run(`
        ?[id, name, type, vector] := *concepts[id, name, type, vector], id = ${old_id}
      `)
      const concept_rows = concept_data.rows as any[][]
      if (concept_rows.length > 0) {
        const [id, name, type, vector] = concept_rows[0]
        const vector_str = vector !== null ? JSON.stringify(vector) : "null"
        await db.run(`
          ?[id, name, type, vector] <- [[${id}, '${escape_string(name)}', '${type}', ${vector_str}]]
          :rm concepts { id, name, type, vector }
        `)
      }

      concepts_orphaned++
    }

    db.close()

    const result: ExtractResult = {
      file_url:           p.file_url,
      concepts_created:   concepts_created,
      concepts_reused:    concepts_reused,
      edges_created:      edges_created,
      provenance_created: provenance_created
    }

    if (concepts_orphaned > 0) {
      result.concepts_orphaned = concepts_orphaned
    }

    return success(result)
  } catch (err) {
    db.close()
    const message = err instanceof Error ? err.message : String(err)
    return error({
      mind: [{
        code:    "query_error",
        message: `failed to apply extraction: ${message}`
      }]
    })
  }
}

//
// Helper functions
//

function escape_string(s: string): string {
  return s.replace(/'/g, "''")
}

async function find_concept_by_name(db: any, name: string): Promise<number | null> {
  const result = await db.run(`
    ?[id] := *concepts[id, name, _, _], name = '${escape_string(name)}'
  `)
  const rows = result.rows as number[][]
  if (rows.length > 0) {
    return rows[0][0]
  }
  return null
}

async function get_concepts_for_file(db: any, file_url: string): Promise<number[]> {
  const result = await db.run(`
    ?[concept_id] := *provenance[concept_id, file_url], file_url = '${escape_string(file_url)}'
  `)
  const rows = result.rows as number[][]
  return rows.map(r => r[0])
}

async function concept_has_provenance(db: any, concept_id: number): Promise<boolean> {
  const result = await db.run(`
    ?[file_url] := *provenance[concept_id, file_url], concept_id = ${concept_id}
  `)
  const rows = result.rows as string[][]
  return rows.length > 0
}

async function is_concept_caveat(db: any, concept_id: number): Promise<boolean> {
  const result = await db.run(`
    ?[type] := *concepts[id, _, type, _], id = ${concept_id}
  `)
  const rows = result.rows as string[][]
  if (rows.length > 0) {
    return rows[0][0] === "Caveat"
  }
  return false
}
