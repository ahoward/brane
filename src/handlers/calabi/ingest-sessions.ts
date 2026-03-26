//
// ingest-sessions.ts - ingest Claude Code session logs into episodic memory
//
// Parses JSONL session logs, extracts conversation turns, creates episodes.
// Tracks ingested sessions in state.db to avoid re-processing.
//

import type { Params, Result, Emit } from "../../lib/types.ts"
import { success, error } from "../../lib/result.ts"
import { open_state } from "../../lib/state.ts"
import { auto_tag } from "../../lib/auto-tag.ts"
import { sys } from "../../index.ts"
import {
  find_project_sessions,
  find_session_files,
  find_session_dirs,
  parse_session,
  group_exchanges,
} from "../../lib/session-parser.ts"

interface IngestSessionsParams {
  path?:     string    // explicit session file or project dir
  limit?:    number    // max sessions to process (default 10)
  dry_run?:  boolean   // preview without creating episodes
  agent_id?: string    // agent ID for created episodes (default: session source)
}

interface IngestSessionsResult {
  sessions_found:     number
  sessions_ingested:  number
  sessions_skipped:   number
  episodes_created:   number
  dry_run:            boolean
  details:            SessionDetail[]
}

interface SessionDetail {
  session_id: string
  file_path:  string
  turns:      number
  exchanges:  number
  episodes:   number
  skipped:    boolean
  reason?:    string
}

//
// Ensure the ingested_sessions table exists in state.db
//
function ensure_sessions_table(db: ReturnType<typeof open_state>): void {
  if (!db) return
  db.run(`
    CREATE TABLE IF NOT EXISTS ingested_sessions (
      file_path    TEXT PRIMARY KEY,
      session_id   TEXT NOT NULL,
      ingested_at  TEXT NOT NULL,
      turns        INTEGER NOT NULL,
      episodes     INTEGER NOT NULL
    )
  `)
}

//
// Check if a session file has already been ingested
//
function is_session_ingested(db: ReturnType<typeof open_state>, file_path: string): boolean {
  if (!db) return false
  const row = db.query("SELECT 1 FROM ingested_sessions WHERE file_path = ?").get(file_path)
  return row !== null
}

//
// Record a session as ingested
//
function record_ingested(
  db: ReturnType<typeof open_state>,
  session_id: string,
  file_path: string,
  turns: number,
  episodes: number,
): void {
  if (!db) return
  db.run(
    "INSERT OR REPLACE INTO ingested_sessions (file_path, session_id, ingested_at, turns, episodes) VALUES (?, ?, ?, ?, ?)",
    [file_path, session_id, new Date().toISOString(), turns, episodes],
  )
}

export async function handler(params: Params, emit?: Emit): Promise<Result<IngestSessionsResult>> {
  const p = (params ?? {}) as IngestSessionsParams
  const limit = typeof p.limit === "number" && p.limit > 0 ? p.limit : 10
  const dry_run = p.dry_run === true
  const agent_id = typeof p.agent_id === "string" && p.agent_id.trim() ? p.agent_id.trim() : "claude-code"

  // Find session files
  let session_files: string[]

  if (p.path && typeof p.path === "string") {
    const path = p.path.trim()
    if (path.endsWith(".jsonl")) {
      session_files = [path]
    } else {
      session_files = find_session_files(path)
    }
  } else {
    session_files = find_project_sessions()
  }

  if (session_files.length === 0) {
    return success({
      sessions_found: 0,
      sessions_ingested: 0,
      sessions_skipped: 0,
      episodes_created: 0,
      dry_run,
      details: [],
    })
  }

  // Open state.db for tracking (wrapped in try/finally to prevent leaks)
  const state_db = open_state()
  if (state_db) {
    ensure_sessions_table(state_db)
  }

  try {
    const details: SessionDetail[] = []
    let total_episodes = 0
    let sessions_ingested = 0
    let sessions_skipped = 0

    const to_process = session_files.slice(0, limit)

    emit?.("progress", { phase: "scanning", sessions: to_process.length })

    for (const file of to_process) {
      // Parse session
      const parsed = parse_session(file)
      if (!parsed || parsed.turns.length === 0) {
        details.push({
          session_id: file.split("/").pop()?.replace(".jsonl", "") ?? "unknown",
          file_path: file,
          turns: 0,
          exchanges: 0,
          episodes: 0,
          skipped: true,
          reason: "no conversation turns found",
        })
        sessions_skipped++
        continue
      }

      // Check if already ingested (keyed by file_path for uniqueness)
      if (state_db && is_session_ingested(state_db, file)) {
        details.push({
          session_id: parsed.session_id,
          file_path: file,
          turns: parsed.turns.length,
          exchanges: 0,
          episodes: 0,
          skipped: true,
          reason: "already ingested",
        })
        sessions_skipped++
        continue
      }

      // Group into exchanges
      const exchanges = group_exchanges(parsed.turns)

      if (exchanges.length === 0) {
        details.push({
          session_id: parsed.session_id,
          file_path: file,
          turns: parsed.turns.length,
          exchanges: 0,
          episodes: 0,
          skipped: true,
          reason: "no exchanges to create",
        })
        sessions_skipped++
        continue
      }

      emit?.("progress", { phase: "ingesting", session_id: parsed.session_id, exchanges: exchanges.length })

      let session_episodes = 0

      if (!dry_run) {
        for (const exchange of exchanges) {
          const observation = build_observation(exchange.user_text, exchange.assistant_text)
          if (!observation) continue

          const tags = [...new Set([
            "session-log",
            ...auto_tag(observation),
          ])]

          const ep_result = await sys.call("/mind/episodes/create", {
            agent_id,
            observation,
            context: `Claude Code session ${parsed.session_id}`,
            tags,
          })

          if (ep_result.status === "success") {
            session_episodes++
          }
        }

        // Record as ingested after all episodes created
        if (state_db) {
          record_ingested(state_db, parsed.session_id, file, parsed.turns.length, session_episodes)
        }
      } else {
        session_episodes = exchanges.length // estimate
      }

      total_episodes += session_episodes
      sessions_ingested++

      details.push({
        session_id: parsed.session_id,
        file_path: file,
        turns: parsed.turns.length,
        exchanges: exchanges.length,
        episodes: session_episodes,
        skipped: false,
      })
    }

    return success({
      sessions_found: session_files.length,
      sessions_ingested,
      sessions_skipped,
      episodes_created: total_episodes,
      dry_run,
      details,
    })
  } finally {
    if (state_db) {
      try { state_db.close() } catch {}
    }
  }
}

//
// Build a concise observation from a user+assistant exchange.
// Truncates very long exchanges to keep episodes focused.
//
function build_observation(user_text: string, assistant_text: string): string | null {
  if (!user_text && !assistant_text) return null

  const MAX_LEN = 2000

  const parts: string[] = []
  if (user_text) {
    const u = user_text.length > MAX_LEN / 2 ? user_text.slice(0, MAX_LEN / 2) + "..." : user_text
    parts.push(`User: ${u}`)
  }
  if (assistant_text) {
    const a = assistant_text.length > MAX_LEN / 2 ? assistant_text.slice(0, MAX_LEN / 2) + "..." : assistant_text
    parts.push(`Assistant: ${a}`)
  }

  const result = parts.join("\n")
  return result.trim().length > 0 ? result : null
}
