//
// delete.ts - delete a non-default, non-active lens
//

import type { Params, Result, Emit } from "../../lib/types.ts"
import { success, error } from "../../lib/result.ts"
import { get_active_lens, lens_exists, has_state, is_valid_lens_name } from "../../lib/state.ts"
import { resolve } from "node:path"
import { existsSync, rmSync } from "node:fs"

interface DeleteParams {
  name?: string
}

interface DeleteResult {
  name:    string
  deleted: true
}

export async function handler(params: Params, emit?: Emit): Promise<Result<DeleteResult>> {
  const p = (params ?? {}) as DeleteParams

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

  // Guard: brane initialized
  const brane_path = resolve(process.cwd(), ".brane")
  if (!existsSync(brane_path) || !has_state()) {
    return error({
      brane: [{
        code:    "not_initialized",
        message: "brane not initialized (run brane init)"
      }]
    })
  }

  // Guard: valid name (prevent path traversal)
  if (!is_valid_lens_name(name) && name !== "default") {
    return error({
      name: [{
        code:    "invalid",
        message: `invalid lens name: ${name}`
      }]
    })
  }

  // Guard: cannot delete default
  if (name === "default") {
    return error({
      name: [{
        code:    "is_default",
        message: "cannot delete the default lens"
      }]
    })
  }

  // Guard: cannot delete active lens
  const active = get_active_lens()
  if (name === active) {
    return error({
      name: [{
        code:    "is_active",
        message: `cannot delete the active lens: ${name} (switch to a different lens first)`
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

  // Delete lens directory
  const lens_dir = resolve(brane_path, "lens", name)
  try {
    rmSync(lens_dir, { recursive: true, force: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return error({
      name: [{
        code:    "delete_error",
        message: `failed to delete lens: ${message}`
      }]
    })
  }

  return success({
    name,
    deleted: true
  })
}
