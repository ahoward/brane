//
// loop.ts - LLM-powered reflection for autonomous research loops
//
// Examines current knowledge vs goal, identifies gaps, proposes
// web search queries to fill them. Detects convergence.
//

import { spawn } from "node:child_process"
import { is_mock_mode } from "./index.ts"

export interface ReflectRequest {
  goal:           string
  concepts:       { id: number; name: string; type: string }[]
  episodes:       { id: number; observation: string; context?: string; tags?: string[] }[]
  search_history: string[]   // queries already searched (avoid repeats)
  round:          number
  total_rounds:   number
  lens_prompt?:   string
}

export interface ReflectResult {
  gaps:       string[]    // what's missing from current knowledge
  queries:    string[]    // web search queries to fill gaps
  assessment: string      // current state of knowledge vs goal
  converging: boolean     // true if knowledge is approaching completeness
}

const REFLECT_SCHEMA = JSON.stringify({
  type: "object",
  properties: {
    gaps:       { type: "array", items: { type: "string" }, description: "Knowledge gaps relative to the goal" },
    queries:    { type: "array", items: { type: "string" }, description: "Web search queries to fill gaps (2-4 queries)" },
    assessment: { type: "string", description: "Assessment of current knowledge completeness" },
    converging: { type: "boolean", description: "True if knowledge is approaching goal completeness" },
  },
  required: ["gaps", "queries", "assessment", "converging"],
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
  let prompt = `You are a research planning system for Brane, an agent memory layer. Given a research goal and current knowledge, you:

1. Identify GAPS — what's missing relative to the goal
2. Propose QUERIES — web search queries to fill those gaps (2-4 queries)
3. ASSESS — how complete is current knowledge toward the goal
4. Detect CONVERGENCE — is knowledge approaching completeness

## Rules
- Do NOT repeat queries from the search history
- Queries should be specific and actionable
- If knowledge is mostly complete, set converging=true
- If no useful queries remain, return empty queries array and converging=true
- Assessment should be 1-2 sentences`

  if (lens_prompt) {
    prompt += `\n\n## Active Lens\n${lens_prompt}`
  }

  prompt += `\n\nReturn your analysis as structured JSON.`
  return prompt
}

function build_user_prompt(request: ReflectRequest): string {
  const parts: string[] = []

  parts.push(`## Research Goal\n${request.goal}\n`)
  parts.push(`## Round ${request.round}/${request.total_rounds}\n`)

  if (request.search_history.length > 0) {
    parts.push("## Previous Searches (do NOT repeat)")
    for (const q of request.search_history) {
      parts.push(`- "${q}"`)
    }
    parts.push("")
  }

  if (request.concepts.length > 0) {
    parts.push("## Current Knowledge (Concepts)")
    for (const c of request.concepts.slice(0, 20)) {
      parts.push(`- ${c.name} (${c.type})`)
    }
    if (request.concepts.length > 20) {
      parts.push(`  ... and ${request.concepts.length - 20} more`)
    }
    parts.push("")
  }

  if (request.episodes.length > 0) {
    parts.push("## Current Knowledge (Episodes)")
    for (const ep of request.episodes.slice(0, 15)) {
      parts.push(`- ${ep.observation}`)
    }
    if (request.episodes.length > 15) {
      parts.push(`  ... and ${request.episodes.length - 15} more`)
    }
    parts.push("")
  }

  if (request.concepts.length === 0 && request.episodes.length === 0) {
    parts.push("(No relevant knowledge yet — this is the first round)")
  }

  parts.push("\nWhat gaps exist? What should be searched next?")

  return parts.join("\n")
}

//
// Mock implementation
//
function mock_reflect(request: ReflectRequest): ReflectResult {
  const round = request.round
  const converging = round >= 2 || request.concepts.length > 5

  return {
    gaps: converging
      ? ["Minor details remain"]
      : [`Core understanding of "${request.goal}" needed`, "Practical examples missing"],
    queries: converging
      ? []
      : [`${request.goal} overview`, `${request.goal} best practices`].filter(q => !request.search_history.includes(q)),
    assessment: converging
      ? `Good coverage of "${request.goal}" after ${round} rounds.`
      : `Early stage research on "${request.goal}". Key concepts not yet identified.`,
    converging,
  }
}

//
// Real implementation
//
async function cli_reflect(request: ReflectRequest): Promise<ReflectResult> {
  const cli = process.env.BRANE_LLM_CLI ?? "claude"
  const system_prompt = build_system_prompt(request.lens_prompt)
  const user_prompt = build_user_prompt(request)

  const args = [
    cli,
    "-p",
    "--output-format", "json",
    "--system-prompt", system_prompt,
    "--json-schema", REFLECT_SCHEMA,
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
    gaps:       Array.isArray(output.gaps) ? output.gaps : [],
    queries:    Array.isArray(output.queries) ? output.queries : [],
    assessment: String(output.assessment ?? ""),
    converging: !!output.converging,
  }
}

//
// Public API
//
export async function reflect_on_goal(request: ReflectRequest): Promise<ReflectResult> {
  if (is_mock_mode()) {
    return mock_reflect(request)
  }
  return await cli_reflect(request)
}
