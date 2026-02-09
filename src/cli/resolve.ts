//
// resolve.ts - resolve concept references (name or ID) to numeric IDs
//

import { sys } from "../index.ts"

/**
 * Takes a string that is either a numeric ID or a concept name.
 * Returns the numeric concept ID, or null if not found.
 */
export async function resolve_concept_ref(ref: string): Promise<number | null> {
  // If it's a plain integer, return it directly
  const n = parseInt(ref, 10)
  if (!isNaN(n) && String(n) === ref.trim()) {
    return n
  }

  // Otherwise, look up by name
  const result = await sys.call("/mind/concepts/list", {})

  if (result.status !== "success" || !result.result) {
    return null
  }

  const data = result.result as {
    concepts: Array<{ id: number; name: string; type: string }>
  }

  const match = data.concepts.find(
    (c) => c.name === ref
  )

  return match ? match.id : null
}
