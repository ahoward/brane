//
// claims.ts - shared definitions for claims + the authority registry
//
// Strict about authority, loose about vocabulary: tiers are registered and
// ranked, predicates and assertions are not validated against anything.
// Contradiction is data - competing claims coexist and resolution is a
// read-time projection by rank, never a write-time deletion.
//
// Shared by init.ts (fresh db) and migrate.ts (1.12.0 -> 1.13.0) so a fresh
// database and a migrated one are indistinguishable.
//

import type { CozoDb } from "./cozo"

//
// Cozo string escaping. Local copy rather than importing from mind.ts:
// mind.ts -> migrate.ts -> claims.ts would close an import cycle.
// Cozo uses backslash escapes, NOT SQL-style doubling.
//
function esc_cozo(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'")
}

//
// Relation definitions
//
// claims has no => so all 8 columns are the key: :rm needs the full row.
// id uniqueness is enforced by the allocator, not the schema.
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

//
// The authority registry. rank is joined at read time and never copied onto
// a claim, so re-ranking a tier changes resolution without rewriting claims.
//
export const AUTHORITIES_RELATION = `:create authorities {
  name: String
  =>
  rank: Int,
  description: String
}`

//
// Subject types a claim may be made about.
//
export const SUBJECT_TYPES = ["concept", "edge"] as const
export type SubjectType = typeof SUBJECT_TYPES[number]

export function is_valid_subject_type(t: string): t is SubjectType {
  return (SUBJECT_TYPES as readonly string[]).includes(t)
}

//
// Field caps, measured after trim. All fields are non-empty after trim.
//
export const PREDICATE_MAX_LENGTH = 256
export const ASSERTION_MAX_LENGTH = 4096
export const SOURCE_MAX_LENGTH    = 1024
export const AUTHORITY_NAME_MAX_LENGTH = 64

//
// The five seeded tiers. Higher rank = more authoritative.
//
export interface AuthorityTier {
  name:        string
  rank:        number
  description: string
}

export const DEFAULT_AUTHORITIES: AuthorityTier[] = [
  { name: "observation",    rank: 10,  description: "Recorded from experience; non-binding by default" },
  { name: "implementation", rank: 20,  description: "What the code actually does" },
  { name: "product",        rank: 30,  description: "Product intent" },
  { name: "legal",          rank: 40,  description: "Legal or regulatory constraint" },
  { name: "manual",         rank: 100, description: "Direct human assertion; highest standing" },
]

//
// Built-in Datalog rule. Ships alongside cycles and orphans and carries the
// same [id, name] contract they do, so /mind/rules/query, /mind/verify and
// pr-verify consume it unchanged. Concept subjects only: an edge id would be
// indistinguishable from a concept id in that contract.
//
// It flags every contradiction, including ones that resolve cleanly by rank.
// It reports that the graph disagrees with itself, not who wins.
//
export const CONTRADICTIONS_RULE = {
  name: "contradictions",
  description: "Detects concepts carrying competing claims (contradiction)",
  body: `contradictions[id, name] := *concepts[id, name, _, _, _], *claims[c1, 'concept', id, pred, a1, _, _, _], *claims[c2, 'concept', id, pred, a2, _, _, _], c1 < c2, a1 != a2`,
  builtin: true
}

//
// Seed the five default tiers. Idempotent: authorities is keyed on name.
//
export async function seed_authorities(db: CozoDb): Promise<void> {
  const rows = DEFAULT_AUTHORITIES
    .map(a => `['${esc_cozo(a.name)}', ${a.rank}, '${esc_cozo(a.description)}']`)
    .join(", ")

  await db.run(`
    ?[name, rank, description] <- [${rows}]
    :put authorities { name => rank, description }
  `)
}

//
// Insert the contradictions built-in rule. rules is an all-key relation, so
// :put would duplicate rather than replace - check first.
//
export async function seed_contradictions_rule(db: CozoDb): Promise<void> {
  const existing = await db.run(`
    ?[name] := *rules[name, _, _, _], name = '${CONTRADICTIONS_RULE.name}'
  `)

  if ((existing.rows as unknown[][]).length > 0) return

  await db.run(`
    ?[name, description, body, builtin] <- [['${esc_cozo(CONTRADICTIONS_RULE.name)}', '${esc_cozo(CONTRADICTIONS_RULE.description)}', '${esc_cozo(CONTRADICTIONS_RULE.body)}', ${CONTRADICTIONS_RULE.builtin}]]
    :put rules { name, description, body, builtin }
  `)
}

//
// A claim as stored.
//
export interface ClaimRow {
  id:           number
  subject_type: string
  subject_id:   number
  predicate:    string
  assertion:    string
  authority:    string
  source:       string
  created_at:   string
}

const CLAIM_COLUMNS = "id, subject_type, subject_id, predicate, assertion, authority, source, created_at"

export function row_to_claim(row: unknown[]): ClaimRow {
  return {
    id:           row[0] as number,
    subject_type: row[1] as string,
    subject_id:   row[2] as number,
    predicate:    row[3] as string,
    assertion:    row[4] as string,
    authority:    row[5] as string,
    source:       row[6] as string,
    created_at:   row[7] as string,
  }
}

export function claim_literal(c: ClaimRow): string {
  return `[${c.id}, '${esc_cozo(c.subject_type)}', ${c.subject_id}, '${esc_cozo(c.predicate)}', '${esc_cozo(c.assertion)}', '${esc_cozo(c.authority)}', '${esc_cozo(c.source)}', '${esc_cozo(c.created_at)}']`
}

//
// Read every claim, optionally filtered. Filters are AND-combined.
//
export interface ClaimFilters {
  subject_type?: string | null
  subject_id?:   number | null
  predicate?:    string | null
  authority?:    string | null
}

export async function read_claims(db: CozoDb, f: ClaimFilters = {}): Promise<ClaimRow[]> {
  const conditions: string[] = []

  if (f.subject_type !== undefined && f.subject_type !== null) conditions.push(`subject_type = '${esc_cozo(f.subject_type)}'`)
  if (f.subject_id   !== undefined && f.subject_id   !== null) conditions.push(`subject_id = ${f.subject_id}`)
  if (f.predicate    !== undefined && f.predicate    !== null) conditions.push(`predicate = '${esc_cozo(f.predicate)}'`)
  if (f.authority    !== undefined && f.authority    !== null) conditions.push(`authority = '${esc_cozo(f.authority)}'`)

  const where = conditions.length > 0 ? `, ${conditions.join(", ")}` : ""

  const result = await db.run(`
    ?[${CLAIM_COLUMNS}] := *claims[${CLAIM_COLUMNS}]${where}
  `)

  return (result.rows as unknown[][]).map(row_to_claim)
}

//
// Remove specific claim rows. claims is all-key so :rm needs the full row.
//
export async function remove_claims(db: CozoDb, claims: ClaimRow[]): Promise<number> {
  if (claims.length === 0) return 0

  const rows = claims.map(claim_literal).join(", ")

  await db.run(`
    ?[${CLAIM_COLUMNS}] <- [${rows}]
    :rm claims { ${CLAIM_COLUMNS} }
  `)

  return claims.length
}

//
// The single cascade seam. Every concept and edge removal path - the delete
// handlers, prune, re-extraction - routes through here so no path can forget
// and leave claims outliving what they describe.
//
// Returns the number of claims removed.
//
export async function cascade_claims(db: CozoDb, subject_type: SubjectType, ids: number[]): Promise<number> {
  if (ids.length === 0) return 0

  const wanted = new Set(ids)

  try {
    const rows = await read_claims(db, { subject_type })
    const doomed = rows.filter(c => wanted.has(c.subject_id))
    return await remove_claims(db, doomed)
  } catch {
    // claims relation may not exist yet on an unmigrated db
    return 0
  }
}

//
// The authority registry, read whole. Ranks are looked up at read time.
//
export async function read_authorities(db: CozoDb): Promise<AuthorityTier[]> {
  const result = await db.run(`
    ?[name, rank, description] := *authorities[name, rank, description]
  `)

  return (result.rows as unknown[][]).map(row => ({
    name:        row[0] as string,
    rank:        row[1] as number,
    description: row[2] as string,
  }))
}

export async function get_authority(db: CozoDb, name: string): Promise<AuthorityTier | null> {
  const result = await db.run(`
    ?[name, rank, description] := *authorities[name, rank, description], name = '${esc_cozo(name)}'
  `)

  const rows = result.rows as unknown[][]
  if (rows.length === 0) return null

  return {
    name:        rows[0][0] as string,
    rank:        rows[0][1] as number,
    description: rows[0][2] as string,
  }
}

//
// name -> rank, for joining rank onto claims at read time. A tier that is
// absent from the registry yields rank null: it sorts last and never wins.
//
export async function rank_map(db: CozoDb): Promise<Map<string, number>> {
  const tiers = await read_authorities(db)
  return new Map(tiers.map(t => [t.name, t.rank]))
}

export function rank_of(ranks: Map<string, number>, authority: string): number | null {
  const r = ranks.get(authority)
  return r === undefined ? null : r
}

//
// Next claim id. Sequential handle out of schema_meta, same allocator shape
// annotations and episodes use.
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
// Sort claims by rank descending, then id ascending. Null rank sorts last.
//
export function sort_claims<T extends { id: number; rank: number | null }>(claims: T[]): T[] {
  return claims.slice().sort((a, b) => {
    const ar = a.rank === null ? -Infinity : a.rank
    const br = b.rank === null ? -Infinity : b.rank
    if (ar !== br) return br - ar
    return a.id - b.id
  })
}

//
// Group key for resolution: one group per (subject_type, subject_id, predicate).
//
export function group_key(c: { subject_type: string; subject_id: number; predicate: string }): string {
  return `${c.subject_type} ${c.subject_id} ${c.predicate}`
}

//
// Top-rank claims of an already-sorted group. Claims with a null rank never
// win, so they are excluded from the winning set entirely.
//
export function top_ranked<T extends { rank: number | null }>(sorted: T[]): T[] {
  const ranked = sorted.filter(c => c.rank !== null)
  if (ranked.length === 0) return []
  const top = ranked[0].rank
  return ranked.filter(c => c.rank === top)
}
