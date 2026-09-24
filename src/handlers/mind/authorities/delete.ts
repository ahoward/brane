//
// delete.ts - remove an authority tier
//
// Refused while any claim references it. A claim under a deleted tier would
// lose its standing, which is worse than keeping an unused tier around.
//

import type { Params, Result, Emit } from "../../../lib/types.ts"
import { success, error } from "../../../lib/result.ts"
import { open_mind, is_mind_error } from "../../../lib/mind.ts"
import {
  get_authority,
  count_claims_for_authority,
  esc
} from "../../../lib/claims.ts"

interface DeleteParams {
  name?: string
}

interface DeleteResult {
  name:    string
  deleted: boolean
}

export async function handler(params: Params, emit?: Emit): Promise<Result<DeleteResult>> {
  const p = (params ?? {}) as DeleteParams

  if (p.name === undefined || p.name === null || p.name === "") {
    return error({ name: [{ code: "required", message: "name is required" }] })
  }

  const name = p.name.trim()

  const mind = await open_mind()

  if (is_mind_error(mind)) {
    return error({ mind: [{ code: mind.code, message: mind.message }] })
  }

  const { db } = mind

  try {
    const existing = await get_authority(db, name)

    if (!existing) {
      db.close()
      return error({ name: [{ code: "not_found", message: `authority tier not found: ${name}` }] })
    }

    const referencing = await count_claims_for_authority(db, name)

    if (referencing > 0) {
      db.close()
      const plural = referencing === 1 ? "claim" : "claims"
      return error({
        name: [{
          code:    "conflict",
          message: `authority tier is referenced by ${referencing} ${plural}: ${name}`
        }]
      })
    }

    await db.run(`
      ?[name] <- [['${esc(name)}']]
      :rm authorities { name }
    `)

    db.close()

    return success({ name: name, deleted: true })
  } catch (err) {
    db.close()
    const message = err instanceof Error ? err.message : (err as { message?: string })?.message ?? String(err)
    return error({ authority: [{ code: "db_error", message }] })
  }
}
