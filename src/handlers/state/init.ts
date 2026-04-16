//
// init.ts - initialize .brane/state.db with config table
//

import type { Params, Result, Emit } from "../../lib/types.ts"
import { success, error } from "../../lib/result.ts"
import { resolve } from "node:path"
import { existsSync, mkdirSync } from "node:fs"
import { Database } from "bun:sqlite"
import { open_memories } from "../../lib/memories.ts"

interface InitResult {
  path:         string
  created:      boolean
  memories_db?: string
}

export async function handler(params: Params, emit?: Emit): Promise<Result<InitResult>> {
  const brane_path = resolve(process.cwd(), ".brane")

  // .brane directory must exist
  if (!existsSync(brane_path)) {
    return error({
      state: [{
        code:    "not_initialized",
        message: "brane not initialized (run brane init)"
      }]
    })
  }

  const state_db_path = resolve(brane_path, "state.db")

  // Idempotent: if state.db already exists, just verify config table
  if (existsSync(state_db_path)) {
    try {
      const db = new Database(state_db_path)
      // Ensure config table exists (idempotent)
      db.exec(`
        CREATE TABLE IF NOT EXISTS config (
          key   TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )
      `)
      // Ensure lens_prompts table exists (idempotent)
      db.exec(`
        CREATE TABLE IF NOT EXISTS lens_prompts (
          name        TEXT PRIMARY KEY,
          prompt      TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          active      INTEGER NOT NULL DEFAULT 0,
          created_at  TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `)
      // Do NOT reset active_lens if already set (init idempotency)
      const row = db.query("SELECT value FROM config WHERE key = ?").get("active_lens")
      if (!row) {
        db.run("INSERT INTO config (key, value) VALUES (?, ?)", ["active_lens", "default"])
      }
      db.close()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return error({
        state: [{
          code:    "write_error",
          message: `failed to verify state.db: ${message}`
        }]
      })
    }

    // Ensure memories.db exists (idempotent — open_memories creates schema)
    const mdb = open_memories()
    if (mdb) mdb.close()

    return success({
      path:         state_db_path,
      created:      false,
      memories_db:  resolve(brane_path, "memories.db"),
    })
  }

  // Create state.db
  try {
    const db = new Database(state_db_path)
    db.exec("PRAGMA journal_mode=WAL")
    db.exec(`
      CREATE TABLE IF NOT EXISTS config (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `)
    db.exec(`
      CREATE TABLE IF NOT EXISTS lens_prompts (
        name        TEXT PRIMARY KEY,
        prompt      TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        active      INTEGER NOT NULL DEFAULT 0,
        created_at  TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)
    db.run("INSERT INTO config (key, value) VALUES (?, ?)", ["active_lens", "default"])
    db.close()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return error({
      state: [{
        code:    "write_error",
        message: `failed to create state.db: ${message}`
      }]
    })
  }

  // Create memories.db audit trail
  const mdb = open_memories()
  if (mdb) mdb.close()

  return success({
    path:         state_db_path,
    created:      true,
    memories_db:  resolve(brane_path, "memories.db"),
  })
}
