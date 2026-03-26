//
// consolidate.ts - LLM-powered cluster naming for episode consolidation
//
// Shells out to CLI (same pattern as cli.ts extraction).
// Mock mode returns deterministic names from the first observation.
//

import { spawn } from "node:child_process"
import { is_mock_mode } from "./index.ts"

interface ClusterNaming {
  name: string
  type: string
}

//
// Strip agent-nesting env vars so child CLI tools don't refuse to run.
//
const AGENT_NESTING_VARS = [
  "CLAUDECODE",
  "CLAUDE_CODE",
  "GEMINI_SESSION",
]

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

const NAMING_SCHEMA = JSON.stringify({
  type: "object",
  properties: {
    name: { type: "string", description: "PascalCase concept name (e.g. AuthMiddlewareFragility)" },
    type: { type: "string", description: "Concept type: Entity or Caveat" }
  },
  required: ["name", "type"]
})

const SYSTEM_PROMPT = `You are a knowledge consolidation system. Given a cluster of related episodic memories (observations from an AI agent), propose a single concept name that captures the common theme.

## Rules
1. Name must be PascalCase (e.g. AuthMiddlewareFragility, DatabasePerformanceBottleneck)
2. Type must be either "Entity" (a thing/component) or "Caveat" (a warning/constraint/known issue)
3. The name should be specific enough to distinguish from other concepts
4. Prefer Caveat type for recurring problems, failures, or warnings
5. Prefer Entity type for components, services, or patterns

Return your answer as structured JSON.`

//
// Mock implementation: deterministic naming from first observation
//
function mock_name_cluster(observations: string[]): ClusterNaming {
  // Extract first significant word from first observation
  const first = observations[0] || "Unknown"
  const words = first.split(/\s+/).filter(w => w.length > 3)
  const key_word = words[0] || "Unknown"
  const name = key_word.charAt(0).toUpperCase() + key_word.slice(1) + "Issue"
  return { name, type: "Caveat" }
}

//
// Real implementation: shell out to LLM CLI
//
async function cli_name_cluster(observations: string[]): Promise<ClusterNaming> {
  const cli = process.env.BRANE_LLM_CLI ?? "claude"

  const user_prompt = `Here are ${observations.length} related episodic memories from an AI agent. Propose a single concept name that captures their common theme.

${observations.map((obs, i) => `${i + 1}. ${obs}`).join("\n")}

What concept name and type best represents this cluster?`

  const args = [
    cli,
    "-p",
    "--output-format", "json",
    "--system-prompt", SYSTEM_PROMPT,
    "--json-schema", NAMING_SCHEMA,
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

  const naming = envelope.structured_output ?? envelope.result ?? envelope
  if (!naming || typeof naming !== "object") {
    throw new Error(`${cli} returned no structured output`)
  }

  return {
    name: String(naming.name ?? "UnknownConcept"),
    type: String(naming.type ?? "Caveat")
  }
}

//
// Public API
//
export async function name_cluster(observations: string[]): Promise<ClusterNaming> {
  if (is_mock_mode()) {
    return mock_name_cluster(observations)
  }
  return await cli_name_cluster(observations)
}
