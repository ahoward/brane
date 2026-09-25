//
// claims.ts - shared utilities for claims + authority tiers
//
// Claims are first-class, immutable records that attach an assertion to a
// subject (a concept or an edge) with an authority tier and a source.
// Authority rank is joined at READ time from the `authorities` registry —
// it is never copied onto a claim.
//

import type { CozoDb } from "./cozo"

//
// Subject types a claim may be attached to
//

export const CLAIM_SUBJECT_TYPES = ["concept", "edge"] as const
export type ClaimSubjectType = typeof CLAIM_SUBJECT_TYPES[number]

export function is_valid_subject_type(type: string): type is ClaimSubjectType {
  return CLAIM_SUBJECT_TYPES.includes(type as ClaimSubjectType)
}

//
// Field caps (measured after trim)
//

export const CLAIM_PREDICATE_MAX_LENGTH = 256
export const CLAIM_ASSERTION_MAX_LENGTH = 4096
export const CLAIM_SOURCE_MAX_LENGTH    = 1024
export const AUTHORITY_NAME_MAX_LENGTH  = 64

//
// Default list limit
//

export const CLAIM_LIST_DEFAULT_LIMIT = 100

//
// Seeded authority tiers (higher rank = more authoritative)
//

export interface AuthorityTier {
  name:        string
  rank:        number
  description: string
}

export const SEED_AUTHORITIES: AuthorityTier[] = [
  { name: "observation",    rank: 10,  description: "Recorded from experience; non-binding by default" },
  { name: "implementation", rank: 20,  description: "What the code actually does" },
  { name: "product",        rank: 30,  description: "Product intent" },
  { name: "legal",          rank: 40,  description: "Legal or regulatory constraint" },
  { name: "manual",         rank: 100, description: "Direct human assertion; highest standing" }
]

//
// Relation schemas. Shared by /mind/init and by the v1.12.0 -> v1.13.0
// migration so a fresh database and a migrated one are indistinguishable.
//

export const CLAIMS_RELATION_SCHEMA = `:create claims {
  id: Int,
  subject_type: String,
  subject_id: Int,
  predicate: String,
  assertion: String,
  authority: String,
  source: String,
  created_at: String
}`

export const AUTHORITIES_RELATION_SCHEMA = `:create authorities {
  name: String
  =>
  rank: Int,
  description: String
}`

//
// The built-in `contradictions` rule. Concept subjects only: an edge id would
// be indistinguishable from a concept id in the [id, name] contract.
//

export const CONTRADICTIONS_RULE = {
  name:        "contradictions",
  description: "Detects concepts carrying competing claims (contradiction)",
  body:        `contradictions[id, name] := *concepts[id, name, _, _, _], *claims[c1, 'concept', id, pred, a1, _, _, _], *claims[c2, 'concept', id, pred, a2, _, _, _], c1 < c2, a1 != a2`,
  builtin:     true
}

//
// Seed the authority registry and the contradictions rule. Used by both
// /mind/init and the migration.
//

export async function seed_authorities(db: CozoDb): Promise<void> {
  const rows = SEED_AUTHORITIES.map(t => [t.name, t.rank, t.description])
  await db.run(`
    ?[name, rank, description] <- $rows
    :put authorities { name => rank, description }
  `, { rows })
}

export async function seed_contradictions_rule(db: CozoDb): Promise<void> {
  await db.run(`
    ?[name, description, body, builtin] <- [[$name, $description, $body, $builtin]]
    :put rules { name, description, body, builtin }
  `, CONTRADICTIONS_RULE)
}

//
// A claim as stored, plus the rank joined at read time (null when the tier
// is not registered).
//

export interface Claim {
  id:           number
  subject_type: string
  subject_id:   number
  predicate:    string
  assertion:    string
  authority:    string
  source:       string
  created_at:   string
  rank:         number | null
}

export const CLAIM_COLUMNS = "id, subject_type, subject_id, predicate, assertion, authority, source, created_at"

//
// Next claim id (same allocator style as annotations and episodes)
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

  const new_id = next_id + 1
  await db.run(`
    ?[key, value] <- [['claim_next_id', $value]]
    :put schema_meta { key => value }
  `, { value: String(new_id) })

  return next_id
}

//
// Authority registry
//

export async function read_authorities(db: CozoDb): Promise<AuthorityTier[]> {
  const result = await db.run(`
    ?[name, rank, description] := *authorities[name, rank, description]
  `)
  const rows = result.rows as [string, number, string][]
  return rows.map(row => ({ name: row[0], rank: row[1], description: row[2] }))
}

export async function read_authority(db: CozoDb, name: string): Promise<AuthorityTier | null> {
  const result = await db.run(`
    ?[name, rank, description] := *authorities[name, rank, description], name = $name
  `, { name })
  const rows = result.rows as [string, number, string][]
  if (rows.length === 0) return null
  return { name: rows[0][0], rank: rows[0][1], description: rows[0][2] }
}

//
// Rank map for read-time joins. A tier absent from the registry has no entry,
// which reads back as rank null.
//

export async function read_rank_map(db: CozoDb): Promise<Map<string, number>> {
  const tiers = await read_authorities(db)
  const map = new Map<string, number>()
  for (const tier of tiers) {
    map.set(tier.name, tier.rank)
  }
  return map
}

export function rank_of(ranks: Map<string, number>, authority: string): number | null {
  const rank = ranks.get(authority)
  return rank === undefined ? null : rank
}

//
// Subject existence — dispatches on subject_type, never assumes concepts.
//

export async function subject_exists(db: CozoDb, subject_type: string, subject_id: number): Promise<boolean> {
  if (subject_type === "edge") {
    const result = await db.run(`
      ?[id] := *edges[id, _, _, _, _, _], id = $id
    `, { id: subject_id })
    return (result.rows as unknown[][]).length > 0
  }

  const result = await db.run(`
    ?[id] := *concepts[id, _, _, _, _], id = $id
  `, { id: subject_id })
  return (result.rows as unknown[][]).length > 0
}

//
// Read claims with optional AND-combined filters.
// Rank is joined in TypeScript so that unregistered tiers read as null.
//

export interface ClaimFilters {
  subject_type?: string | null
  subject_id?:   number | null
  predicate?:    string | null
  assertion?:    string | null
  authority?:    string | null
  source?:       string | null
  id?:           number | null
}

export async function read_claims(db: CozoDb, filters: ClaimFilters = {}): Promise<Claim[]> {
  const conditions: string[] = []
  const params: Record<string, unknown> = {}

  const bind = (field: string, value: unknown) => {
    conditions.push(`${field} = $${field}`)
    params[field] = value
  }

  if (filters.id !== undefined && filters.id !== null) bind("id", filters.id)
  if (filters.subject_type !== undefined && filters.subject_type !== null) bind("subject_type", filters.subject_type)
  if (filters.subject_id !== undefined && filters.subject_id !== null) bind("subject_id", filters.subject_id)
  if (filters.predicate !== undefined && filters.predicate !== null) bind("predicate", filters.predicate)
  if (filters.assertion !== undefined && filters.assertion !== null) bind("assertion", filters.assertion)
  if (filters.authority !== undefined && filters.authority !== null) bind("authority", filters.authority)
  if (filters.source !== undefined && filters.source !== null) bind("source", filters.source)

  let query = `?[${CLAIM_COLUMNS}] := *claims[${CLAIM_COLUMNS}]`
  if (conditions.length > 0) {
    query += `, ${conditions.join(", ")}`
  }

  const result = await db.run(query, params)
  const rows = result.rows as [number, string, number, string, string, string, string, string][]
  const ranks = await read_rank_map(db)

  return rows.map(row => ({
    id:           row[0],
    subject_type: row[1],
    subject_id:   row[2],
    predicate:    row[3],
    assertion:    row[4],
    authority:    row[5],
    source:       row[6],
    created_at:   row[7],
    rank:         rank_of(ranks, row[5])
  }))
}

//
// Canonical claim ordering: rank descending, then id ascending.
// A null rank sorts last and never wins a resolution.
//

export function compare_claims(a: Claim, b: Claim): number {
  const ra = a.rank === null ? -Infinity : a.rank
  const rb = b.rank === null ? -Infinity : b.rank
  if (ra !== rb) return rb - ra
  return a.id - b.id
}

export function sort_claims(claims: Claim[]): Claim[] {
  return [...claims].sort(compare_claims)
}

//
// Group key for conflict / resolution grouping
//

export function group_key(claim: Claim): string {
  return JSON.stringify([claim.subject_type, claim.subject_id, claim.predicate])
}

export function group_claims(claims: Claim[]): Map<string, Claim[]> {
  const groups = new Map<string, Claim[]>()
  for (const claim of claims) {
    const key = group_key(claim)
    const bucket = groups.get(key)
    if (bucket) {
      bucket.push(claim)
    } else {
      groups.set(key, [claim])
    }
  }
  return groups
}

//
// The winner of a group: the single highest-rank claim.
// Returns null when the top rank is tied between different assertions,
// or when no claim in the group carries a registered rank.
//

export function resolve_group(claims: Claim[]): Claim | null {
  const ranked = claims.filter(c => c.rank !== null)
  if (ranked.length === 0) return null

  const sorted = sort_claims(ranked)
  const top_rank = sorted[0].rank
  const tied = sorted.filter(c => c.rank === top_rank)

  const assertions = new Set(tied.map(c => c.assertion))
  if (assertions.size > 1) return null

  return sorted[0]
}

//
// THE cascade seam.
//
// Every path that removes a concept or an edge must route claim removal
// through this one function so no path can forget. Returns the number of
// claim rows removed.
//

export interface ClaimSubject {
  subject_type: string
  subject_id:   number
}

export async function remove_claims_for_subjects(db: CozoDb, subjects: ClaimSubject[]): Promise<number> {
  if (subjects.length === 0) return 0

  // De-duplicate — the same subject may arrive from several cascade paths
  const seen = new Set<string>()
  const unique: ClaimSubject[] = []
  for (const subject of subjects) {
    const key = `${subject.subject_type}:${subject.subject_id}`
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(subject)
  }

  let removed = 0

  for (const subject of unique) {
    try {
      const rows = await db.run(`
        ?[${CLAIM_COLUMNS}] := *claims[${CLAIM_COLUMNS}], subject_type = $subject_type, subject_id = $subject_id
      `, { subject_type: subject.subject_type, subject_id: subject.subject_id })

      const count = (rows.rows as unknown[][]).length
      if (count === 0) continue

      // claims is an all-key relation — removal needs every column
      await db.run(`
        ?[${CLAIM_COLUMNS}] := *claims[${CLAIM_COLUMNS}], subject_type = $subject_type, subject_id = $subject_id
        :rm claims { ${CLAIM_COLUMNS} }
      `, { subject_type: subject.subject_type, subject_id: subject.subject_id })

      removed += count
    } catch {
      // claims relation may not exist on a pre-1.13.0 database
      return removed
    }
  }

  return removed
}
