//
// prompt.ts - manage lens prompts (create, activate, deactivate, list)
//
// Lens prompts are cognitive filters stored in state.db that shape
// how digest, storm, enhance, and ask process information.
//

import type { Params, Result, Emit } from "../../lib/types.ts"
import { success, error } from "../../lib/result.ts"
import {
  set_lens_prompt,
  get_lens_prompt,
  delete_lens_prompt,
  activate_lens_prompt,
  deactivate_lens_prompt,
  list_lens_prompts,
} from "../../lib/state.ts"

interface PromptSetParams {
  action:      "set"
  name:        string
  prompt:      string
  description?: string
}

interface PromptActivateParams {
  action:  "on" | "off"
  name:    string
}

interface PromptDeleteParams {
  action:  "delete"
  name:    string
}

interface PromptListParams {
  action:  "list"
}

interface PromptGetParams {
  action:  "get"
  name:    string
}

type PromptParams = PromptSetParams | PromptActivateParams | PromptDeleteParams | PromptListParams | PromptGetParams

export async function handler(params: Params, emit?: Emit): Promise<Result<any>> {
  const p = (params ?? {}) as PromptParams

  if (!p.action || typeof p.action !== "string") {
    return error({ action: [{ code: "required", message: "action is required (set, on, off, delete, list, get)" }] })
  }

  switch (p.action) {
    case "set": {
      const sp = p as PromptSetParams
      if (!sp.name || typeof sp.name !== "string" || !sp.name.trim()) {
        return error({ name: [{ code: "required", message: "name is required" }] })
      }
      if (!sp.prompt || typeof sp.prompt !== "string" || !sp.prompt.trim()) {
        return error({ prompt: [{ code: "required", message: "prompt is required" }] })
      }
      const ok = set_lens_prompt(sp.name.trim(), sp.prompt.trim(), sp.description?.trim())
      if (!ok) {
        return error({ state: [{ code: "write_failed", message: "failed to save lens prompt (is brane initialized?)" }] })
      }
      const info = get_lens_prompt(sp.name.trim())
      return success(info)
    }

    case "on": {
      const ap = p as PromptActivateParams
      if (!ap.name || typeof ap.name !== "string" || !ap.name.trim()) {
        return error({ name: [{ code: "required", message: "name is required" }] })
      }
      const ok = activate_lens_prompt(ap.name.trim())
      if (!ok) {
        return error({ name: [{ code: "not_found", message: `lens prompt "${ap.name}" not found` }] })
      }
      return success({ name: ap.name.trim(), active: true })
    }

    case "off": {
      const dp = p as PromptActivateParams
      if (!dp.name || typeof dp.name !== "string" || !dp.name.trim()) {
        return error({ name: [{ code: "required", message: "name is required" }] })
      }
      const ok = deactivate_lens_prompt(dp.name.trim())
      if (!ok) {
        return error({ state: [{ code: "write_failed", message: "failed to deactivate lens prompt" }] })
      }
      return success({ name: dp.name.trim(), active: false })
    }

    case "delete": {
      const ddp = p as PromptDeleteParams
      if (!ddp.name || typeof ddp.name !== "string" || !ddp.name.trim()) {
        return error({ name: [{ code: "required", message: "name is required" }] })
      }
      const ok = delete_lens_prompt(ddp.name.trim())
      if (!ok) {
        return error({ state: [{ code: "write_failed", message: "failed to delete lens prompt" }] })
      }
      return success({ name: ddp.name.trim(), deleted: true })
    }

    case "get": {
      const gp = p as PromptGetParams
      if (!gp.name || typeof gp.name !== "string" || !gp.name.trim()) {
        return error({ name: [{ code: "required", message: "name is required" }] })
      }
      const info = get_lens_prompt(gp.name.trim())
      if (!info) {
        return error({ name: [{ code: "not_found", message: `lens prompt "${gp.name}" not found` }] })
      }
      return success(info)
    }

    case "list": {
      const prompts = list_lens_prompts()
      return success({ prompts })
    }

    default:
      return error({ action: [{ code: "invalid", message: `unknown action "${p.action}" (expected: set, on, off, delete, list, get)` }] })
  }
}
