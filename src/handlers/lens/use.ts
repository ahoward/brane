//
// use.ts - set the active lens in state.db
//

import type { Params, Result, Emit } from "../../lib/types.ts"
import { success, error } from "../../lib/result.ts"
import { set_active_lens, lens_exists, has_state, is_valid_active_lens_name } from "../../lib/state.ts"
import { resolve } from "node:path"
import { existsSync } from "node:fs"

interface UseParams {
  name?: string
}

interface UseResult {
  name:   string
  active: true
}

export async function handler(params: Params, emit?: Emit): Promise<Result<UseResult>> {
  const p = (params ?? {}) as UseParams

  // Guard: name required
  if (!p.name || typeof p.name !== "string" || p.name.trim() === "") {
    return error({
      name: [{
        code:    "required",
        message: "name is required"
      }]
    })
  }

  const name = p.name.trim()

  // Guard: brane initialized with state.db
  const brane_path = resolve(process.cwd(), ".brane")
  if (!existsSync(brane_path) || !has_state()) {
    return error({
      brane: [{
        code:    "not_initialized",
        message: "brane not initialized (run brane init)"
      }]
    })
  }

  // Guard: lens must exist
  if (!lens_exists(name)) {
    return error({
      name: [{
        code:    "not_found",
        message: `lens not found: ${name}`
      }]
    })
  }

  // Set active lens
  set_active_lens(name)

  return success({
    name,
    active: true
  })
}
