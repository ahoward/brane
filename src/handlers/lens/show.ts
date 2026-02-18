//
// show.ts - return lens configuration (active or named)
//

import type { Params, Result, Emit } from "../../lib/types.ts"
import { success, error } from "../../lib/result.ts"
import { open_mind, is_mind_error, get_lens_config, type LensConfig } from "../../lib/lens.ts"
import { resolve_lens_paths, lens_exists, is_valid_active_lens_name } from "../../lib/state.ts"
import { CozoDb } from "../../lib/cozo"
import { existsSync } from "node:fs"

interface ShowParams {
  name?: string
}

export async function handler(params: Params, emit?: Emit): Promise<Result<LensConfig>> {
  const p = (params ?? {}) as ShowParams

  // If name specified, open that lens's mind.db directly
  if (p.name && typeof p.name === "string" && p.name.trim() !== "") {
    const name = p.name.trim()

    // Guard: valid name (prevent path traversal)
    if (!is_valid_active_lens_name(name)) {
      return error({
        name: [{
          code:    "invalid",
          message: `invalid lens name: ${name}`
        }]
      })
    }

    if (!lens_exists(name)) {
      return error({
        name: [{
          code:    "not_found",
          message: `lens not found: ${name}`
        }]
      })
    }

    const paths = resolve_lens_paths(name)
    if (!existsSync(paths.mind_db_path)) {
      return error({
        mind: [{
          code:    "not_initialized",
          message: `mind.db not found for lens: ${name}`
        }]
      })
    }

    let db: CozoDb
    try {
      db = new CozoDb("rocksdb", paths.mind_db_path)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return error({
        mind: [{
          code:    "db_error",
          message: `failed to open mind.db for lens ${name}: ${message}`
        }]
      })
    }

    try {
      const config = await get_lens_config(db)
      db.close()
      return success(config)
    } catch (err) {
      db.close()
      const message = err instanceof Error ? err.message : String(err)
      return error({
        lens: [{
          code:    "query_error",
          message: `failed to get lens config: ${message}`
        }]
      })
    }
  }

  // Default: open active lens's mind.db
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
    const config = await get_lens_config(db)
    db.close()
    return success(config)
  } catch (err) {
    db.close()
    const message = err instanceof Error ? err.message : String(err)
    return error({
      lens: [{
        code:    "query_error",
        message: `failed to get lens config: ${message}`
      }]
    })
  }
}
