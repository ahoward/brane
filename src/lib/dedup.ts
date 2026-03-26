//
// dedup.ts - fuzzy concept deduplication
//
// Normalizes concept names and checks for fuzzy matches
// to prevent graph fragmentation from naming variations.
//

import type { CozoDb } from "./cozo"

//
// Normalize a concept name to a canonical form.
//
// AuthMiddleware, auth_middleware, auth-middleware, Auth Middleware
// all normalize to: auth_middleware
//
export function normalize_concept_name(name: string): string {
  return name
    // Insert underscore between lowercase→uppercase (camelCase/PascalCase)
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    // Insert underscore between uppercase letter and uppercase+lowercase (e.g. "APIGateway" → "API_Gateway")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    // Replace dashes, spaces, dots with underscores
    .replace(/[-\s.]+/g, "_")
    // Lowercase
    .toLowerCase()
    // Collapse multiple underscores
    .replace(/_+/g, "_")
    // Trim leading/trailing underscores
    .replace(/^_|_$/g, "")
}

//
// Levenshtein distance between two strings.
// Used as fallback when normalization doesn't produce an exact match.
//
export function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length

  if (m === 0) return n
  if (n === 0) return m

  // Use single-row optimization
  let prev = new Array(n + 1)
  let curr = new Array(n + 1)

  for (let j = 0; j <= n; j++) prev[j] = j

  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(
        curr[j - 1] + 1,     // insert
        prev[j] + 1,         // delete
        prev[j - 1] + cost   // substitute
      )
    }
    ;[prev, curr] = [curr, prev]
  }

  return prev[n]
}

//
// Match result from fuzzy dedup
//
export interface DeduplicateMatch {
  id:         number
  name:       string
  type:       string
  match_type: "exact" | "normalized" | "fuzzy"
}

//
// Default max Levenshtein distance for fuzzy matching
//
const DEFAULT_MAX_DISTANCE = 3

//
// Compute effective max distance scaled by name length.
// Prevents false positives on short/similar names.
//
// Only allows fuzzy matching for names with 10+ normalized characters.
// Then: 1 allowed edit per 10 characters.
//
//   len 0-9:   0 (no fuzzy — exact/normalized only)
//   len 10-19: 1
//   len 20-29: 2
//   len 30+:   3 (capped at max_distance)
//
// This prevents "ModuleA" ↔ "ModuleB" false matches (8 chars → 0)
// while allowing "AuthMiddlewar" → "AuthMiddleware" (15 chars → 1).
//
function effective_max_distance(normalized_name: string, max_distance: number): number {
  const len = normalized_name.length
  const scaled = Math.floor(len / 10)
  return Math.min(scaled, max_distance)
}

//
// Find a fuzzy match for a concept name against existing concepts in the DB.
// Returns the matching concept or null if no match found.
//
// Match precedence:
// 1. Exact case-insensitive match
// 2. Normalized form match (camelCase vs snake_case etc.)
// 3. Levenshtein distance on normalized forms (typos)
//
export async function find_fuzzy_match(
  db: CozoDb,
  name: string,
  max_distance: number = DEFAULT_MAX_DISTANCE
): Promise<DeduplicateMatch | null> {
  // Get all existing concepts (name + id + type)
  const result = await db.run(`
    ?[id, name, type] := *concepts[id, name, type, _]
  `)
  const rows = result.rows as [number, string, string][]

  if (rows.length === 0) return null

  const candidate_normalized = normalize_concept_name(name)
  const candidate_lower = name.toLowerCase()

  // Pass 1: exact case-insensitive
  for (const [id, existing_name, type] of rows) {
    if (existing_name.toLowerCase() === candidate_lower) {
      return { id, name: existing_name, type, match_type: "exact" }
    }
  }

  // Pass 2: normalized form match
  for (const [id, existing_name, type] of rows) {
    if (normalize_concept_name(existing_name) === candidate_normalized) {
      return { id, name: existing_name, type, match_type: "normalized" }
    }
  }

  // Pass 3: Levenshtein on normalized forms (skip for short names)
  const eff_dist = effective_max_distance(candidate_normalized, max_distance)
  if (eff_dist === 0) return null  // too short for fuzzy matching

  let best_match: DeduplicateMatch | null = null
  let best_distance = eff_dist + 1

  for (const [id, existing_name, type] of rows) {
    const existing_normalized = normalize_concept_name(existing_name)
    const dist = levenshtein(candidate_normalized, existing_normalized)
    if (dist <= eff_dist && dist < best_distance) {
      best_distance = dist
      best_match = { id, name: existing_name, type, match_type: "fuzzy" }
    }
  }

  return best_match
}

//
// Find fuzzy match against an in-memory list (for batch dedup within a single create-many call).
//
export function find_fuzzy_match_in_batch(
  name: string,
  batch: Array<{ id: number; name: string; type: string }>,
  max_distance: number = DEFAULT_MAX_DISTANCE
): DeduplicateMatch | null {
  const candidate_normalized = normalize_concept_name(name)
  const candidate_lower = name.toLowerCase()

  // Pass 1: exact
  for (const item of batch) {
    if (item.name.toLowerCase() === candidate_lower) {
      return { ...item, match_type: "exact" }
    }
  }

  // Pass 2: normalized
  for (const item of batch) {
    if (normalize_concept_name(item.name) === candidate_normalized) {
      return { ...item, match_type: "normalized" }
    }
  }

  // Pass 3: levenshtein (skip for short names)
  const eff_dist = effective_max_distance(candidate_normalized, max_distance)
  if (eff_dist === 0) return null  // too short for fuzzy matching

  let best_match: DeduplicateMatch | null = null
  let best_distance = eff_dist + 1

  for (const item of batch) {
    const dist = levenshtein(candidate_normalized, normalize_concept_name(item.name))
    if (dist <= eff_dist && dist < best_distance) {
      best_distance = dist
      best_match = { ...item, match_type: "fuzzy" }
    }
  }

  return best_match
}
