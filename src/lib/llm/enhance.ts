//
// enhance.ts - LLM-powered convergent refinement of existing knowledge
//
// Examines existing concepts, edges, episodes and proposes:
// - Concept merges (redundant/overlapping)
// - New edges (missing relationships)
// - Observations (contradictions, gaps, insights about the graph itself)
//
// Does NOT add new topics — only refines what's already there.
//

import { spawn } from "node:child_process"
import { is_mock_mode } from "./index.ts"

export interface EnhanceRequest {
  concepts:    { id: number; name: string; type: string }[]
  edges:       { id: number; source_name: string; target_name: string; relation: string }[]
  episodes:    { id: number; observation: string; context?: string; tags?: string[] }[]
  focus?:      string
  round:       number
  total_rounds: number
}

export interface EnhanceResult {
  operations: {
    merge_concepts: { keep_name: string; remove_name: string; reason: string }[]
    new_edges:      { source_name: string; target_name: string; relation: string }[]
    observations:   { observation: string; context: string; tags: string[] }[]
  }
  reasoning: string
}

const ENHANCE_SCHEMA = JSON.stringify({
  type: "object",
  properties: {
    operations: {
      type: "object",
      properties: {
        merge_concepts: {
          type: "array",
          items: {
            type: "object",
            properties: {
              keep_name:   { type: "string", description: "Name of concept to keep" },
              remove_name: { type: "string", description: "Name of redundant concept to remove" },
              reason:      { type: "string", description: "Why these are the same concept" },
            },
            required: ["keep_name", "remove_name", "reason"],
          },
        },
        new_edges: {
          type: "array",
          items: {
            type: "object",
            properties: {
              source_name: { type: "string", description: "Source concept name (must exist in provided concepts)" },
              target_name: { type: "string", description: "Target concept name (must exist in provided concepts)" },
              relation:    { type: "string", description: "Relationship type" },
            },
            required: ["source_name", "target_name", "relation"],
          },
        },
        observations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              observation: { type: "string", description: "What you noticed about the knowledge graph" },
              context:     { type: "string", description: "What area this relates to" },
              tags:        { type: "array", items: { type: "string" }, description: "Tags: contradiction, gap, redundancy, insight, quality" },
            },
            required: ["observation", "context", "tags"],
          },
        },
      },
      required: ["merge_concepts", "new_edges", "observations"],
    },
    reasoning: { type: "string", description: "Summary of refinement analysis" },
  },
  required: ["operations", "reasoning"],
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
  return `You are a knowledge refinement system for Brane, an agent memory layer. Your job is CONVERGENT: sharpen existing knowledge without adding new topics.

## Your Role
You are NOT brainstorming or adding new topics. You are REFINING what's already there.

## What to Produce

1. **Merge Concepts** — find redundant/overlapping concepts
   - Same thing with different names → merge
   - keep_name and remove_name must exactly match concept names in the context

2. **New Edges** — missing relationships between EXISTING concepts
   - Implicit dependencies, undocumented connections
   - source_name and target_name must exactly match existing concept names

3. **Observations** — meta-knowledge about the graph itself
   - Contradictions between episodes → tag "contradiction"
   - Shallow areas needing more detail → tag "gap"
   - Redundancy patterns → tag "redundancy"
   - Quality insights → tag "quality", "insight"

## Guidelines
- Do NOT invent new concepts or topics
- Only reference concepts that exist in the provided context
- Be conservative with merges — only merge truly redundant concepts
- 0-3 merges, 0-5 new edges, 1-5 observations per round
- If the graph is already clean, say so and return empty operations

Return your analysis as structured JSON.`
}

function build_user_prompt(request: EnhanceRequest): string {
  const parts: string[] = []

  if (request.round > 1) {
    parts.push(`## Round ${request.round}/${request.total_rounds}`)
    parts.push("Previous round's changes have been applied. Look deeper.")
    parts.push("")
  }

  if (request.focus) {
    parts.push(`## Focus Area: ${request.focus}`)
    parts.push("Concentrate your refinement on concepts and relationships related to this topic.")
    parts.push("")
  }

  if (request.concepts.length > 0) {
    parts.push("## Concepts")
    for (const c of request.concepts) {
      parts.push(`- [#${c.id}] ${c.name} (${c.type})`)
    }
    parts.push("")
  }

  if (request.edges.length > 0) {
    parts.push("## Relationships")
    for (const e of request.edges) {
      parts.push(`- [#${e.id}] ${e.source_name} → ${e.target_name} (${e.relation})`)
    }
    parts.push("")
  }

  if (request.episodes.length > 0) {
    parts.push("## Episodes")
    for (const ep of request.episodes) {
      const tags = ep.tags?.length ? ` [${ep.tags.join(", ")}]` : ""
      const ctx = ep.context ? ` — ${ep.context}` : ""
      parts.push(`- [#${ep.id}] ${ep.observation}${ctx}${tags}`)
    }
    parts.push("")
  }

  if (request.concepts.length === 0) {
    parts.push("(Empty knowledge graph — nothing to refine)")
  }

  parts.push("")
  parts.push("Analyze this knowledge for redundancies, missing relationships, contradictions, and quality issues.")

  return parts.join("\n")
}

//
// Mock implementation
//
function mock_enhance(request: EnhanceRequest): EnhanceResult {
  const ops: EnhanceResult["operations"] = {
    merge_concepts: [],
    new_edges: [],
    observations: [],
  }

  // Mock: if 2+ concepts exist, suggest an edge between first two
  if (request.concepts.length >= 2) {
    ops.new_edges.push({
      source_name: request.concepts[0].name,
      target_name: request.concepts[1].name,
      relation: "RELATES_TO",
    })
  }

  // Always produce at least one observation
  const focus = request.focus ?? "the knowledge graph"
  ops.observations.push({
    observation: `Refinement pass ${request.round} on ${focus}: graph structure looks reasonable`,
    context: "enhance",
    tags: ["quality"],
  })

  return {
    operations: ops,
    reasoning: `Mock enhance: analyzed ${request.concepts.length} concepts, ${request.edges.length} edges, ${request.episodes.length} episodes`,
  }
}

//
// Real implementation
//
async function cli_enhance(request: EnhanceRequest): Promise<EnhanceResult> {
  const cli = process.env.BRANE_LLM_CLI ?? "claude"
  const system_prompt = build_system_prompt()
  const user_prompt = build_user_prompt(request)

  const args = [
    cli,
    "-p",
    "--output-format", "json",
    "--system-prompt", system_prompt,
    "--json-schema", ENHANCE_SCHEMA,
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

  const ops = output.operations ?? {}
  return {
    operations: {
      merge_concepts: Array.isArray(ops.merge_concepts) ? ops.merge_concepts : [],
      new_edges:      Array.isArray(ops.new_edges) ? ops.new_edges : [],
      observations:   Array.isArray(ops.observations) ? ops.observations : [],
    },
    reasoning: String(output.reasoning ?? ""),
  }
}

//
// Public API
//
export async function enhance_knowledge(request: EnhanceRequest): Promise<EnhanceResult> {
  if (is_mock_mode()) {
    return mock_enhance(request)
  }
  return await cli_enhance(request)
}
