//
// create.ts - create a new named lens with body.db + mind.db
//

import type { Params, Result, Emit } from "../../lib/types.ts"
import { success, error } from "../../lib/result.ts"
import { is_valid_lens_name, has_state } from "../../lib/state.ts"
import { sys } from "../../index.ts"
import { resolve } from "node:path"
import { existsSync, mkdirSync, rmSync } from "node:fs"

interface CreateParams {
  name?:   string
  config?: string
}

interface CreateResult {
  name:    string
  path:    string
  created: boolean
}

export async function handler(params: Params, emit?: Emit): Promise<Result<CreateResult>> {
  const p = (params ?? {}) as CreateParams

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

  // Guard: valid name
  if (!is_valid_lens_name(name)) {
    return error({
      name: [{
        code:    "invalid",
        message: `invalid lens name: ${name} (use alphanumeric, hyphens, underscores; cannot be a reserved word)`
      }]
    })
  }

  // Guard: state.db must exist (brane init must have been run)
  const brane_path = resolve(process.cwd(), ".brane")
  if (!existsSync(brane_path) || !has_state()) {
    return error({
      brane: [{
        code:    "not_initialized",
        message: "brane not initialized (run brane init)"
      }]
    })
  }

  // Guard: lens must not already exist
  const lens_dir = resolve(brane_path, "lens", name)
  if (existsSync(lens_dir)) {
    return error({
      name: [{
        code:    "already_exists",
        message: `lens already exists: ${name}`
      }]
    })
  }

  // Create lens directory
  try {
    mkdirSync(lens_dir, { recursive: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return error({
      name: [{
        code:    "write_error",
        message: `failed to create lens directory: ${message}`
      }]
    })
  }

  // Initialize body.db in lens directory
  const body_result = await sys.call("/body/init", { target_dir: lens_dir })
  if (body_result.status === "error") {
    // Rollback: remove partially created directory
    try { rmSync(lens_dir, { recursive: true, force: true }) } catch {}
    return body_result as any
  }

  // Initialize mind.db in lens directory
  const mind_result = await sys.call("/mind/init", { target_dir: lens_dir })
  if (mind_result.status === "error") {
    // Rollback: remove partially created directory
    try { rmSync(lens_dir, { recursive: true, force: true }) } catch {}
    return mind_result as any
  }

  // If config specified, import YAML into the new lens
  if (p.config) {
    // TODO: T032 — import YAML config into new lens's mind.db
  }

  return success({
    name,
    path:    lens_dir,
    created: true
  })
}
