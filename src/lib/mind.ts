//
// mind.ts - shared utilities for mind.db operations
//

import { resolve } from "node:path"
import { existsSync } from "node:fs"
import { CozoDb } from "cozo-node"

export interface MindDb {
  db:   CozoDb
  path: string
}

export interface MindError {
  code:    string
  message: string
}

//
// Open mind.db, returns error if not initialized
//

export function open_mind(): MindDb | MindError {
  const brane_path = resolve(process.cwd(), ".brane")
  const body_db_path = resolve(brane_path, "body.db")
  const mind_db_path = resolve(brane_path, "mind.db")

  if (!existsSync(brane_path) || !existsSync(body_db_path)) {
    return {
      code:    "not_initialized",
      message: "brane not initialized (run brane init)"
    }
  }

  if (!existsSync(mind_db_path)) {
    return {
      code:    "not_initialized",
      message: "mind not initialized (run brane mind init)"
    }
  }

  try {
    const db = new CozoDb("rocksdb", mind_db_path)
    return { db, path: mind_db_path }
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
// Valid concept types
//

export const CONCEPT_TYPES = ["Entity", "Caveat", "Rule"] as const
export type ConceptType = typeof CONCEPT_TYPES[number]

export function is_valid_concept_type(type: string): type is ConceptType {
  return CONCEPT_TYPES.includes(type as ConceptType)
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
