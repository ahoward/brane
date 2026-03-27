//
// rebuild.ts - re-extract all sources through current lenses
//
// Lists all previously digested sources, clears their digest records,
// and re-processes each through the current digest pipeline (with
// active lens prompts). Sources that are no longer accessible are skipped.
//

import type { Params, Result, Emit } from "../../lib/types.ts"
import { success, error } from "../../lib/result.ts"
import { open_state } from "../../lib/state.ts"
import { sys } from "../../index.ts"

interface RebuildParams {
  lens?:     string    // override lens prompt for rebuild
  agent_id?: string
  dry_run?:  boolean
}

interface RebuildSourceResult {
  label:    string
  status:   "rebuilt" | "skipped" | "failed"
  reason?:  string
}

interface RebuildResult {
  sources_total:   number
  sources_rebuilt:  number
  sources_skipped:  number
  sources_failed:   number
  details:          RebuildSourceResult[]
  dry_run:          boolean
}

function ensure_digest_table(db: ReturnType<typeof open_state>): void {
  if (!db) return
  db.run(`
    CREATE TABLE IF NOT EXISTS digested_sources (
      hash         TEXT PRIMARY KEY,
      label        TEXT NOT NULL,
      digested_at  TEXT NOT NULL,
      concepts     INTEGER NOT NULL,
      edges        INTEGER NOT NULL,
      episodes     INTEGER NOT NULL
    )
  `)
}

export async function handler(params: Params, emit?: Emit): Promise<Result<RebuildResult>> {
  const p = (params ?? {}) as RebuildParams

  const dry_run = p.dry_run === true
  const agent_id = typeof p.agent_id === "string" && p.agent_id.trim() ? p.agent_id.trim() : "cli"
  const lens = typeof p.lens === "string" && p.lens.trim() ? p.lens.trim() : undefined

  // Open state.db to read digested sources
  const db = open_state()
  if (!db) {
    return error({ state: [{ code: "not_initialized", message: "state.db not found (run brane init)" }] })
  }

  ensure_digest_table(db)

  // Get all digested sources ordered chronologically
  const rows = db.query(
    "SELECT hash, label, digested_at, concepts, edges, episodes FROM digested_sources ORDER BY digested_at ASC"
  ).all() as { hash: string; label: string; digested_at: string; concepts: number; edges: number; episodes: number }[]

  if (rows.length === 0) {
    db.close()
    return success({
      sources_total: 0,
      sources_rebuilt: 0,
      sources_skipped: 0,
      sources_failed: 0,
      details: [],
      dry_run,
    })
  }

  if (dry_run) {
    db.close()
    const total_concepts = rows.reduce((s, r) => s + r.concepts, 0)
    const total_edges = rows.reduce((s, r) => s + r.edges, 0)
    const total_episodes = rows.reduce((s, r) => s + r.episodes, 0)

    emit?.("progress", {
      phase: "dry_run",
      sources: rows.length,
      concepts: total_concepts,
      edges: total_edges,
      episodes: total_episodes,
    })

    return success({
      sources_total: rows.length,
      sources_rebuilt: 0,
      sources_skipped: 0,
      sources_failed: 0,
      details: rows.map(r => ({
        label: r.label,
        status: "skipped" as const,
        reason: `would rebuild (${r.concepts}c/${r.edges}e/${r.episodes}ep)`,
      })),
      dry_run,
    })
  }

  // Clear all digest records so they get re-processed
  emit?.("progress", { phase: "clearing", sources: rows.length })
  db.run("DELETE FROM digested_sources")
  db.close()

  // Re-digest each source chronologically
  const details: RebuildSourceResult[] = []
  let rebuilt = 0
  let skipped = 0
  let failed = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    emit?.("progress", {
      phase: "rebuilding",
      current: i + 1,
      total: rows.length,
      label: row.label,
    })

    // Skip stdin sources (can't re-load)
    if (row.label === "stdin" || row.label === "-") {
      details.push({ label: row.label, status: "skipped", reason: "stdin not re-loadable" })
      skipped++
      continue
    }

    // Re-digest through the current pipeline
    const digest_params: Record<string, unknown> = {
      source: row.label,
      agent_id,
    }
    if (lens) digest_params.lens = lens

    const result = await sys.call("/calabi/digest", digest_params)

    if (result.status === "success") {
      details.push({ label: row.label, status: "rebuilt" })
      rebuilt++
    } else {
      const err_msg = result.errors
        ? JSON.stringify(result.errors).slice(0, 100)
        : "unknown error"
      details.push({ label: row.label, status: "failed", reason: err_msg })
      failed++
    }
  }

  return success({
    sources_total: rows.length,
    sources_rebuilt: rebuilt,
    sources_skipped: skipped,
    sources_failed: failed,
    details,
    dry_run,
  })
}
