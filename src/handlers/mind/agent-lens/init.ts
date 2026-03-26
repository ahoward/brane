//
// agent-lens/init.ts - auto-create and activate per-agent lens
//
// Called during MCP initialize to give each agent its own isolated
// knowledge space. Idempotent: re-init returns existing lens.
//
// Naming convention: agent-{agent_id}
//

import type { Params, Result, Emit } from "../../../lib/types.ts"
import { success, error } from "../../../lib/result.ts"
import { is_valid_lens_name, lens_exists, set_active_lens, get_active_lens, has_state } from "../../../lib/state.ts"
import { sys } from "../../../index.ts"
import { resolve } from "node:path"
import { existsSync, mkdirSync, rmSync } from "node:fs"

interface AgentLensInitParams {
  agent_id?: string
}

interface AgentLensInitResult {
  lens_name: string
  created:   boolean
}

export async function handler(params: Params, emit?: Emit): Promise<Result<AgentLensInitResult>> {
  const p = (params ?? {}) as AgentLensInitParams

  // Guard: agent_id required
  if (!p.agent_id || typeof p.agent_id !== "string" || p.agent_id.trim() === "") {
    return error({
      agent_id: [{
        code:    "required",
        message: "agent_id is required"
      }]
    })
  }

  const agent_id = p.agent_id.trim()
  const lens_name = `agent-${agent_id}`

  // Guard: resulting lens name must be valid
  if (!is_valid_lens_name(lens_name)) {
    return error({
      agent_id: [{
        code:    "invalid",
        message: `agent_id produces invalid lens name: ${lens_name}`
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

  // Check if lens already exists
  if (lens_exists(lens_name)) {
    // Just activate and return
    set_active_lens(lens_name)
    return success({
      lens_name,
      created: false
    })
  }

  // Save previous lens for rollback on failure
  const prev_lens = get_active_lens()

  // Create lens directory
  const lens_dir = resolve(brane_path, "lens", lens_name)
  try {
    mkdirSync(lens_dir, { recursive: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return error({
      lens: [{
        code:    "write_error",
        message: `failed to create agent lens directory: ${message}`
      }]
    })
  }

  // Activate the new lens BEFORE init so body/mind init targets it
  set_active_lens(lens_name)

  // Initialize body.db in lens directory
  const body_result = await sys.call("/body/init", { target_dir: lens_dir })
  if (body_result.status === "error") {
    // Rollback: revert lens, remove directory
    set_active_lens(prev_lens)
    try { rmSync(lens_dir, { recursive: true, force: true }) } catch {}
    return body_result as any
  }

  // Initialize mind.db in lens directory
  const mind_result = await sys.call("/mind/init", { target_dir: lens_dir })
  if (mind_result.status === "error") {
    // Rollback: revert lens, remove directory
    set_active_lens(prev_lens)
    try { rmSync(lens_dir, { recursive: true, force: true }) } catch {}
    return mind_result as any
  }

  return success({
    lens_name,
    created: true
  })
}
