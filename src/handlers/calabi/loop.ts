//
// loop.ts - autonomous goal-directed research
//
// Cycle: reflect → search → fetch → digest → journal → repeat
// Stops on convergence or max rounds. State persists for resume.
//

import type { Params, Result, Emit } from "../../lib/types.ts"
import { success, error } from "../../lib/result.ts"
import { reflect_on_goal } from "../../lib/llm/loop.ts"
import { web_search } from "../../lib/web-search.ts"
import { consume_llm_call } from "../../lib/rate-limit.ts"
import { is_mock_mode } from "../../lib/llm/index.ts"
import { get_active_lens_prompts, open_state } from "../../lib/state.ts"
import { sys } from "../../index.ts"
import { randomUUID } from "node:crypto"

interface LoopParams {
  goal?:      string
  rounds?:    number     // max rounds (default 5)
  resume?:    string     // loop ID to resume
  agent_id?:  string
  dry_run?:   boolean
}

interface LoopRound {
  round:            number
  assessment:       string
  gaps:             string[]
  queries_searched: string[]
  urls_fetched:     string[]
  sources_digested: number
  converging:       boolean
}

interface LoopState {
  id:               string
  goal:             string
  status:           "running" | "converged" | "paused" | "max_rounds"
  rounds_completed: number
  max_rounds:       number
  search_history:   string[]
  url_history:      string[]
  created_at:       string
  updated_at:       string
}

interface LoopResult {
  id:                string
  goal:              string
  status:            string
  rounds_completed:  number
  rounds:            LoopRound[]
  dry_run:           boolean
}

//
// State persistence in state.db
//

function ensure_loop_table(db: ReturnType<typeof open_state>): void {
  if (!db) return
  db.exec(`
    CREATE TABLE IF NOT EXISTS loops (
      id              TEXT PRIMARY KEY,
      goal            TEXT NOT NULL,
      status          TEXT NOT NULL DEFAULT 'running',
      rounds_completed INTEGER NOT NULL DEFAULT 0,
      max_rounds      INTEGER NOT NULL DEFAULT 5,
      search_history  TEXT NOT NULL DEFAULT '[]',
      url_history     TEXT NOT NULL DEFAULT '[]',
      created_at      TEXT NOT NULL,
      updated_at      TEXT NOT NULL
    )
  `)
}

function load_loop(db: ReturnType<typeof open_state>, id: string): LoopState | null {
  if (!db) return null
  const row = db.query("SELECT * FROM loops WHERE id = ?").get(id) as any
  if (!row) return null
  return {
    ...row,
    search_history: JSON.parse(row.search_history ?? "[]"),
    url_history: JSON.parse(row.url_history ?? "[]"),
  }
}

function save_loop(db: ReturnType<typeof open_state>, state: LoopState): void {
  if (!db) return
  db.run(
    `INSERT OR REPLACE INTO loops (id, goal, status, rounds_completed, max_rounds, search_history, url_history, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [state.id, state.goal, state.status, state.rounds_completed, state.max_rounds,
     JSON.stringify(state.search_history), JSON.stringify(state.url_history),
     state.created_at, state.updated_at],
  )
}

function list_loops(db: ReturnType<typeof open_state>): LoopState[] {
  if (!db) return []
  const rows = db.query("SELECT * FROM loops ORDER BY updated_at DESC").all() as any[]
  return rows.map(r => ({
    ...r,
    search_history: JSON.parse(r.search_history ?? "[]"),
    url_history: JSON.parse(r.url_history ?? "[]"),
  }))
}

export async function handler(params: Params, emit?: Emit): Promise<Result<any>> {
  const p = (params ?? {}) as LoopParams & { action?: string }

  // List action
  if (p.action === "list" || (!p.goal && !p.resume)) {
    if (!p.goal && !p.resume && p.action !== "list") {
      // No goal provided and not listing — check if it's truly a list request
      if (p.action !== "list") {
        return error({ goal: [{ code: "required", message: "goal is required (or use action: 'list' to list loops)" }] })
      }
    }
    const db = open_state()
    if (db) {
      ensure_loop_table(db)
      const loops = list_loops(db)
      db.close()
      return success({ loops })
    }
    return success({ loops: [] })
  }

  const max_rounds = typeof p.rounds === "number" && p.rounds > 0 ? Math.min(p.rounds, 10) : 5
  const dry_run = p.dry_run === true
  const agent_id = typeof p.agent_id === "string" && p.agent_id.trim() ? p.agent_id.trim() : "cli"
  const lens_prompt = get_active_lens_prompts()

  // Load or create loop state
  const db = open_state()
  let state: LoopState

  if (p.resume) {
    if (!db) {
      return error({ state: [{ code: "not_initialized", message: "state.db not found" }] })
    }
    ensure_loop_table(db)
    const loaded = load_loop(db, p.resume)
    if (!loaded) {
      db.close()
      return error({ resume: [{ code: "not_found", message: `loop "${p.resume}" not found` }] })
    }
    state = loaded
    state.status = "running"
  } else {
    const goal = (p.goal as string).trim()
    if (!goal) {
      db?.close()
      return error({ goal: [{ code: "required", message: "goal is required" }] })
    }
    state = {
      id: randomUUID().slice(0, 8),
      goal,
      status: "running",
      rounds_completed: 0,
      max_rounds,
      search_history: [],
      url_history: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    if (db) {
      ensure_loop_table(db)
      save_loop(db, state)
    }
  }

  const all_rounds: LoopRound[] = []
  let consecutive_converging = 0

  for (let round = state.rounds_completed + 1; round <= max_rounds; round++) {
    emit?.("progress", { phase: "reflecting", round, max_rounds, goal: state.goal })

    // Load current knowledge context
    const search_result = await sys.call("/mind/search", { query: state.goal, limit: 15 })
    const concepts = search_result.status === "success"
      ? ((search_result.result as any)?.matches ?? []) as { id: number; name: string; type: string }[]
      : []

    const ep_result = await sys.call("/mind/episodes/search", { query: state.goal, limit: 10 })
    const episodes = ep_result.status === "success"
      ? ((ep_result.result as any)?.matches ?? []) as { id: number; observation: string; context?: string; tags?: string[] }[]
      : []

    // Rate limit check for reflection LLM call
    if (!is_mock_mode()) {
      const rate = consume_llm_call()
      if (!rate.allowed) {
        state.status = "paused"
        state.updated_at = new Date().toISOString()
        if (db) { save_loop(db, state) }
        db?.close()
        return error({ rate_limit: [{ code: "rate_limit", message: rate.error ?? "rate limit exceeded — loop paused" }] })
      }
    }

    // Reflect
    let reflection
    try {
      reflection = await reflect_on_goal({
        goal: state.goal,
        concepts,
        episodes,
        search_history: state.search_history,
        round,
        total_rounds: max_rounds,
        lens_prompt,
      })
    } catch (e: any) {
      state.status = "paused"
      state.updated_at = new Date().toISOString()
      if (db) { save_loop(db, state) }
      db?.close()
      return error({ llm: [{ code: "reflect_failed", message: e.message ?? "reflection failed" }] })
    }

    // Track convergence
    if (reflection.converging) {
      consecutive_converging++
    } else {
      consecutive_converging = 0
    }

    const round_data: LoopRound = {
      round,
      assessment: reflection.assessment,
      gaps: reflection.gaps,
      queries_searched: [],
      urls_fetched: [],
      sources_digested: 0,
      converging: reflection.converging,
    }

    // Search + Fetch + Digest (skip if converging or no queries)
    if (!dry_run && reflection.queries.length > 0) {
      emit?.("progress", { phase: "searching", round, queries: reflection.queries.length })

      for (const query of reflection.queries.slice(0, 3)) {
        state.search_history.push(query)
        round_data.queries_searched.push(query)

        const sr = await web_search(query)
        for (const url of sr.urls) {
          if (state.url_history.includes(url)) continue
          state.url_history.push(url)
          round_data.urls_fetched.push(url)

          // Digest the URL
          emit?.("progress", { phase: "digesting", round, url })
          const digest_result = await sys.call("/calabi/digest", {
            source: url,
            agent_id,
          })
          if (digest_result.status === "success") {
            round_data.sources_digested++
          }
        }
      }
    } else if (dry_run && reflection.queries.length > 0) {
      round_data.queries_searched = reflection.queries.slice(0, 3)
      round_data.urls_fetched = ["(dry-run — not fetched)"]
    }

    // Journal this round as an episode
    if (!dry_run) {
      await sys.call("/mind/episodes/create", {
        observation: `Loop round ${round}: ${reflection.assessment}`,
        context: `loop:${state.id}`,
        tags: ["loop", "research", reflection.converging ? "converging" : "exploring"],
        agent_id,
      })
    }

    all_rounds.push(round_data)
    state.rounds_completed = round
    state.updated_at = new Date().toISOString()

    // Save state after each round
    if (db) { save_loop(db, state) }

    // Check convergence (2 consecutive or no queries)
    if (consecutive_converging >= 2 || (reflection.queries.length === 0 && reflection.converging)) {
      state.status = "converged"
      break
    }
  }

  // Final status
  if (state.status === "running") {
    state.status = state.rounds_completed >= max_rounds ? "max_rounds" : "running"
  }
  state.updated_at = new Date().toISOString()
  if (db) { save_loop(db, state) }
  db?.close()

  return success({
    id: state.id,
    goal: state.goal,
    status: state.status,
    rounds_completed: all_rounds.length,
    rounds: all_rounds,
    dry_run,
  })
}
