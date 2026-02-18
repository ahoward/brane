//
// migrate.ts - move flat layout to .brane/lens/default/
//

import type { Params, Result, Emit } from "../../lib/types.ts"
import { success, error } from "../../lib/result.ts"
import { has_state } from "../../lib/state.ts"
import { sys } from "../../index.ts"
import { resolve } from "node:path"
import { existsSync, mkdirSync, renameSync, rmSync } from "node:fs"

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

  // Move files with rollback on failure
  const moved_body = existsSync(flat_body)
  const moved_wal = existsSync(flat_body + "-wal")
  const moved_shm = existsSync(flat_body + "-shm")

  try {
    if (moved_body) {
      renameSync(flat_body, resolve(lens_default_dir, "body.db"))
      if (moved_wal) renameSync(flat_body + "-wal", resolve(lens_default_dir, "body.db-wal"))
      if (moved_shm) renameSync(flat_body + "-shm", resolve(lens_default_dir, "body.db-shm"))
    }

    if (existsSync(flat_mind)) {
      renameSync(flat_mind, resolve(lens_default_dir, "mind.db"))
    }
  } catch (err) {
    // Rollback: move body.db back if mind.db move failed
    try {
      const target_body = resolve(lens_default_dir, "body.db")
      if (existsSync(target_body) && !existsSync(flat_body)) {
        renameSync(target_body, flat_body)
      }
      const target_wal = resolve(lens_default_dir, "body.db-wal")
      if (existsSync(target_wal)) renameSync(target_wal, flat_body + "-wal")
      const target_shm = resolve(lens_default_dir, "body.db-shm")
      if (existsSync(target_shm)) renameSync(target_shm, flat_body + "-shm")
      // Remove empty default dir after rollback
      rmSync(lens_default_dir, { recursive: true, force: true })
    } catch {
      // Rollback failed — best effort
    }

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
