//
// loop.ts - CLI command: brane loop <goal>
//
// Autonomous goal-directed research.
//

import { defineCommand } from "citty"
import { sys } from "../../index.ts"
import { output, cli_error } from "../output.ts"

const loopRun = defineCommand({
  meta: {
    name: "run",
    description: "Start or resume an autonomous research loop",
  },
  args: {
    goal:    { type: "positional", description: "Research goal", required: false },
    rounds:  { type: "string", alias: "r", description: "Max rounds (default: 5, max: 10)" },
    resume:  { type: "string", description: "Resume a paused loop by ID" },
    agent:   { type: "string", alias: "a", description: "Agent ID" },
    "dry-run": { type: "boolean", alias: "n", description: "Preview without searching/digesting" },
    json:    { type: "boolean", alias: "j", description: "Output as JSON" },
  },
  async run({ args }) {
    const params: Record<string, unknown> = {}
    if (args.goal) params.goal = args.goal
    if (args.rounds) params.rounds = parseInt(String(args.rounds), 10) || 5
    if (args.resume) params.resume = args.resume
    if (args.agent) params.agent_id = args.agent
    if (args["dry-run"]) params.dry_run = true

    if (!args.goal && !args.resume) {
      cli_error("goal", "required", "goal is required (or --resume <id>)", { json: args.json })
    }

    const result = await sys.call("/calabi/loop", params)

    if (args.json) {
      output(result, { json: true })
      return
    }

    if (result.status === "error") {
      output(result, {})
      return
    }

    const data = result.result as {
      id: string
      goal: string
      status: string
      rounds_completed: number
      rounds: { round: number; assessment: string; gaps: string[]; queries_searched: string[]; urls_fetched: string[]; sources_digested: number; converging: boolean }[]
      dry_run: boolean
    }

    if (!data) return

    const prefix = data.dry_run ? "[dry-run] " : ""
    console.log(`${prefix}loop ${data.id}: ${data.goal}`)
    console.log("")

    for (const r of data.rounds) {
      console.log(`--- Round ${r.round} ${r.converging ? "(converging)" : ""} ---`)
      console.log(r.assessment)
      if (r.gaps.length > 0) {
        console.log(`  gaps: ${r.gaps.join("; ")}`)
      }
      if (r.queries_searched.length > 0) {
        console.log(`  searched: ${r.queries_searched.join(", ")}`)
      }
      if (r.urls_fetched.length > 0) {
        console.log(`  fetched: ${r.urls_fetched.length} URLs`)
      }
      if (r.sources_digested > 0) {
        console.log(`  digested: ${r.sources_digested} sources`)
      }
      console.log("")
    }

    console.log(`${prefix}status: ${data.status} (${data.rounds_completed} rounds)`)
  },
})

const loopList = defineCommand({
  meta: {
    name: "list",
    description: "List all research loops",
  },
  args: {
    json: { type: "boolean", alias: "j", description: "Output as JSON" },
  },
  async run({ args }) {
    const result = await sys.call("/calabi/loop", { action: "list" })

    if (args.json) {
      output(result, { json: true })
      return
    }

    if (result.status === "error") {
      output(result, {})
      return
    }

    const data = result.result as { loops: { id: string; goal: string; status: string; rounds_completed: number; max_rounds: number; updated_at: string }[] }
    if (!data?.loops?.length) {
      console.log("No loops yet.")
      return
    }

    for (const l of data.loops) {
      const status = l.status.padEnd(10)
      console.log(`${l.id}  ${status}  ${l.rounds_completed}/${l.max_rounds} rounds  ${l.goal.slice(0, 50)}`)
    }
  },
})

export const loop = defineCommand({
  meta: {
    name: "loop",
    description: "Autonomous goal-directed research (reflect → search → digest → repeat)",
  },
  subCommands: {
    run: loopRun,
    list: loopList,
  },
})
