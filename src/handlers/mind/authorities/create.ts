//
// create.ts - register an authority tier, or re-rank an existing one
//
// Upsert. Re-ranking does NOT rewrite claims: rank is joined at read time, so
// existing claims pick up the new standing on their next read.
//

import type { Params, Result, Emit } from "../../../lib/types.ts"
import { success, error } from "../../../lib/result.ts"
import { open_mind, is_mind_error } from "../../../lib/mind.ts"
import {
  AUTHORITY_MAX_NAME_LENGTH,
  get_authority,
  esc
} from "../../../lib/claims.ts"

interface CreateParams {
  name?:        string
  rank?:        number
  description?: string
}

interface CreateResult {
  name:        string
  rank:        number
  description: string
  created:     boolean
}

export async function handler(params: Params, emit?: Emit): Promise<Result<CreateResult>> {
  const p = (params ?? {}) as CreateParams

  if (p.name === undefined || p.name === null || p.name === "") {
    return error({ name: [{ code: "required", message: "name is required" }] })
  }

  if (p.rank === undefined || p.rank === null) {
    return error({ rank: [{ code: "required", message: "rank is required" }] })
  }

  if (typeof p.rank !== "number" || !Number.isInteger(p.rank) || p.rank < 0) {
    return error({ rank: [{ code: "invalid", message: "rank must be a non-negative integer" }] })
  }

  const name = p.name.trim()

  if (name === "") {
    return error({ name: [{ code: "invalid", message: "name must not be empty" }] })
  }

  if (name.length > AUTHORITY_MAX_NAME_LENGTH) {
    return error({
      name: [{ code: "invalid", message: `name exceeds ${AUTHORITY_MAX_NAME_LENGTH} characters` }]
    })
  }

  const mind = await open_mind()

  if (is_mind_error(mind)) {
    return error({ mind: [{ code: mind.code, message: mind.message }] })
  }

  const { db } = mind

  try {
    const existing = await get_authority(db, name)

    // an omitted description on an update preserves what is already there -
    // a rank-only change must not blank the tier's meaning
    const description = p.description !== undefined && p.description !== null
      ? p.description.trim()
      : (existing ? existing.description : "")

    await db.run(`
      ?[name, rank, description] <- [['${esc(name)}', ${p.rank}, '${esc(description)}']]
      :put authorities { name => rank, description }
    `)

    db.close()

    return success({
      name:        name,
      rank:        p.rank,
      description: description,
      created:     existing === null
    })
  } catch (err) {
    db.close()
    const message = err instanceof Error ? err.message : (err as { message?: string })?.message ?? String(err)
    return error({ authority: [{ code: "db_error", message }] })
  }
}
