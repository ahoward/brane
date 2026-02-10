//
// cli.ts - shell out to LLM CLI programs for extraction
//
// Adapter pattern: shells out to `claude` (or future: `gemini`, etc.)
// No auth management. No SDKs. Trust the ENV.
//

import type { LlmBackend, LlmExtractionRequest, LlmExtractionResult } from "./types.ts"
import { spawn } from "node:child_process"

const MAX_CONTENT_BYTES = 100_000

const EXTRACTION_SCHEMA = JSON.stringify({
  type: "object",
  properties: {
    concepts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          type: { type: "string" }
        },
        required: ["name", "type"]
      }
    },
    edges: {
      type: "array",
      items: {
        type: "object",
        properties: {
          source_name: { type: "string" },
          target_name: { type: "string" },
          relation:    { type: "string" },
          weight:      { type: "number" }
        },
        required: ["source_name", "target_name", "relation"]
      }
    }
  },
  required: ["concepts", "edges"]
})

function build_system_prompt(request: LlmExtractionRequest): string {
  let types_section = `- Entity: A code component (service, module, class, function)
- Caveat: A constraint or warning about code behavior
- Rule: A governance rule for verification`

  for (const t of request.golden_types) {
    if (!["Entity", "Caveat", "Rule"].includes(t.type)) {
      types_section += `\n- ${t.type}: ${t.description}`
    }
  }

  let relations_section = `- DEPENDS_ON: Source requires target to function
- CONFLICTS_WITH: Mutual exclusion constraint
- DEFINED_IN: Concept is defined in a file`

  for (const r of request.golden_relations) {
    if (!["DEPENDS_ON", "CONFLICTS_WITH", "DEFINED_IN"].includes(r.rel)) {
      relations_section += `\n- ${r.rel}: ${r.description}${r.symmetric ? " (symmetric)" : ""}`
    }
  }

  return `You are a knowledge extraction system for Brane. Analyze the source file and identify structural concepts and their relationships.

## Concept Types
${types_section}

## Relationship Types
${relations_section}

## Guidelines
1. Extract meaningful architectural units, not every variable
2. PascalCase for Entity names: "AuthService", "UserModule"
3. Every edge source/target must exactly match a concept name you return
4. Prefer fewer, higher-quality concepts over many speculative ones
5. For ~100-500 line files: 2-8 concepts, 1-5 edges
6. Weight: 1.0 = hard dependency, 0.5 = moderate, 0.1 = weak

Return your extraction as structured JSON.`
}

function build_user_prompt(request: LlmExtractionRequest): string {
  let content = request.file_content
  if (Buffer.byteLength(content, "utf-8") > MAX_CONTENT_BYTES) {
    content = content.slice(0, MAX_CONTENT_BYTES) + "\n\n[... truncated at 100KB ...]"
  }

  return `Extract concepts and relationships from this file.\n\nFile: ${request.file_path}\n\n\`\`\`\n${content}\n\`\`\``
}

function run_cli(args: string[], stdin: string): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(args[0], args.slice(1), {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env }
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

export class CliLlmBackend implements LlmBackend {
  async extract(request: LlmExtractionRequest): Promise<LlmExtractionResult> {
    const cli = process.env.BRANE_LLM_CLI ?? "claude"
    const system_prompt = build_system_prompt(request)
    const user_prompt = build_user_prompt(request)

    const args = [
      cli,
      "-p",
      "--output-format", "json",
      "--system-prompt", system_prompt,
      "--json-schema", EXTRACTION_SCHEMA,
      "--no-session-persistence",
    ]

    const result = await run_cli(args, user_prompt)

    if (result.code !== 0) {
      throw new Error(`${cli} exited with code ${result.code}: ${result.stderr || result.stdout}`)
    }

    // Parse the CLI JSON envelope
    let envelope: any
    try {
      envelope = JSON.parse(result.stdout)
    } catch {
      throw new Error(`${cli} returned invalid JSON: ${result.stdout.slice(0, 200)}`)
    }

    // claude CLI puts structured output in .structured_output
    const extraction = envelope.structured_output ?? envelope.result ?? envelope
    if (!extraction || typeof extraction !== "object") {
      throw new Error(`${cli} returned no structured output`)
    }

    return {
      concepts: (extraction.concepts ?? []).map((c: any) => ({
        name: String(c.name ?? ""),
        type: String(c.type ?? "Entity")
      })),
      edges: (extraction.edges ?? []).map((e: any) => ({
        source_name: String(e.source_name ?? ""),
        target_name: String(e.target_name ?? ""),
        relation:    String(e.relation ?? "DEPENDS_ON"),
        weight:      typeof e.weight === "number" ? e.weight : undefined
      }))
    }
  }
}
