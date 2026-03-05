//
// coverage.ts — compute extraction coverage from sentinels vs graph concepts
//

import type { Sentinel, CoverageReport } from "./ast/types.ts"

export function compute_coverage(
  file_url: string,
  sentinels: Sentinel[],
  concept_names: string[]
): CoverageReport {
  if (sentinels.length === 0) {
    return {
      file_url,
      total_sentinels: 0,
      matched_sentinels: 0,
      coverage_pct: 100,
      missing: [],
    }
  }

  const name_set = new Set(concept_names.map(n => n.toLowerCase()))
  const missing: string[] = []
  let matched = 0

  for (const sentinel of sentinels) {
    if (name_set.has(sentinel.name.toLowerCase())) {
      matched++
    } else {
      missing.push(sentinel.name)
    }
  }

  const coverage_pct = Math.round((matched / sentinels.length) * 100)

  return {
    file_url,
    total_sentinels: sentinels.length,
    matched_sentinels: matched,
    coverage_pct,
    missing,
  }
}
