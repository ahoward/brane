//
// ask.ts - LLM-powered question answering over accumulated knowledge
//
// Takes a question + retrieved context (concepts, edges, episodes),
// synthesizes an answer with citations back to specific graph items.
//

import { spawn } from "node:child_process"
import { is_mock_mode } from "./index.ts"

export interface AskRequest {
  question:    string
  concepts:    { id: number; name: string; type: string; score?: number }[]
  edges:       { id: number; source_name: string; target_name: string; relation: string }[]
  episodes:    { id: number; observation: string; context?: string; tags?: string[]; score?: number }[]
  lens_prompt?: string
}

export interface AskResult {
  answer:   string
  citations: {
    concept_ids:  number[]
    episode_ids:  number[]
    edge_ids:     number[]
  }
  reasoning: string
}

const ASK_SCHEMA = JSON.stringify({
  type: "object",
  properties: {
    answer:    { type: "string", description: "Synthesized answer to the question" },
    citations: {
      type: "object",
      properties: {
        concept_ids: { type: "array", items: { type: "number" }, description: "IDs of concepts that informed the answer" },
        episode_ids: { type: "array", items: { type: "number" }, description: "IDs of episodes that informed the answer" },
        edge_ids:    { type: "array", items: { type: "number" }, description: "IDs of edges that informed the answer" },
      },
      required: ["concept_ids", "episode_ids", "edge_ids"],
    },
    reasoning: { type: "string", description: "Brief explanation of how the answer was derived" },
  },
  required: ["answer", "citations", "reasoning"],
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
      env: clean_env()
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
  let prompt = `You are a knowledge synthesis system for Brane, an agent memory layer. You answer questions using ONLY the context provided below — do not use outside knowledge.

## Rules
1. Answer based strictly on the provided concepts, edges, and episodes
2. If the context doesn't contain enough information, say so explicitly
3. Cite specific items by their IDs in the citations field
4. Be concise and direct — synthesize, don't just list
5. Connect related pieces of information to form a coherent answer
6. When episodes contradict each other, note the contradiction`

  if (lens_prompt) {
    prompt += `\n\n## Active Lens\n${lens_prompt}`
  }

  prompt += `\n\nReturn your answer as structured JSON.`
  return prompt
}

function build_user_prompt(request: AskRequest): string {
  const parts: string[] = [`Question: ${request.question}\n`]

  if (request.concepts.length > 0) {
    parts.push("## Concepts")
    for (const c of request.concepts) {
      const score = c.score != null ? ` (relevance: ${c.score.toFixed(3)})` : ""
      parts.push(`- [#${c.id}] ${c.name} (${c.type})${score}`)
    }
    parts.push("")
  }

  if (request.edges.length > 0) {
    parts.push("## Relationships")
    for (const e of request.edges) {
      parts.push(`- [edge #${e.id}] ${e.source_name} → ${e.target_name} (${e.relation})`)
    }
    parts.push("")
  }

  if (request.episodes.length > 0) {
    parts.push("## Memories (Episodes)")
    for (const ep of request.episodes) {
      const tags = ep.tags?.length ? ` [${ep.tags.join(", ")}]` : ""
      const ctx = ep.context ? ` — context: ${ep.context}` : ""
      parts.push(`- [#${ep.id}] ${ep.observation}${ctx}${tags}`)
    }
    parts.push("")
  }

  if (request.concepts.length === 0 && request.episodes.length === 0) {
    parts.push("(No relevant context found in the knowledge graph)")
  }

  return parts.join("\n")
}

//
// Mock implementation
//
function mock_ask(request: AskRequest): AskResult {
  const concept_ids = request.concepts.map(c => c.id)
  const episode_ids = request.episodes.map(e => e.id)
  const edge_ids = request.edges.map(e => e.id)

  const parts: string[] = []
  if (request.concepts.length > 0) {
    parts.push(`Based on ${request.concepts.length} concepts`)
  }
  if (request.episodes.length > 0) {
    parts.push(`${request.episodes.length} memories`)
  }
  const answer = parts.length > 0
    ? `${parts.join(" and ")}: ${request.concepts[0]?.name ?? "unknown"} is relevant to "${request.question}".`
    : `No relevant context found for: "${request.question}".`

  return {
    answer,
    citations: { concept_ids, episode_ids, edge_ids },
    reasoning: "Mock synthesis",
  }
}

//
// Real implementation
//
async function cli_ask(request: AskRequest): Promise<AskResult> {
  const cli = process.env.BRANE_LLM_CLI ?? "claude"
  const system_prompt = build_system_prompt(request.lens_prompt)
  const user_prompt = build_user_prompt(request)

  const args = [
    cli,
    "-p",
    "--output-format", "json",
    "--system-prompt", system_prompt,
    "--json-schema", ASK_SCHEMA,
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
    answer: String(output.answer ?? ""),
    citations: {
      concept_ids: Array.isArray(output.citations?.concept_ids) ? output.citations.concept_ids : [],
      episode_ids: Array.isArray(output.citations?.episode_ids) ? output.citations.episode_ids : [],
      edge_ids: Array.isArray(output.citations?.edge_ids) ? output.citations.edge_ids : [],
    },
    reasoning: String(output.reasoning ?? ""),
  }
}

//
// Public API
//
export async function ask_knowledge(request: AskRequest): Promise<AskResult> {
  if (is_mock_mode()) {
    return mock_ask(request)
  }
  return await cli_ask(request)
}
