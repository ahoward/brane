//
// ingest-sessions.ts - CLI command for session log ingestion
//

import { defineCommand } from "citty"
import { sys } from "../../index.ts"
import { output } from "../output.ts"

export const ingestSessions = defineCommand({
  meta: {
    name: "ingest-sessions",
    description: "Ingest Claude Code session logs into episodic memory",
  },
  args: {
    path:    { type: "positional", description: "Session file (.jsonl) or project dir (auto-discovers if omitted)", required: false },
    limit:   { type: "string", alias: "l", description: "Max sessions to process (default: 10)" },
    dryRun:  { type: "boolean", alias: "n", description: "Preview without creating episodes" },
    agent:   { type: "string", alias: "a", description: "Agent ID for created episodes (default: claude-code)" },
    json:    { type: "boolean", alias: "j", description: "Output as JSON" },
  },
  async run({ args }) {
    const params: Record<string, unknown> = {}

    if (args.path) params.path = args.path
    if (args.limit) params.limit = parseInt(String(args.limit), 10) || 10
    if (args.dryRun) params.dry_run = true
    if (args.agent) params.agent_id = args.agent

    const result = await sys.call("/calabi/ingest-sessions", params)

    if (args.json) {
      output(result, { json: true })
      return
    }

    if (result.status === "error") {
      output(result, {})
      return
    }

    const data = result.result as {
      sessions_found: number
      sessions_ingested: number
      sessions_skipped: number
      episodes_created: number
      dry_run: boolean
      details: { session_id: string; turns: number; exchanges: number; episodes: number; skipped: boolean; reason?: string }[]
    }

    if (!data) return

    const prefix = data.dry_run ? "[dry run] " : ""

    if (data.sessions_found === 0) {
      console.log(`${prefix}no session logs found`)
      return
    }

    console.log(`${prefix}found ${data.sessions_found} session(s)`)
    console.log("")

    for (const d of data.details ?? []) {
      if (d.skipped) {
        console.log(`  skip  ${d.session_id.slice(0, 8)}…  ${d.reason}`)
      } else {
        console.log(`  ✓     ${d.session_id.slice(0, 8)}…  ${d.turns} turns → ${d.episodes} episodes`)
      }
    }

    console.log("")
    console.log(`${prefix}${data.sessions_ingested} ingested, ${data.sessions_skipped} skipped, ${data.episodes_created} episodes`)
  },
})
