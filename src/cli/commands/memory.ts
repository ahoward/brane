//
// memory.ts - CLI commands for episodic memory: remember, recall, forget, list
//

import { defineCommand } from "citty"
import { sys } from "../../index.ts"
import { auto_tag } from "../../lib/auto-tag.ts"
import { output, cli_error } from "../output.ts"

const remember = defineCommand({
  meta: {
    name: "remember",
    description: "Store a memory (observation, context, outcome)",
  },
  args: {
    observation: { type: "positional", description: "What you observed or learned", required: true },
    context:     { type: "string", alias: "c", description: "What was happening" },
    outcome:     { type: "string", alias: "o", description: "What happened as a result" },
    tags:        { type: "string", alias: "t", description: "Comma-separated tags (auto-detected if omitted)" },
    agent:       { type: "string", alias: "a", description: "Agent ID (default: cli)" },
    json:        { type: "boolean", alias: "j", description: "Output as JSON" },
  },
  async run({ args }) {
    const observation = args.observation as string

    // Parse tags: explicit + auto-detected, merged
    const raw_tags = args.tags ? String(args.tags) : ""
    const explicit_tags = raw_tags ? raw_tags.split(",").map(t => t.trim()).filter(Boolean) : []
    const detected_tags = auto_tag(observation + " " + (args.outcome ?? ""))
    const merged_tags = [...new Set([...explicit_tags, ...detected_tags])]

    const result = await sys.call("/mind/episodes/create", {
      agent_id:    args.agent ?? "cli",
      observation,
      context:     args.context ?? "",
      outcome:     args.outcome ?? "",
      tags:        merged_tags,
    })

    if (args.json) {
      output(result, { json: true })
    } else if (result.status === "success") {
      const ep = result.result as { id: number; tags: string[] }
      const tag_str = ep.tags.length > 0 ? ` [${ep.tags.join(", ")}]` : ""
      console.log(`remembered (id: ${ep.id})${tag_str}`)
    } else {
      output(result, {})
    }
  },
})

const recall = defineCommand({
  meta: {
    name: "recall",
    description: "Search memories by meaning",
  },
  args: {
    query: { type: "positional", description: "What you're trying to remember", required: true },
    limit: { type: "string", alias: "l", description: "Max results (default: 5)" },
    tag:   { type: "string", alias: "t", description: "Filter by tag" },
    after: { type: "string", description: "Only after this ISO timestamp" },
    before:{ type: "string", description: "Only before this ISO timestamp" },
    agent: { type: "string", alias: "a", description: "Filter by agent ID" },
    json:  { type: "boolean", alias: "j", description: "Output as JSON" },
  },
  async run({ args }) {
    const params: Record<string, unknown> = {
      query: args.query,
      limit: args.limit ? parseInt(String(args.limit), 10) || 5 : 5,
    }
    if (args.tag) params.tag = args.tag
    if (args.after) params.after = args.after
    if (args.before) params.before = args.before
    if (args.agent) params.agent_id = args.agent

    const result = await sys.call("/mind/episodes/search", params)

    if (args.json) {
      output(result, { json: true })
    } else if (result.status === "success") {
      const data = result.result as { matches?: { id: number; observation: string; tags: string[]; score: number; timestamp: string }[] }
      const matches = data?.matches ?? []
      if (matches.length === 0) {
        console.log("(no memories found)")
      } else {
        for (const m of matches) {
          const score = typeof m.score === "number" ? m.score.toFixed(3) : "?"
          const tags = m.tags?.length > 0 ? ` [${m.tags.join(", ")}]` : ""
          const obs = m.observation.length > 120 ? m.observation.slice(0, 120) + "..." : m.observation
          console.log(`${score}  #${m.id}  ${obs}${tags}`)
        }
      }
    } else {
      output(result, {})
    }
  },
})

const forget = defineCommand({
  meta: {
    name: "forget",
    description: "Remove a memory by ID",
  },
  args: {
    id:   { type: "positional", description: "Episode ID to forget", required: true },
    json: { type: "boolean", alias: "j", description: "Output as JSON" },
  },
  async run({ args }) {
    const raw_id = String(args.id)
    if (!/^\d+$/.test(raw_id)) {
      cli_error("id", "invalid", "id must be a positive integer", { json: args.json })
    }
    const id = parseInt(raw_id, 10)

    const result = await sys.call("/mind/episodes/delete", { id })

    if (args.json) {
      output(result, { json: true })
    } else if (result.status === "success") {
      console.log(`forgot episode #${id}`)
    } else {
      output(result, {})
    }
  },
})

const list = defineCommand({
  meta: {
    name: "list",
    description: "List recent memories",
  },
  args: {
    limit: { type: "string", alias: "l", description: "Max results (default: 20)" },
    tag:   { type: "string", alias: "t", description: "Filter by tag" },
    agent: { type: "string", alias: "a", description: "Filter by agent ID" },
    after: { type: "string", description: "Only after this ISO timestamp" },
    before:{ type: "string", description: "Only before this ISO timestamp" },
    json:  { type: "boolean", alias: "j", description: "Output as JSON" },
  },
  async run({ args }) {
    const params: Record<string, unknown> = {
      limit: args.limit ? parseInt(String(args.limit), 10) || 20 : 20,
    }
    if (args.tag) params.tag = args.tag
    if (args.agent) params.agent_id = args.agent
    if (args.after) params.after = args.after
    if (args.before) params.before = args.before

    const result = await sys.call("/mind/episodes/list", params)

    if (args.json) {
      output(result, { json: true })
    } else if (result.status === "success") {
      const data = result.result as { episodes?: { id: number; observation: string; tags: string[]; timestamp: string; agent_id: string }[] }
      const episodes = data?.episodes ?? []
      if (episodes.length === 0) {
        console.log("(no memories)")
      } else {
        for (const ep of episodes) {
          const tags = ep.tags?.length > 0 ? ` [${ep.tags.join(", ")}]` : ""
          const obs = ep.observation.length > 100 ? ep.observation.slice(0, 100) + "..." : ep.observation
          const ts = ep.timestamp.slice(0, 10)
          console.log(`#${ep.id}  ${ts}  ${obs}${tags}`)
        }
      }
    } else {
      output(result, {})
    }
  },
})

export const memory = defineCommand({
  meta: {
    name: "memory",
    description: "Episodic memory: remember, recall, forget, list",
  },
  subCommands: {
    remember,
    recall,
    forget,
    list,
  },
})
