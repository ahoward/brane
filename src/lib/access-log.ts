//
// access-log.ts - in-memory accumulator for concept access tracking
//
// Batches access events to avoid write-on-read in search hot paths.
// Flushes to CozoDB concept_access relation periodically or on demand.
//

import { open_mind, is_mind_error } from "./mind.ts"

//
// In-memory accumulator: concept_id → access_count_delta
//
const access_log: Map<number, number> = new Map()
let last_flush_ms = Date.now()
let is_flushing = false

const FLUSH_SIZE_THRESHOLD = 100       // flush when accumulator has this many entries
const FLUSH_TIME_THRESHOLD_MS = 60_000 // flush when 60s since last flush

//
// Log access to concept IDs. Called from search/query handlers.
// No database writes — just accumulates in memory.
//
export function log_access(concept_ids: number[]): void {
  for (const id of concept_ids) {
    access_log.set(id, (access_log.get(id) ?? 0) + 1)
  }

  // Auto-flush on size threshold (skip if already flushing)
  if (!is_flushing && access_log.size >= FLUSH_SIZE_THRESHOLD) {
    flush_access_log().catch(() => {})
  }
}

//
// Check if a time-based flush is needed. Call this periodically (e.g., after each tool call).
//
export function maybe_flush(): void {
  if (!is_flushing && access_log.size > 0 && (Date.now() - last_flush_ms) > FLUSH_TIME_THRESHOLD_MS) {
    flush_access_log().catch(() => {})
  }
}

//
// Restore snapshot data back into the accumulator on flush failure.
//
function restore_snapshot(snapshot: Map<number, number>): void {
  for (const [id, delta] of snapshot) {
    access_log.set(id, (access_log.get(id) ?? 0) + delta)
  }
}

//
// Flush accumulated access counts to mind.db.
// Uses CozoDB :put to batch-increment access_count and set last_accessed.
//
export async function flush_access_log(): Promise<{ flushed: number }> {
  if (access_log.size === 0 || is_flushing) return { flushed: 0 }

  is_flushing = true

  // Snapshot and clear the accumulator atomically (synchronous)
  const snapshot = new Map(access_log)
  access_log.clear()
  last_flush_ms = Date.now()

  const mind = await open_mind()
  if (is_mind_error(mind)) {
    restore_snapshot(snapshot)
    is_flushing = false
    return { flushed: 0 }
  }

  const now = new Date().toISOString()
  const ids = [...snapshot.keys()]

  try {
    // Read current access counts for the IDs we're updating
    const current = await mind.db.run(`
      ?[concept_id, access_count, last_accessed] := *concept_access[concept_id, access_count, last_accessed], concept_id in [${ids.join(", ")}]
    `)

    // Build map of current values
    const current_map = new Map<number, { count: number; last: string }>()
    for (const row of current.rows as [number, number, string][]) {
      current_map.set(row[0], { count: row[1], last: row[2] })
    }

    // Build update rows: increment access_count, update last_accessed
    const rows = ids.map(id => {
      const delta = snapshot.get(id) ?? 0
      const existing = current_map.get(id)
      const new_count = (existing?.count ?? 0) + delta
      return `[${id}, ${new_count}, '${now}']`
    }).join(", ")

    await mind.db.run(`
      ?[concept_id, access_count, last_accessed] <- [${rows}]
      :put concept_access { concept_id => access_count, last_accessed }
    `)

    mind.db.close()
    is_flushing = false
    return { flushed: snapshot.size }
  } catch {
    restore_snapshot(snapshot)
    mind.db.close()
    is_flushing = false
    return { flushed: 0 }
  }
}

//
// Get accumulator size (for diagnostics).
//
export function get_access_log_size(): number {
  return access_log.size
}

//
// Register process exit handler to flush on shutdown.
// Uses async cleanup for SIGINT/SIGTERM (where event loop is still running).
// No listener on "exit" — async ops can't complete in exit handlers.
//
let exit_registered = false

export function auto_flush_on_exit(): void {
  if (exit_registered) return  // prevent duplicate listeners
  exit_registered = true

  const cleanup = async (exit_code: number) => {
    await flush_access_log().catch(() => {})
    process.exit(exit_code)
  }

  process.on("SIGINT", () => { cleanup(130) })
  process.on("SIGTERM", () => { cleanup(143) })
}
