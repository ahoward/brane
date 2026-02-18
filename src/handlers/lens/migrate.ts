//
// migrate.ts - move flat layout to .brane/lens/default/
//

import type { Params, Result, Emit } from "../../lib/types.ts"
import { success, error } from "../../lib/result.ts"
import { has_state } from "../../lib/state.ts"
import { sys } from "../../index.ts"
import { resolve } from "node:path"
import { existsSync, mkdirSync, renameSync } from "node:fs"

interface MigrateResult {
  migrated: boolean
  from:     string
  to:       string
}

export async function handler(params: Params, emit?: Emit): Promise<Result<MigrateResult>> {
  const brane_path = resolve(process.cwd(), ".brane")

  // Guard: .brane must exist
  if (!existsSync(brane_path)) {
    return error({
      brane: [{
        code:    "not_initialized",
        message: "brane not initialized (run brane init)"
      }]
    })
  }

  const flat_body = resolve(brane_path, "body.db")
  const flat_mind = resolve(brane_path, "mind.db")
  const lens_default_dir = resolve(brane_path, "lens", "default")

  // Guard: already migrated
  if (existsSync(lens_default_dir)) {
    return error({
      brane: [{
        code:    "already_migrated",
        message: "already migrated: .brane/lens/default/ exists"
      }]
    })
  }

  // Guard: flat layout must exist
  if (!existsSync(flat_body) && !existsSync(flat_mind)) {
    return error({
      brane: [{
        code:    "no_flat_layout",
        message: "no flat layout found (no .brane/body.db or .brane/mind.db)"
      }]
    })
  }

  // Create lens/default/ directory
  mkdirSync(lens_default_dir, { recursive: true })

  // Move files
  try {
    if (existsSync(flat_body)) {
      renameSync(flat_body, resolve(lens_default_dir, "body.db"))
      // Also move WAL/SHM files if they exist
      const wal = flat_body + "-wal"
      const shm = flat_body + "-shm"
      if (existsSync(wal)) renameSync(wal, resolve(lens_default_dir, "body.db-wal"))
      if (existsSync(shm)) renameSync(shm, resolve(lens_default_dir, "body.db-shm"))
    }

    if (existsSync(flat_mind)) {
      renameSync(flat_mind, resolve(lens_default_dir, "mind.db"))
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return error({
      brane: [{
        code:    "migrate_error",
        message: `failed to migrate: ${message}`
      }]
    })
  }

  // Ensure state.db exists
  if (!has_state()) {
    await sys.call("/state/init", {})
  }

  return success({
    migrated: true,
    from:     brane_path,
    to:       lens_default_dir
  })
}
