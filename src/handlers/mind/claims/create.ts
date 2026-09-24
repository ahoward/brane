//
// create.ts - assert a claim about a concept or edge
//
// Idempotent on the full identity tuple: re-asserting an identical claim
// returns the existing row rather than a duplicate.
//

import type { Params, Result, Emit } from "../../../lib/types.ts"
import { success, error } from "../../../lib/result.ts"
import { open_mind, is_mind_error } from "../../../lib/mind.ts"
import {
  SUBJECT_TYPES,
  is_valid_subject_type,
  CLAIM_MAX_PREDICATE_LENGTH,
  CLAIM_MAX_ASSERTION_LENGTH,
  CLAIM_MAX_SOURCE_LENGTH,
  authority_exists,
  get_authority,
  subject_exists,
  find_claim,
  get_next_claim_id,
  esc
} from "../../../lib/claims.ts"

interface CreateParams {
  subject_type?: string
  subject_id?:   number
  predicate?:    string
  assertion?:    string
  authority?:    string
  source?:       string
}

interface CreateResult {
  id:           number
  subject_type: string
  subject_id:   number
  predicate:    string
  assertion:    string
  authority:    string
  rank:         number | null
  source:       string
  created_at:   string
  created:      boolean
}

//
// Trim, then check. Trimming after the empty check would let "   " through.
//
function normalize(v: string): string {
  return v.trim()
}

export async function handler(params: Params, emit?: Emit): Promise<Result<CreateResult>> {
  const p = (params ?? {}) as CreateParams

  // --- guard: required fields ---

  if (p.subject_type === undefined || p.subject_type === null || p.subject_type === "") {
    return error({ subject_type: [{ code: "required", message: "subject_type is required" }] })
  }

  if (p.subject_id === undefined || p.subject_id === null) {
    return error({ subject_id: [{ code: "required", message: "subject_id is required" }] })
  }

  if (p.predicate === undefined || p.predicate === null || p.predicate === "") {
    return error({ predicate: [{ code: "required", message: "predicate is required" }] })
  }

  if (p.assertion === undefined || p.assertion === null || p.assertion === "") {
    return error({ assertion: [{ code: "required", message: "assertion is required" }] })
  }

  if (p.authority === undefined || p.authority === null || p.authority === "") {
    return error({ authority: [{ code: "required", message: "authority is required" }] })
  }

  if (p.source === undefined || p.source === null || p.source === "") {
    return error({ source: [{ code: "required", message: "source is required" }] })
  }

  // --- guard: subject type is a closed set ---

  const subject_type = normalize(p.subject_type)

  if (!is_valid_subject_type(subject_type)) {
    return error({
      subject_type: [{
        code:    "invalid",
        message: `subject_type must be one of: ${SUBJECT_TYPES.join(", ")}`
      }]
    })
  }

  // --- normalize at the boundary, so every downstream comparison is exact ---

  const predicate = normalize(p.predicate)
  const assertion = normalize(p.assertion)
  const authority = normalize(p.authority)
  const source    = normalize(p.source)

  if (predicate === "") {
    return error({ predicate: [{ code: "invalid", message: "predicate must not be empty" }] })
  }
  if (assertion === "") {
    return error({ assertion: [{ code: "invalid", message: "assertion must not be empty" }] })
  }
  if (authority === "") {
    return error({ authority: [{ code: "invalid", message: "authority must not be empty" }] })
  }
  if (source === "") {
    return error({ source: [{ code: "invalid", message: "source must not be empty" }] })
  }

  if (predicate.length > CLAIM_MAX_PREDICATE_LENGTH) {
    return error({
      predicate: [{ code: "invalid", message: `predicate exceeds ${CLAIM_MAX_PREDICATE_LENGTH} characters` }]
    })
  }
  if (assertion.length > CLAIM_MAX_ASSERTION_LENGTH) {
    return error({
      assertion: [{ code: "invalid", message: `assertion exceeds ${CLAIM_MAX_ASSERTION_LENGTH} characters` }]
    })
  }
  if (source.length > CLAIM_MAX_SOURCE_LENGTH) {
    return error({
      source: [{ code: "invalid", message: `source exceeds ${CLAIM_MAX_SOURCE_LENGTH} characters` }]
    })
  }

  const mind = await open_mind()

  if (is_mind_error(mind)) {
    return error({ mind: [{ code: mind.code, message: mind.message }] })
  }

  const { db } = mind

  try {
    // --- guard: the subject exists ---

    if (!await subject_exists(db, subject_type, p.subject_id)) {
      db.close()
      return error({
        subject_id: [{ code: "not_found", message: `${subject_type} not found: ${p.subject_id}` }]
      })
    }

    // --- guard: strict about authority ---

    if (!await authority_exists(db, authority)) {
      db.close()
      return error({
        authority: [{ code: "not_found", message: `authority tier not registered: ${authority}` }]
      })
    }

    const tuple = {
      subject_type: subject_type,
      subject_id:   p.subject_id,
      predicate:    predicate,
      assertion:    assertion,
      authority:    authority,
      source:       source
    }

    const tier = await get_authority(db, authority)

    // --- idempotent: the same assertion from the same source under the same
    // authority is one claim, not two ---

    const existing = await find_claim(db, tuple)

    if (existing) {
      db.close()
      return success({
        ...tuple,
        id:         existing.id,
        rank:       tier ? tier.rank : null,
        created_at: existing.created_at,
        created:    false
      })
    }

    const id         = await get_next_claim_id(db)
    const created_at = new Date().toISOString()

    await db.run(`
      ?[id, subject_type, subject_id, predicate, assertion, authority, source, created_at] <- [[
        ${id},
        '${esc(subject_type)}',
        ${p.subject_id},
        '${esc(predicate)}',
        '${esc(assertion)}',
        '${esc(authority)}',
        '${esc(source)}',
        '${esc(created_at)}'
      ]]
      :put claims { id, subject_type, subject_id, predicate, assertion, authority, source, created_at }
    `)

    db.close()

    return success({
      ...tuple,
      id:         id,
      rank:       tier ? tier.rank : null,
      created_at: created_at,
      created:    true
    })
  } catch (err) {
    db.close()
    const message = err instanceof Error ? err.message : (err as { message?: string })?.message ?? String(err)
    return error({ claim: [{ code: "db_error", message }] })
  }
}
