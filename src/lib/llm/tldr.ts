//
// tldr.ts - LLM-powered knowledge outline with synopses
//
// Takes graph contents and produces a structured topical outline
// with one-line synopses per concept.
//

import { spawn } from "node:child_process"
import { is_mock_mode } from "./index.ts"

export interface TldrRequest {
  concepts:    { id: number; name: string; type: string }[]
  edges:       { id: number; source_name: string; target_name: string; relation: string }[]
  episodes:    { id: number; observation: string; context?: string; tags?: string[]; timestamp?: string }[]
  focus?:      string
  lens_prompt?: string
}

export interface TldrTopic {
  title:   string
  items:   string[]
}

export interface TldrResult {
  topics:    TldrTopic[]
  learnings: string[]    // recent episodes formatted as one-liners
  reasoning: string
}

const TLDR_SCHEMA = JSON.stringify({
  type: "object",
  properties: {
    topics: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "Topic heading" },
          items: { type: "array", items: { type: "string" }, description: "One-line synopses under this topic" },
        },
        required: ["title", "items"],
      },
    },
    learnings: {
      type: "array",
      items: { type: "string" },
      description: "Recent episodes/insights formatted as one-liners",
    },
    reasoning: { type: "string", description: "Brief note on organization choices" },
  },
  required: ["topics", "learnings", "reasoning"],
})

const AGENT_NESTING_VARS = ["CLAUDECODE", "CLAUDE_CODE", "GEMINI_SESSION"]

function clean_env(): Record<string, string | undefined> {
  const env = { ...process.env }
  for (const key of AGENT_NESTING_VARS) {
    delete env[key]
  }
  return env
}

function run_cli(args: string[], stdin: string): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(args[0], args.slice(1), {
      stdio: ["pipe", "pipe", "pipe"],
      env: clean_env(),
    })

    let stdout = ""
    let stderr = ""

    proc.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString() })
    proc.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString() })

    proc.on("error", (err: Error) => reject(err))
    proc.on("close", (code: number | null) => resolve({ stdout, stderr, code: code ?? 1 }))

    proc.stdin.write(stdin)
    proc.stdin.end()
  })
}

function build_system_prompt(lens_prompt?: string): string {
  let prompt = `You are a knowledge organizer for Brane, an agent memory layer. Given concepts, relationships, and episodes, produce a structured topical outline.

## Rules
1. Group related concepts into 2-6 topics with clear headings
2. Each item under a topic is a one-line synopsis (not just the name)
3. Synopses should convey what the concept IS or DOES, not just name it
4. Recent episodes go in "learnings" as one-liners with context
5. If focused on a topic, only include relevant items
6. Be concise — this is a quick-glance overview`

  if (lens_prompt) {
    prompt += `\n\n## Active Lens\n${lens_prompt}`
  }

  prompt += `\n\nReturn your outline as structured JSON.`
  return prompt
}

function build_user_prompt(request: TldrRequest): string {
  const parts: string[] = []

  if (request.focus) {
    parts.push(`## Focus: ${request.focus}`)
    parts.push("Only include items relevant to this topic.")
    parts.push("")
  }

  if (request.concepts.length > 0) {
    parts.push("## Concepts")
    for (const c of request.concepts) {
      parts.push(`- ${c.name} (${c.type})`)
    }
    parts.push("")
  }

  if (request.edges.length > 0) {
    parts.push("## Relationships")
    for (const e of request.edges) {
      parts.push(`- ${e.source_name} → ${e.target_name} (${e.relation})`)
    }
    parts.push("")
  }

  if (request.episodes.length > 0) {
    parts.push("## Episodes")
    for (const ep of request.episodes) {
      const ctx = ep.context ? ` — ${ep.context}` : ""
      parts.push(`- ${ep.observation}${ctx}`)
    }
    parts.push("")
  }

  if (request.concepts.length === 0 && request.episodes.length === 0) {
    parts.push("(Empty knowledge graph)")
  }

  parts.push("\nOrganize this into a topical outline with synopses.")
  return parts.join("\n")
}

//
// Mock implementation
//
function mock_tldr(request: TldrRequest): TldrResult {
  const topics: TldrTopic[] = []

  if (request.concepts.length > 0) {
    // Group by type
    const by_type: Record<string, string[]> = {}
    for (const c of request.concepts) {
      const t = c.type || "General"
      if (!by_type[t]) by_type[t] = []
      by_type[t].push(`${c.name} — a ${c.type.toLowerCase()} in the knowledge graph`)
    }
    for (const [type, items] of Object.entries(by_type)) {
      topics.push({ title: type, items })
    }
  }

  const learnings = request.episodes
    .slice(0, 5)
    .map(ep => ep.observation)

  return {
    topics,
    learnings,
    reasoning: `Organized ${request.concepts.length} concepts into ${topics.length} topics by type`,
  }
}

//
// Real implementation
//
async function cli_tldr(request: TldrRequest): Promise<TldrResult> {
  const cli = process.env.BRANE_LLM_CLI ?? "claude"
  const system_prompt = build_system_prompt(request.lens_prompt)
  const user_prompt = build_user_prompt(request)

  const args = [
    cli,
    "-p",
    "--output-format", "json",
    "--system-prompt", system_prompt,
    "--json-schema", TLDR_SCHEMA,
    "--no-session-persistence",
  ]

  const result = await run_cli(args, user_prompt)

  if (result.code !== 0) {
    throw new Error(`${cli} exited with code ${result.code}: ${result.stderr || result.stdout}`)
  }

  let envelope: any
  try {
    envelope = JSON.parse(result.stdout)
  } catch {
    throw new Error(`${cli} returned invalid JSON: ${result.stdout.slice(0, 200)}`)
  }

  const output = envelope.structured_output ?? envelope.result ?? envelope
  if (!output || typeof output !== "object") {
    throw new Error(`${cli} returned no structured output`)
  }

  return {
    topics:    Array.isArray(output.topics) ? output.topics : [],
    learnings: Array.isArray(output.learnings) ? output.learnings : [],
    reasoning: String(output.reasoning ?? ""),
  }
}

//
// Public API
//
export async function tldr_knowledge(request: TldrRequest): Promise<TldrResult> {
  if (is_mock_mode()) {
    return mock_tldr(request)
  }
  return await cli_tldr(request)
}
