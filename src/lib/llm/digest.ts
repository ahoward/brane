//
// digest.ts - LLM-powered knowledge extraction from arbitrary content
//
// Unlike cli.ts (code-specific extraction), digest handles any content:
// articles, docs, notes, URLs — extracting concepts, edges, AND episodes.
//
// Shells out to CLI (same pattern as cli.ts and consolidate.ts).
//

import { spawn } from "node:child_process"
import { is_mock_mode } from "./index.ts"

export interface DigestRequest {
  content:      string
  label:        string     // source identifier (filename, URL, "stdin")
  lens_prompt?: string     // active lens extraction instructions
}

export interface DigestResult {
  concepts: { name: string; type: string }[]
  edges:    { source_name: string; target_name: string; relation: string }[]
  episodes: { observation: string; context: string; tags: string[] }[]
  reasoning: string
}

const MAX_CONTENT_BYTES = 100_000

const DIGEST_SCHEMA = JSON.stringify({
  type: "object",
  properties: {
    concepts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "PascalCase name for the concept" },
          type: { type: "string", description: "Concept type: Entity, Caveat, Rule, or custom" }
        },
        required: ["name", "type"]
      }
    },
    edges: {
      type: "array",
      items: {
        type: "object",
        properties: {
          source_name: { type: "string", description: "Exact name of source concept" },
          target_name: { type: "string", description: "Exact name of target concept" },
          relation:    { type: "string", description: "Relationship type: DEPENDS_ON, CONFLICTS_WITH, etc." }
        },
        required: ["source_name", "target_name", "relation"]
      }
    },
    episodes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          observation: { type: "string", description: "Key fact, decision, or insight" },
          context:     { type: "string", description: "What situation this relates to" },
          tags:        { type: "array", items: { type: "string" }, description: "Tags: decision, fact, caveat, lesson, preference, event" }
        },
        required: ["observation", "context", "tags"]
      }
    },
    reasoning: { type: "string", description: "Brief explanation of extraction choices" }
  },
  required: ["concepts", "edges", "episodes", "reasoning"]
})

//
// Strip agent-nesting env vars
//
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
  let prompt = `You are a knowledge extraction system for Brane, an agent memory layer. Analyze the provided content and extract:

1. **Concepts** — named entities, services, components, ideas, people, systems
   - PascalCase names: "AuthService", "JwtTokenExpiry", "RateLimiting"
   - Types: Entity (thing/component), Caveat (warning/constraint), Rule (governance)
   - Use custom types when they fit better than the defaults

2. **Edges** — relationships between concepts you extract
   - Every source_name and target_name MUST exactly match a concept name you return
   - Relations: DEPENDS_ON, CONFLICTS_WITH, DEFINED_IN, or custom (USES, PRODUCES, REPLACES, etc.)

3. **Episodes** — key facts, decisions, insights, and lessons
   - Each episode is a standalone observation that would be useful to recall later
   - Tag with: decision, fact, caveat, lesson, preference, event
   - Context should explain the situation (not repeat the observation)

## Guidelines
- Prefer fewer, higher-quality extractions over many speculative ones
- 3-10 concepts, 2-8 edges, 2-6 episodes for a typical document
- Episodes capture the "so what" — things an agent would want to remember
- Concepts capture the "what" — named things worth tracking
- Edges capture the "how" — how things relate to each other`

  if (lens_prompt) {
    prompt += `\n\n## Active Lens\n${lens_prompt}`
  }

  prompt += `\n\nReturn your extraction as structured JSON.`
  return prompt
}

function build_user_prompt(request: DigestRequest): string {
  let content = request.content
  if (Buffer.byteLength(content, "utf-8") > MAX_CONTENT_BYTES) {
    content = content.slice(0, MAX_CONTENT_BYTES) + "\n\n[... truncated at 100KB ...]"
  }

  return `Extract knowledge from this content.\n\nSource: ${request.label}\n\n---\n${content}\n---`
}

//
// Mock implementation for tests
//
function mock_digest(request: DigestRequest): DigestResult {
  // Extract a concept name from the label
  const label = request.label
  const parts = label.split("/")
  const filename = parts[parts.length - 1]
  const dot = filename.lastIndexOf(".")
  const basename = dot > 0 ? filename.substring(0, dot) : filename
  const name = basename
    .split(/[-_.\s]/)
    .filter(Boolean)
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join("")

  return {
    concepts: [{ name: name || "DigestedContent", type: "Entity" }],
    edges: [],
    episodes: [{
      observation: `Digested content from ${label}`,
      context: "digest",
      tags: ["fact"],
    }],
    reasoning: "Mock digest extraction",
  }
}

//
// Real implementation: shell out to LLM CLI
//
async function cli_digest(request: DigestRequest): Promise<DigestResult> {
  const cli = process.env.BRANE_LLM_CLI ?? "claude"
  const system_prompt = build_system_prompt(request.lens_prompt)
  const user_prompt = build_user_prompt(request)

  const args = [
    cli,
    "-p",
    "--output-format", "json",
    "--system-prompt", system_prompt,
    "--json-schema", DIGEST_SCHEMA,
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

  const extraction = envelope.structured_output ?? envelope.result ?? envelope
  if (!extraction || typeof extraction !== "object") {
    throw new Error(`${cli} returned no structured output`)
  }

  return {
    concepts: (extraction.concepts ?? []).map((c: any) => ({
      name: String(c.name ?? ""),
      type: String(c.type ?? "Entity"),
    })),
    edges: (extraction.edges ?? []).map((e: any) => ({
      source_name: String(e.source_name ?? ""),
      target_name: String(e.target_name ?? ""),
      relation: String(e.relation ?? "DEPENDS_ON"),
    })),
    episodes: (extraction.episodes ?? []).map((ep: any) => ({
      observation: String(ep.observation ?? ""),
      context: String(ep.context ?? ""),
      tags: Array.isArray(ep.tags) ? ep.tags.map(String) : [],
    })),
    reasoning: String(extraction.reasoning ?? ""),
  }
}

//
// Public API
//
export async function digest_content(request: DigestRequest): Promise<DigestResult> {
  if (is_mock_mode()) {
    return mock_digest(request)
  }
  return await cli_digest(request)
}
