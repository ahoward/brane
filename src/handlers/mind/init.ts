//
// init.ts - initialize CozoDB mind.db with schema
//

import type { Params, Result } from "../../lib/types.ts"
import { success, error } from "../../lib/result.ts"
import { resolve } from "node:path"
import { existsSync, rmSync } from "node:fs"
import { CozoDb } from "../../lib/cozo"

interface InitParams {
  force?: boolean
}

interface InitResult {
  path:           string
  created:        boolean
  schema_version: string
}

const SCHEMA_VERSION = "1.4.0"

//
// Built-in rules for graph integrity checks
//
const BUILTIN_RULES = [
  {
    name: "cycles",
    description: "Detects circular dependencies via DEPENDS_ON edges",
    body: `cycles[id, name] := *concepts[id, name, _], reachable[id, id]
reachable[x, y] := *edges[_, x, y, 'DEPENDS_ON', _]
reachable[x, y] := *edges[_, x, z, 'DEPENDS_ON', _], reachable[z, y]`,
    builtin: true
  },
  {
    name: "orphans",
    description: "Detects concepts with no edges (disconnected)",
    body: `orphans[id, name] := *concepts[id, name, _], not *edges[_, id, _, _, _], not *edges[_, _, id, _, _]`,
    builtin: true
  }
]

//
// Schema creation queries
//

const SCHEMA_QUERIES = [
  // Schema metadata relation
  `:create schema_meta { key: String => value: String }`,

  // Core concepts relation
  // id: unique identifier
  // name: human-readable name
  // type: Entity, Caveat, Rule
  // vector: optional embedding (for future vector search)
  `:create concepts {
    id: Int,
    name: String,
    type: String
  }`,

  // Edges between concepts
  // id: unique identifier
  // source/target: concept IDs
  // relation: DEPENDS_ON, CONFLICTS_WITH, DEFINED_IN, etc.
  // weight: relationship strength (default 1.0)
  `:create edges {
    id: Int,
    source: Int,
    target: Int,
    relation: String,
    weight: Float default 1.0
  }`,

  // Provenance linking concepts to body files
  // concept_id: which concept
  // file_url: which file in body.db
  `:create provenance {
    concept_id: Int,
    file_url: String
  }`,

  // Rules for Datalog queries
  // name: unique identifier (primary key)
  // description: human-readable explanation
  // body: Datalog query body
  // builtin: true for system rules (cycles, orphans)
  `:create rules {
    name: String,
    description: String,
    body: String,
    builtin: Bool default false
  }`,

  // Annotations - manual notes with infinite authority
  // id: unique identifier
  // target: concept ID this annotation applies to
  // text: annotation content
  // type: caveat, note, or todo
  // authority: always "infinity" for manual annotations
  // created_at: ISO timestamp
  `:create annotations {
    id: Int,
    target: Int,
    text: String,
    type: String,
    authority: String,
    created_at: String
  }`,

  // Extraction state - tracks file hash at time of extraction
  // file_url: file that was extracted (primary key)
  // file_hash: hash of file content when extracted
  // This enables incremental extraction by detecting changed files
  `:create extraction_state {
    file_url: String,
    file_hash: String
  }`
]

//
// Check if relations exist
//

async function relations_exist(db: CozoDb): Promise<boolean> {
  try {
    const result = await db.run("::relations")
    const rows = result.rows as string[][]
    const relation_names = rows.map(r => r[0])
    return relation_names.includes("concepts")
  } catch {
    return false
  }
}

//
// Create schema
//

async function create_schema(db: CozoDb): Promise<void> {
  for (const query of SCHEMA_QUERIES) {
    await db.run(query)
  }

  // Insert schema version
  await db.run(`
    ?[key, value] <- [['version', '${SCHEMA_VERSION}']]
    :put schema_meta { key => value }
  `)

  // Seed built-in rules (using double quotes to avoid escaping issues with body content)
  for (const rule of BUILTIN_RULES) {
    const escapedName = rule.name.replace(/"/g, '\\"')
    const escapedDesc = rule.description.replace(/"/g, '\\"')
    const escapedBody = rule.body.replace(/"/g, '\\"')
    await db.run(`
      ?[name, description, body, builtin] <- [["${escapedName}", "${escapedDesc}", "${escapedBody}", ${rule.builtin}]]
      :put rules { name, description, body, builtin }
    `)
  }
}

//
// Get schema version
//

async function get_schema_version(db: CozoDb): Promise<string> {
  try {
    const result = await db.run(`
      ?[value] := *schema_meta['version', value]
    `)
    const rows = result.rows as string[][]
    if (rows.length > 0) {
      return rows[0][0]
    }
  } catch {
    // ignore
  }
  return "unknown"
}

//
// Main handler
//

export async function handler(params: Params): Promise<Result<InitResult>> {
  const p = (params ?? {}) as InitParams

  // Check brane is initialized
  const brane_path = resolve(process.cwd(), ".brane")
  const body_db_path = resolve(brane_path, "body.db")

  if (!existsSync(brane_path) || !existsSync(body_db_path)) {
    return error({
      brane: [{
        code:    "not_initialized",
        message: "brane not initialized (run brane init)"
      }]
    })
  }

  const mind_db_path = resolve(brane_path, "mind.db")
  const force = p.force === true

  // Handle force flag - remove existing mind.db
  if (force && existsSync(mind_db_path)) {
    rmSync(mind_db_path, { recursive: true, force: true })
  }

  // Check if mind.db already exists
  const already_exists = existsSync(mind_db_path)

  // Open/create CozoDB with RocksDB backend
  let db: CozoDb

  try {
    db = new CozoDb("rocksdb", mind_db_path)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return error({
      mind: [{
        code:    "db_error",
        message: `failed to open mind.db: ${message}`
      }]
    })
  }

  try {
    // Check if schema already exists
    const has_schema = await relations_exist(db)

    if (!has_schema) {
      // Create schema
      await create_schema(db)
    }

    // Get schema version
    const version = await get_schema_version(db)

    db.close()

    return success({
      path:           mind_db_path,
      created:        !already_exists || force,
      schema_version: version
    })
  } catch (err) {
    db.close()
    const message = err instanceof Error ? err.message : String(err)
    return error({
      mind: [{
        code:    "schema_error",
        message: `failed to create schema: ${message}`
      }]
    })
  }
}
