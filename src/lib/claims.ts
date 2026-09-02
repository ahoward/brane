//
// claims.ts - first-class claims carrying authority (#113)
//
// A claim is an assertion about a concept or edge, made under a registered
// authority tier, from a source. Competing claims coexist; resolution is a
// read-time projection, never a write-time deletion.
//

import type { CozoDb } from "./cozo"
import { esc_cozo as esc } from "./mind.ts"

//
// Subject types a claim can attach to
//
export const SUBJECT_TYPES = ["concept", "edge"] as const
export type SubjectType = typeof SUBJECT_TYPES[number]

export function is_valid_subject_type(t: string): t is SubjectType {
  return (SUBJECT_TYPES as readonly string[]).includes(t)
}

//
// Field caps. 4096 matches ANNOTATION_MAX_TEXT_LENGTH - same discipline.
//
export const CLAIM_MAX_PREDICATE_LENGTH = 256
export const CLAIM_MAX_ASSERTION_LENGTH = 4096
export const CLAIM_MAX_SOURCE_LENGTH    = 1024
export const AUTHORITY_MAX_NAME_LENGTH  = 64

//
// Seeded authority tiers. Steps of 10 so a project can insert its own
// (security at 35, say) without renumbering. `manual` at 100 mirrors the
// `infinity` authority annotations carry.
//
export const DEFAULT_AUTHORITIES: { name: string; rank: number; description: string }[] = [
  { name: "observation",    rank: 10,  description: "Recorded from experience; non-binding by default" },
  { name: "implementation", rank: 20,  description: "What the code actually does" },
  { name: "product",        rank: 30,  description: "Product intent" },
  { name: "legal",          rank: 40,  description: "Legal or regulatory constraint" },
  { name: "manual",         rank: 100, description: "Direct human assertion; highest standing" }
]

//
// The built-in contradictions rule. Defined here so init.ts and migrate.ts
// cannot drift - a fresh v1.13.0 db and a migrated one must be identical.
//
// Positionally matches the 8-column claims relation. A future column (#114's
// binding flag) MUST update this body in the same migration.
//
// Concept subjects only: the [id, name] rule contract cannot distinguish an
// edge id from a concept id. Edge contradictions surface via /mind/claims/conflicts.
//
export const CONTRADICTIONS_RULE = {
  name:        "contradictions",
  description: "Detects concepts carrying competing claims (contradiction)",
  body: `contradictions[id, name] :=
  *concepts[id, name, _, _, _],
  *claims[c1, 'concept', id, pred, a1, _, _, _],
  *claims[c2, 'concept', id, pred, a2, _, _, _],
  c1 < c2,
  a1 != a2`,
  builtin: true
}

//
// Relation definitions, shared by init and migrate
//
export const CLAIMS_RELATION = `:create claims {
    id: Int,
    subject_type: String,
    subject_id: Int,
    predicate: String,
    assertion: String,
    authority: String,
    source: String,
    created_at: String
  }`

export const AUTHORITIES_RELATION = `:create authorities {
    name: String
    =>
    rank: Int,
    description: String
  }`

//
// POD shapes
//

export interface Claim {
  id:           number
  subject_type: string
  subject_id:   number
  predicate:    string
  assertion:    string
  authority:    string
  rank:         number | null
  source:       string
  created_at:   string
}

export interface Authority {
  name:        string
  rank:        number
  description: string
}

export interface GroupClaim {
  id:         number
  assertion:  string
  authority:  string
  rank:       number | null
  source:     string
  created_at: string
}

export interface ConflictGroup {
  subject_type: string
  subject_id:   number
  predicate:    string
  claims:       GroupClaim[]
  resolution:   { id: number; assertion: string; authority: string; rank: number } | null
  unresolved:   boolean
}

//
// escape a string for a single-quoted Cozo literal
//
export { esc }

//
// Seed the authority registry. Used by init and by the v1.13.0 migration.
//
export async function seed_authorities(db: CozoDb): Promise<void> {
  const rows = DEFAULT_AUTHORITIES
    .map(a => `['${esc(a.name)}', ${a.rank}, '${esc(a.description)}']`)
    .join(", ")

  await db.run(`
    ?[name, rank, description] <- [${rows}]
    :put authorities { name => rank, description }
  `)
}

//
// Seed the contradictions built-in rule. Used by init and by the migration.
//
export async function seed_contradictions_rule(db: CozoDb): Promise<void> {
  const r = CONTRADICTIONS_RULE
  await db.run(`
    ?[name, description, body, builtin] <- [["${r.name}", "${r.description}", "${r.body}", true]]
    :put rules { name, description, body, builtin }
  `)
}

//
// Next claim ID (auto-increment, same counter pattern as annotations/episodes)
//
export async function get_next_claim_id(db: CozoDb): Promise<number> {
  const result = await db.run(`
    ?[value] := *schema_meta['claim_next_id', value]
  `)

  const rows = result.rows as string[][]
  let next_id = 1

  if (rows.length > 0) {
    next_id = parseInt(rows[0][0], 10)
  }

  await db.run(`
    ?[key, value] <- [['claim_next_id', '${next_id + 1}']]
    :put schema_meta { key => value }
  `)

  return next_id
}

//
// Authority registry lookups
//

export async function authority_exists(db: CozoDb, name: string): Promise<boolean> {
  const result = await db.run(`
    ?[rank] := *authorities['${esc(name)}', rank, _]
  `)
  return (result.rows as unknown[][]).length > 0
}

export async function get_authority(db: CozoDb, name: string): Promise<Authority | null> {
  const result = await db.run(`
    ?[rank, description] := *authorities['${esc(name)}', rank, description]
  `)
  const rows = result.rows as [number, string][]
  if (rows.length === 0) return null
  return { name, rank: rows[0][0], description: rows[0][1] }
}

export async function get_authorities(db: CozoDb): Promise<Authority[]> {
  const result = await db.run(`
    ?[name, rank, description] := *authorities[name, rank, description]
  `)
  const rows = result.rows as [string, number, string][]

  return rows
    .map(([name, rank, description]) => ({ name, rank, description }))
    .sort((a, b) => b.rank - a.rank || a.name.localeCompare(b.name))
}

//
// Count claims referencing an authority tier
//
export async function count_claims_for_authority(db: CozoDb, name: string): Promise<number> {
  const result = await db.run(`
    ?[count(id)] := *claims[id, _, _, _, _, '${esc(name)}', _, _]
  `)
  const rows = result.rows as number[][]
  return rows[0]?.[0] ?? 0
}

//
// Does the subject exist? Dispatches on subject_type - validating everything
// against concepts would silently accept any edge id.
//
export async function subject_exists(db: CozoDb, subject_type: string, subject_id: number): Promise<boolean> {
  const query = subject_type === "edge"
    ? `?[id] := *edges[id, _, _, _, _, _], id = ${subject_id}`
    : `?[id] := *concepts[id, _, _, _, _], id = ${subject_id}`

  const result = await db.run(query)
  return (result.rows as unknown[][]).length > 0
}

//
// The idempotency tuple. Compared on stored (trimmed) values.
// `source` is part of the identity: the same assertion from two sources is
// corroboration, and both are kept.
//
export interface ClaimTuple {
  subject_type: string
  subject_id:   number
  predicate:    string
  assertion:    string
  authority:    string
  source:       string
}

export async function find_claim(db: CozoDb, t: ClaimTuple): Promise<{ id: number; created_at: string } | null> {
  const result = await db.run(`
    ?[id, created_at] := *claims[
      id,
      '${esc(t.subject_type)}',
      ${t.subject_id},
      '${esc(t.predicate)}',
      '${esc(t.assertion)}',
      '${esc(t.authority)}',
      '${esc(t.source)}',
      created_at
    ]
  `)
  const rows = result.rows as [number, string][]
  if (rows.length === 0) return null
  return { id: rows[0][0], created_at: rows[0][1] }
}

//
// Fetch claims joined to authority rank. Rank is looked up here, never stored
// on the claim - so re-ranking a tier changes resolution without a rewrite.
//
export interface ClaimFilters {
  id?:           number
  subject_type?: string
  subject_id?:   number
  predicate?:    string
  authority?:    string
}

export async function fetch_claims_with_rank(db: CozoDb, f: ClaimFilters = {}): Promise<Claim[]> {
  const conditions: string[] = []

  if (f.id !== undefined)           conditions.push(`id = ${f.id}`)
  if (f.subject_type !== undefined) conditions.push(`subject_type = '${esc(f.subject_type)}'`)
  if (f.subject_id !== undefined)   conditions.push(`subject_id = ${f.subject_id}`)
  if (f.predicate !== undefined)    conditions.push(`predicate = '${esc(f.predicate)}'`)
  if (f.authority !== undefined)    conditions.push(`authority = '${esc(f.authority)}'`)

  const where = conditions.length > 0 ? ", " + conditions.join(", ") : ""

  const result = await db.run(`
    ?[id, subject_type, subject_id, predicate, assertion, authority, source, created_at] :=
      *claims[id, subject_type, subject_id, predicate, assertion, authority, source, created_at]${where}
  `)

  const rows = result.rows as [number, string, number, string, string, string, string, string][]

  // rank comes from the registry, not the row
  const ranks = new Map<string, number>()
  for (const a of await get_authorities(db)) {
    ranks.set(a.name, a.rank)
  }

  const claims: Claim[] = rows.map(r => ({
    id:           r[0],
    subject_type: r[1],
    subject_id:   r[2],
    predicate:    r[3],
    assertion:    r[4],
    authority:    r[5],
    rank:         ranks.has(r[5]) ? ranks.get(r[5])! : null,
    source:       r[6],
    created_at:   r[7]
  }))

  return sort_claims(claims)
}

//
// rank descending, then id ascending. A claim whose tier vanished sorts last
// and never wins a resolution.
//
export function sort_claims<T extends { rank: number | null; id: number }>(claims: T[]): T[] {
  return claims.sort((a, b) => {
    const ra = a.rank ?? -1
    const rb = b.rank ?? -1
    return rb - ra || a.id - b.id
  })
}

function group_key(c: Claim): string {
  return `${c.subject_type} ${c.subject_id} ${c.predicate}`
}

function strip(c: Claim): GroupClaim {
  return {
    id:         c.id,
    assertion:  c.assertion,
    authority:  c.authority,
    rank:       c.rank,
    source:     c.source,
    created_at: c.created_at
  }
}

//
// Group claims by subject+predicate and decide resolution.
//
// A group is a CONFLICT when it holds two or more distinct assertions. Same
// assertion from two authorities is agreement, not conflict.
//
// A tie at the top rank between different assertions does NOT resolve. No
// tiebreak by recency or id - the disagreement stands until a human settles it.
//
export function group_conflicts(claims: Claim[], conflicts_only = true): ConflictGroup[] {
  const groups = new Map<string, Claim[]>()

  for (const c of claims) {
    const k = group_key(c)
    const list = groups.get(k) ?? []
    list.push(c)
    groups.set(k, list)
  }

  const out: ConflictGroup[] = []

  for (const list of groups.values()) {
    const sorted = sort_claims(list.slice())
    const distinct = new Set(sorted.map(c => c.assertion))

    if (conflicts_only && distinct.size < 2) continue

    const top = sorted[0]
    const top_rank = top.rank ?? -1
    const tied = sorted.filter(c => (c.rank ?? -1) === top_rank)
    const unresolved = new Set(tied.map(c => c.assertion)).size > 1

    out.push({
      subject_type: top.subject_type,
      subject_id:   top.subject_id,
      predicate:    top.predicate,
      claims:       sorted.map(strip),
      resolution:   unresolved
        ? null
        : { id: top.id, assertion: top.assertion, authority: top.authority, rank: top_rank },
      unresolved:   unresolved
    })
  }

  // subject_type asc, subject_id asc, predicate asc
  return out.sort((a, b) =>
    a.subject_type.localeCompare(b.subject_type) ||
    a.subject_id - b.subject_id ||
    a.predicate.localeCompare(b.predicate)
  )
}

//
// Resolve: one claim per subject+predicate group - the highest-rank one, or
// every claim tied at the top when the tie is unresolved. Reads only.
//
export function resolve_claims(claims: Claim[]): Claim[] {
  const groups = new Map<string, Claim[]>()

  for (const c of claims) {
    const k = group_key(c)
    const list = groups.get(k) ?? []
    list.push(c)
    groups.set(k, list)
  }

  const out: Claim[] = []

  for (const list of groups.values()) {
    const sorted = sort_claims(list.slice())
    const top_rank = sorted[0].rank ?? -1
    const tied = sorted.filter(c => (c.rank ?? -1) === top_rank)
    const distinct = new Set(tied.map(c => c.assertion))

    // a tie between different assertions returns all of them; agreement collapses to one
    out.push(...(distinct.size > 1 ? tied : [sorted[0]]))
  }

  return sort_claims(out)
}

//
// Remove every claim attached to these subjects. One function, called from
// every deletion path - concepts/delete, edges/delete, prune, re-extraction -
// so no path can forget and leave a claim outliving its subject.
//
// claims is an all-key relation, so :rm needs the full row: read, then remove.
//
export async function cascade_claims(db: CozoDb, subject_type: string, ids: number[]): Promise<number> {
  if (ids.length === 0) return 0

  try {
    const id_list = ids.join(", ")
    const match = `*claims[id, subject_type, subject_id, predicate, assertion, authority, source, created_at],
        subject_type = '${esc(subject_type)}',
        subject_id in [${id_list}]`

    const result = await db.run(`
      ?[id, subject_type, subject_id, predicate, assertion, authority, source, created_at] := ${match}
    `)

    const rows = result.rows as unknown[][]
    if (rows.length === 0) return 0

    await db.run(`
      ?[id, subject_type, subject_id, predicate, assertion, authority, source, created_at] := ${match}
      :rm claims { id, subject_type, subject_id, predicate, assertion, authority, source, created_at }
    `)

    return rows.length
  } catch {
    // claims relation may not exist yet on an un-migrated db
    return 0
  }
}
