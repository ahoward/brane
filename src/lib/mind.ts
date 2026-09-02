//
// mind.ts - shared utilities for mind.db operations
//

import { resolve } from "node:path"
import { existsSync } from "node:fs"
import { CozoDb } from "./cozo"
import { resolve_lens_paths } from "./state.ts"
import { migrate } from "./migrate.ts"

export interface MindDb {
  db:   CozoDb
  path: string
}

export interface MindError {
  code:    string
  message: string
}

//
// Open mind.db, returns error if not initialized.
// Uses resolve_lens_paths() to find the active lens's mind.db.
//

export async function open_mind(): Promise<MindDb | MindError> {
  const paths = resolve_lens_paths()

  if (!existsSync(paths.brane_path)) {
    return {
      code:    "not_initialized",
      message: "brane not initialized (run brane init)"
    }
  }

  if (!existsSync(paths.body_db_path)) {
    return {
      code:    "not_initialized",
      message: "brane not initialized (run brane init)"
    }
  }

  if (!existsSync(paths.mind_db_path)) {
    return {
      code:    "not_initialized",
      message: "mind not initialized (run brane mind init)"
    }
  }

  try {
    const db = new CozoDb("rocksdb", paths.mind_db_path)

    // Auto-migrate if schema is behind
    try {
      await migrate(db, paths.mind_db_path)
    } catch (err) {
      db.close()
      const message = err instanceof Error ? err.message : String(err)
      return {
        code:    "migration_failed",
        message,
      }
    }

    return { db, path: paths.mind_db_path }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      code:    "db_error",
      message: `failed to open mind.db: ${message}`
    }
  }
}

export function is_mind_error(result: MindDb | MindError): result is MindError {
  return "code" in result && "message" in result && !("db" in result)
}

//
// Concept types (suggestions, not restrictions)
//

export const CONCEPT_TYPES = ["Entity", "Caveat", "Rule"] as const
export type ConceptType = typeof CONCEPT_TYPES[number]

// Accepts any non-empty string - prose and code both welcome
export function is_valid_concept_type(type: string): boolean {
  return typeof type === "string" && type.length > 0
}

//
// Get next concept ID (auto-increment)
//

export async function get_next_concept_id(db: CozoDb): Promise<number> {
  // Try to get current counter
  const result = await db.run(`
    ?[value] := *schema_meta['concept_next_id', value]
  `)

  const rows = result.rows as string[][]
  let next_id = 1

  if (rows.length > 0) {
    next_id = parseInt(rows[0][0], 10)
  }

  // Increment counter
  const new_id = next_id + 1
  await db.run(`
    ?[key, value] <- [['concept_next_id', '${new_id}']]
    :put schema_meta { key => value }
  `)

  return next_id
}

//
// Edge relations (suggestions, not restrictions)
//

export const EDGE_RELATIONS = ["DEPENDS_ON", "CONFLICTS_WITH", "DEFINED_IN"] as const
export type EdgeRelation = typeof EDGE_RELATIONS[number]

// Accepts any non-empty string - prose and code both welcome
export function is_valid_edge_relation(relation: string): boolean {
  return typeof relation === "string" && relation.length > 0
}

//
// Get next edge ID (auto-increment)
//

export async function get_next_edge_id(db: CozoDb): Promise<number> {
  // Try to get current counter
  const result = await db.run(`
    ?[value] := *schema_meta['edge_next_id', value]
  `)

  const rows = result.rows as string[][]
  let next_id = 1

  if (rows.length > 0) {
    next_id = parseInt(rows[0][0], 10)
  }

  // Increment counter
  const new_id = next_id + 1
  await db.run(`
    ?[key, value] <- [['edge_next_id', '${new_id}']]
    :put schema_meta { key => value }
  `)

  return next_id
}

//
// Check if concept exists
//

export async function edge_exists(db: CozoDb, id: number): Promise<boolean> {
  const result = await db.run(`
    ?[id] := *edges[id, _, _, _, _, _], id = ${id}
  `)
  const rows = result.rows as unknown[][]
  return rows.length > 0
}

export async function concept_exists(db: CozoDb, id: number): Promise<boolean> {
  const result = await db.run(`
    ?[id] := *concepts[id, _, _, _, _], id = ${id}
  `)
  const rows = result.rows as unknown[][]
  return rows.length > 0
}

//
// Rule types
//

export interface Rule {
  name:        string
  description: string
  body:        string
  builtin:     boolean
}

//
// Built-in rule names (cannot be deleted or overwritten)
//

export const BUILTIN_RULE_NAMES = ["cycles", "orphans", "contradictions"] as const

export function is_builtin_rule(name: string): boolean {
  return BUILTIN_RULE_NAMES.includes(name as typeof BUILTIN_RULE_NAMES[number])
}

//
// Get rule by name
//

export async function get_rule_by_name(db: CozoDb, name: string): Promise<Rule | null> {
  try {
    const result = await db.run(`
      ?[name, description, body, builtin] := *rules[name, description, body, builtin], name = '${name.replace(/'/g, "''")}'
    `)
    const rows = result.rows as [string, string, string, boolean][]
    if (rows.length === 0) {
      return null
    }
    return {
      name:        rows[0][0],
      description: rows[0][1],
      body:        rows[0][2],
      builtin:     rows[0][3]
    }
  } catch {
    return null
  }
}

//
// Escape a string for a single-quoted CozoDB literal.
//
// Cozo uses backslash escapes, NOT SQL-style doubling: 'it''s' is a parse
// error, 'it\'s' is correct. Getting this wrong silently rejects any value
// containing an apostrophe.
//
export function esc_cozo(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'")
}

//
// Validate rule syntax using CozoDB's ::explain
//

export async function validate_rule_syntax(db: CozoDb, body: string): Promise<{ valid: boolean; error?: string }> {
  try {
    await db.run(`::explain { ${body} }`)
    return { valid: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { valid: false, error: message }
  }
}

//
// Annotation types
//

export const ANNOTATION_TYPES = ["caveat", "note", "todo"] as const
export type AnnotationType = typeof ANNOTATION_TYPES[number]

export function is_valid_annotation_type(type: string): type is AnnotationType {
  return ANNOTATION_TYPES.includes(type as AnnotationType)
}

// Authority is always "infinity" for manual annotations
export const ANNOTATION_AUTHORITY = "infinity"

// Max text length for annotations
export const ANNOTATION_MAX_TEXT_LENGTH = 4096

//
// Get next annotation ID (auto-increment)
//

export async function get_next_annotation_id(db: CozoDb): Promise<number> {
  // Try to get current counter
  const result = await db.run(`
    ?[value] := *schema_meta['annotation_next_id', value]
  `)

  const rows = result.rows as string[][]
  let next_id = 1

  if (rows.length > 0) {
    next_id = parseInt(rows[0][0], 10)
  }

  // Increment counter
  const new_id = next_id + 1
  await db.run(`
    ?[key, value] <- [['annotation_next_id', '${new_id}']]
    :put schema_meta { key => value }
  `)

  return next_id
}

//
// Check if annotation exists
//

//
// Get next episode ID (auto-increment)
//

export async function get_next_episode_id(db: CozoDb): Promise<number> {
  const result = await db.run(`
    ?[value] := *schema_meta['episode_next_id', value]
  `)

  const rows = result.rows as string[][]
  let next_id = 1

  if (rows.length > 0) {
    next_id = parseInt(rows[0][0], 10)
  }

  // Increment counter
  const new_id = next_id + 1
  await db.run(`
    ?[key, value] <- [['episode_next_id', '${new_id}']]
    :put schema_meta { key => value }
  `)

  return next_id
}

export async function annotation_exists(db: CozoDb, id: number): Promise<boolean> {
  const result = await db.run(`
    ?[id] := *annotations[id, _, _, _, _, _], id = ${id}
  `)
  const rows = result.rows as unknown[][]
  return rows.length > 0
}

//
// Ensure annotations relation exists (for schema migration)
//

export async function ensure_annotations_relation(db: CozoDb): Promise<void> {
  try {
    // Check if annotations relation exists
    const result = await db.run("::relations")
    const rows = result.rows as string[][]
    const relation_names = rows.map(r => r[0])

    if (!relation_names.includes("annotations")) {
      // Create annotations relation
      await db.run(`
        :create annotations {
          id: Int,
          target: Int,
          text: String,
          type: String,
          authority: String,
          created_at: String
        }
      `)
    }
  } catch {
    // Relation may already exist, ignore error
  }
}

//
// Archive an episode: read data, remove old row, insert with archived=true.
// CozoDB relations without => treat ALL columns as key, so :put with
// different archived value creates a duplicate row. Must :rm + :put.
//
//
// Record creation timestamp for a concept or edge.
// Silently ignores errors (timestamp is advisory, not critical).
//
export async function record_entity_timestamp(db: CozoDb, entity_type: "concept" | "edge", entity_id: number): Promise<void> {
  const created_at = new Date().toISOString()
  try {
    await db.run(`
      ?[entity_type, entity_id, created_at] <- [['${entity_type}', ${entity_id}, '${created_at}']]
      :put entity_timestamps { entity_type, entity_id => created_at }
    `)
  } catch {
    // Silent — timestamp tracking is advisory
  }
}

//
// Batch record creation timestamps for multiple entities.
//
export async function record_entity_timestamps_batch(db: CozoDb, entity_type: "concept" | "edge", entity_ids: number[]): Promise<void> {
  if (entity_ids.length === 0) return
  const created_at = new Date().toISOString()
  try {
    const rows = entity_ids.map(id => `['${entity_type}', ${id}, '${created_at}']`).join(", ")
    await db.run(`
      ?[entity_type, entity_id, created_at] <- [${rows}]
      :put entity_timestamps { entity_type, entity_id => created_at }
    `)
  } catch {
    // Silent — timestamp tracking is advisory
  }
}

export async function archive_episode(db: CozoDb, ep_id: number): Promise<void> {
  const read_result = await db.run(`
    ?[id, agent_id, timestamp, observation, context, outcome, tags, vector, source_concept_id, archived] :=
      *episodes[id, agent_id, timestamp, observation, context, outcome, tags, vector, source_concept_id, archived],
      id = ${ep_id}
  `)

  if (read_result.rows.length === 0) return

  // Remove the old row
  await db.run(`
    ?[id, agent_id, timestamp, observation, context, outcome, tags, vector, source_concept_id, archived] :=
      *episodes[id, agent_id, timestamp, observation, context, outcome, tags, vector, source_concept_id, archived],
      id = ${ep_id}
    :rm episodes { id, agent_id, timestamp, observation, context, outcome, tags, vector, source_concept_id, archived }
  `)

  // Re-insert with archived=true using captured data
  const row = read_result.rows[0] as [number, string, string, string, string, string, string, number[] | null, number, boolean]
  const [id, agent_id, timestamp, observation, context, outcome, tags, vector, source_concept_id] = row
  const esc = (s: string | null) => s !== null && s !== undefined ? s.replace(/'/g, "''") : ""
  const vector_str = vector !== null ? `vec(${JSON.stringify(vector)})` : "null"

  await db.run(`
    ?[id, agent_id, timestamp, observation, context, outcome, tags, vector, source_concept_id, archived] <- [[
      ${id},
      '${esc(agent_id)}',
      '${esc(timestamp)}',
      '${esc(observation)}',
      '${esc(context)}',
      '${esc(outcome)}',
      '${esc(tags)}',
      ${vector_str},
      ${source_concept_id},
      true
    ]]
    :put episodes { id, agent_id, timestamp, observation, context, outcome, tags, vector, source_concept_id, archived }
  `)
}
