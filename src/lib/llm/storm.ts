//
// storm.ts - LLM-powered divergent brainstorming over accumulated knowledge
//
// Takes existing context (concepts, edges, episodes) and generates
// new knowledge: concepts, edges, episodes, plus suggestions for
// next actions (questions, sources, lenses).
//

import { spawn } from "node:child_process"
import { is_mock_mode } from "./index.ts"

export interface StormRequest {
  seed?:       string     // optional topic seed
  input?:      string     // optional document to brainstorm against
  concepts:    { id: number; name: string; type: string }[]
  edges:       { id: number; source_name: string; target_name: string; relation: string }[]
  episodes:    { id: number; observation: string; context?: string; tags?: string[] }[]
  round:       number     // current round (1-based)
  total_rounds: number
  lens_prompt?: string
}

export interface StormResult {
  concepts: { name: string; type: string }[]
  edges:    { source_name: string; target_name: string; relation: string }[]
  episodes: { observation: string; context: string; tags: string[] }[]
  suggestions: { kind: "question" | "source" | "lens"; value: string; reason: string }[]
  reasoning: string
}

const STORM_SCHEMA = JSON.stringify({
  type: "object",
  properties: {
    concepts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "PascalCase name for the concept" },
          type: { type: "string", description: "Concept type: Entity, Caveat, Rule, or custom" },
        },
        required: ["name", "type"],
      },
    },
    edges: {
      type: "array",
      items: {
        type: "object",
        properties: {
          source_name: { type: "string", description: "Exact name of source concept (must be in concepts list or existing context)" },
          target_name: { type: "string", description: "Exact name of target concept (must be in concepts list or existing context)" },
          relation:    { type: "string", description: "Relationship type" },
        },
        required: ["source_name", "target_name", "relation"],
      },
    },
    episodes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          observation: { type: "string", description: "Insight, question, hypothesis, or gap identified" },
          context:     { type: "string", description: "What prompted this observation" },
          tags:        { type: "array", items: { type: "string" }, description: "Tags: question, hypothesis, gap, insight, contradiction, connection" },
        },
        required: ["observation", "context", "tags"],
      },
    },
    suggestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          kind:   { type: "string", enum: ["question", "source", "lens"], description: "Type of suggestion" },
          value:  { type: "string", description: "The suggestion itself" },
          reason: { type: "string", description: "Why this would be valuable" },
        },
        required: ["kind", "value", "reason"],
      },
    },
    reasoning: { type: "string", description: "Explanation of brainstorming process and key themes" },
  },
  required: ["concepts", "edges", "episodes", "suggestions", "reasoning"],
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

function build_system_prompt(): string {
  return `You are a divergent thinking system for Brane, an agent memory layer. Your job is to brainstorm: find gaps, surface blind spots, propose connections, and question assumptions.

## Your Role
You are NOT retrieving or summarizing — you are GENERATING new knowledge by thinking creatively about what's already known.

## What to Produce

1. **New Concepts** — things that SHOULD exist in the graph but don't yet
   - Missing abstractions, implicit dependencies, unnamed patterns
   - PascalCase names, typed as Entity, Caveat, Rule, or custom

2. **New Edges** — relationships that connect existing OR new concepts
   - Hidden dependencies, contradictions, alternatives
   - source_name and target_name must match concept names (existing or new)

3. **New Episodes** — insights, questions, hypotheses, gaps
   - Tag with: question, hypothesis, gap, insight, contradiction, connection
   - These capture your THINKING, not just facts

4. **Suggestions** — recommended next actions for the human
   - "question": things worth investigating with \`brane ask\`
   - "source": content worth digesting with \`brane digest\`
   - "lens": perspectives worth exploring

## Guidelines
- Be creative but grounded — every idea should connect to existing knowledge
- Prefer surprising connections over obvious ones
- Surface contradictions and tensions explicitly
- 3-8 new concepts, 2-6 edges, 3-8 episodes, 2-5 suggestions
- Quality over quantity — each item should be genuinely useful

Return your brainstorm as structured JSON.`
}

function append_lens(base: string, lens_prompt?: string): string {
  if (!lens_prompt) return base
  return base + `\n\n## Active Lens\n${lens_prompt}`
}

function build_user_prompt(request: StormRequest): string {
  const parts: string[] = []

  if (request.round > 1) {
    parts.push(`## Round ${request.round}/${request.total_rounds}`)
    parts.push("Go deeper. The context below includes items from previous rounds.")
    parts.push("Find second-order connections, challenge earlier assumptions, and explore edges.")
    parts.push("")
  }

  if (request.seed) {
    parts.push(`## Seed Topic: ${request.seed}`)
    parts.push("")
  }

  if (request.input) {
    const truncated = request.input.length > 50000
      ? request.input.slice(0, 50000) + "\n\n[... truncated ...]"
      : request.input
    parts.push("## Input Document")
    parts.push(truncated)
    parts.push("")
  }

  if (request.concepts.length > 0) {
    parts.push("## Existing Concepts")
    for (const c of request.concepts) {
      parts.push(`- [#${c.id}] ${c.name} (${c.type})`)
    }
    parts.push("")
  }

  if (request.edges.length > 0) {
    parts.push("## Existing Relationships")
    for (const e of request.edges) {
      parts.push(`- [#${e.id}] ${e.source_name} → ${e.target_name} (${e.relation})`)
    }
    parts.push("")
  }

  if (request.episodes.length > 0) {
    parts.push("## Existing Memories")
    for (const ep of request.episodes) {
      const tags = ep.tags?.length ? ` [${ep.tags.join(", ")}]` : ""
      const ctx = ep.context ? ` — ${ep.context}` : ""
      parts.push(`- [#${ep.id}] ${ep.observation}${ctx}${tags}`)
    }
    parts.push("")
  }

  if (request.concepts.length === 0 && request.episodes.length === 0 && !request.input) {
    parts.push("(Empty knowledge graph — brainstorm from scratch based on the seed topic)")
  }

  parts.push("")
  parts.push("Now brainstorm: what's missing? What connections haven't been made? What questions should be asked?")

  return parts.join("\n")
}

//
// Mock implementation
//
function mock_storm(request: StormRequest): StormResult {
  const seed = request.seed ?? "general"
  const name = seed
    .split(/\s+/)
    .slice(0, 2)
    .map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
    .join("")

  return {
    concepts: [
      { name: `${name}Gap`, type: "Caveat" },
      { name: `${name}Pattern`, type: "Entity" },
    ],
    edges: [
      { source_name: `${name}Gap`, target_name: `${name}Pattern`, relation: "MOTIVATES" },
    ],
    episodes: [
      { observation: `Brainstorming about ${seed} reveals potential gaps in coverage`, context: "storm", tags: ["gap", "insight"] },
      { observation: `The ${seed} area may benefit from deeper investigation`, context: "storm", tags: ["question"] },
    ],
    suggestions: [
      { kind: "question", value: `What are the edge cases in ${seed}?`, reason: "Gap in current knowledge" },
      { kind: "source", value: `Look for documentation on ${seed} best practices`, reason: "Would strengthen the knowledge graph" },
    ],
    reasoning: `Mock storm: generated speculative concepts and suggestions around "${seed}"`,
  }
}

//
// Real implementation
//
async function cli_storm(request: StormRequest): Promise<StormResult> {
  const cli = process.env.BRANE_LLM_CLI ?? "claude"
  const system_prompt = append_lens(build_system_prompt(), request.lens_prompt)
  const user_prompt = build_user_prompt(request)

  const args = [
    cli,
    "-p",
    "--output-format", "json",
    "--system-prompt", system_prompt,
    "--json-schema", STORM_SCHEMA,
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
    concepts:    Array.isArray(output.concepts) ? output.concepts : [],
    edges:       Array.isArray(output.edges) ? output.edges : [],
    episodes:    Array.isArray(output.episodes) ? output.episodes : [],
    suggestions: Array.isArray(output.suggestions) ? output.suggestions : [],
    reasoning:   String(output.reasoning ?? ""),
  }
}

//
// Public API
//
export async function storm_knowledge(request: StormRequest): Promise<StormResult> {
  if (is_mock_mode()) {
    return mock_storm(request)
  }
  return await cli_storm(request)
}
