//
// lens.ts - shared utilities for lens operations
//

import { CozoDb } from "./cozo"
import { open_mind, is_mind_error, type MindDb, type MindError } from "./mind"

// Re-export mind utilities for convenience
export { open_mind, is_mind_error, type MindDb, type MindError }

//
// TypeScript interfaces (POD)
//

export interface LensConfig {
  name:          string
  version:       string
  description:   string | null
  concepts:      GoldenType[]
  relations:     GoldenRelation[]
  consolidation: Record<string, string>
}

export interface GoldenType {
  type:        string
  description: string
  authority:   "lens" | "manual"
}

export interface GoldenRelation {
  rel:         string
  description: string
  symmetric:   boolean
  authority:   "lens" | "manual"
}

export interface TypeUsage {
  type:       string
  count:      number
  first_seen: string
  last_seen:  string
  golden:     boolean
}

export interface RelationUsage {
  rel:        string
  count:      number
  first_seen: string
  last_seen:  string
  golden:     boolean
}

export interface LensStats {
  types:     TypeUsage[]
  relations: RelationUsage[]
}

//
// Check if a type is golden
//

export async function is_golden_type(db: CozoDb, type: string): Promise<boolean> {
  try {
    const result = await db.run(`
      ?[type] := *golden_types[type, _, _], type = '${type.replace(/'/g, "''")}'
    `)
    const rows = result.rows as string[][]
    return rows.length > 0
  } catch {
    return false
  }
}

//
// Check if a relation is golden
//

export async function is_golden_relation(db: CozoDb, rel: string): Promise<boolean> {
  try {
    const result = await db.run(`
      ?[rel] := *golden_relations[rel, _, _, _], rel = '${rel.replace(/'/g, "''")}'
    `)
    const rows = result.rows as string[][]
    return rows.length > 0
  } catch {
    return false
  }
}

//
// Update type usage (upsert with increment)
//

export async function update_type_usage(db: CozoDb, type: string): Promise<void> {
  const now = new Date().toISOString()
  const golden = await is_golden_type(db, type)
  const escaped_type = type.replace(/'/g, "''")

  // Try to get existing usage
  const result = await db.run(`
    ?[count, first_seen] := *type_usage['${escaped_type}', count, first_seen, _, _]
  `)
  const rows = result.rows as [number, string][]

  if (rows.length > 0) {
    // Update existing
    const [old_count, first_seen] = rows[0]
    await db.run(`
      ?[type, count, first_seen, last_seen, golden] <- [['${escaped_type}', ${old_count + 1}, '${first_seen}', '${now}', ${golden}]]
      :put type_usage { type => count, first_seen, last_seen, golden }
    `)
  } else {
    // Insert new
    await db.run(`
      ?[type, count, first_seen, last_seen, golden] <- [['${escaped_type}', 1, '${now}', '${now}', ${golden}]]
      :put type_usage { type => count, first_seen, last_seen, golden }
    `)
  }
}

//
// Update relation usage (upsert with increment)
//

export async function update_relation_usage(db: CozoDb, rel: string): Promise<void> {
  const now = new Date().toISOString()
  const golden = await is_golden_relation(db, rel)
  const escaped_rel = rel.replace(/'/g, "''")

  // Try to get existing usage
  const result = await db.run(`
    ?[count, first_seen] := *relation_usage['${escaped_rel}', count, first_seen, _, _]
  `)
  const rows = result.rows as [number, string][]

  if (rows.length > 0) {
    // Update existing
    const [old_count, first_seen] = rows[0]
    await db.run(`
      ?[rel, count, first_seen, last_seen, golden] <- [['${escaped_rel}', ${old_count + 1}, '${first_seen}', '${now}', ${golden}]]
      :put relation_usage { rel => count, first_seen, last_seen, golden }
    `)
  } else {
    // Insert new
    await db.run(`
      ?[rel, count, first_seen, last_seen, golden] <- [['${escaped_rel}', 1, '${now}', '${now}', ${golden}]]
      :put relation_usage { rel => count, first_seen, last_seen, golden }
    `)
  }
}

//
// Get lens metadata
//

export async function get_lens_meta(db: CozoDb): Promise<{ name: string; version: string; description: string | null }> {
  const result = await db.run(`
    ?[key, value] := *lens_meta[key, value]
  `)
  const rows = result.rows as [string, string][]

  const meta: Record<string, string> = {}
  for (const [key, value] of rows) {
    meta[key] = value
  }

  return {
    name:        meta.name ?? "unknown",
    version:     meta.version ?? "0.0.0",
    description: meta.description ?? null
  }
}

//
// Get all golden types
//

export async function get_golden_types(db: CozoDb): Promise<GoldenType[]> {
  const result = await db.run(`
    ?[type, description, authority] := *golden_types[type, description, authority]
  `)
  const rows = result.rows as [string, string, string][]

  return rows.map(([type, description, authority]) => ({
    type,
    description,
    authority: authority as "lens" | "manual"
  }))
}

//
// Get all golden relations
//

export async function get_golden_relations(db: CozoDb): Promise<GoldenRelation[]> {
  const result = await db.run(`
    ?[rel, description, symmetric, authority] := *golden_relations[rel, description, symmetric, authority]
  `)
  const rows = result.rows as [string, string, boolean, string][]

  return rows.map(([rel, description, symmetric, authority]) => ({
    rel,
    description,
    symmetric,
    authority: authority as "lens" | "manual"
  }))
}

//
// Get consolidation map
//

export async function get_consolidation_map(db: CozoDb): Promise<Record<string, string>> {
  const result = await db.run(`
    ?[source_type, target_type] := *consolidation_map[source_type, target_type]
  `)
  const rows = result.rows as [string, string][]

  const map: Record<string, string> = {}
  for (const [source, target] of rows) {
    map[source] = target
  }
  return map
}

//
// Get full lens config
//

export async function get_lens_config(db: CozoDb): Promise<LensConfig> {
  const meta = await get_lens_meta(db)
  const concepts = await get_golden_types(db)
  const relations = await get_golden_relations(db)
  const consolidation = await get_consolidation_map(db)

  return {
    name:        meta.name,
    version:     meta.version,
    description: meta.description,
    concepts,
    relations,
    consolidation
  }
}

//
// Get usage stats
//

export async function get_type_usage(db: CozoDb, candidates_only: boolean = false): Promise<TypeUsage[]> {
  const filter = candidates_only ? ", golden = false" : ""
  const result = await db.run(`
    ?[type, count, first_seen, last_seen, golden] := *type_usage[type, count, first_seen, last_seen, golden]${filter}
  `)
  const rows = result.rows as [string, number, string, string, boolean][]

  return rows.map(([type, count, first_seen, last_seen, golden]) => ({
    type,
    count,
    first_seen,
    last_seen,
    golden
  }))
}

export async function get_relation_usage(db: CozoDb, candidates_only: boolean = false): Promise<RelationUsage[]> {
  const filter = candidates_only ? ", golden = false" : ""
  const result = await db.run(`
    ?[rel, count, first_seen, last_seen, golden] := *relation_usage[rel, count, first_seen, last_seen, golden]${filter}
  `)
  const rows = result.rows as [string, number, string, string, boolean][]

  return rows.map(([rel, count, first_seen, last_seen, golden]) => ({
    rel,
    count,
    first_seen,
    last_seen,
    golden
  }))
}

export async function get_lens_stats(db: CozoDb, candidates_only: boolean = false): Promise<LensStats> {
  const types = await get_type_usage(db, candidates_only)
  const relations = await get_relation_usage(db, candidates_only)
  return { types, relations }
}
