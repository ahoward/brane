//
// llm.ts - LLM CLI wrapper for concept extraction
//

import { get_preferred_provider, is_valid_provider, type LLMProvider } from "./config.ts"
import { build_full_prompt, detect_language, truncate_content } from "./prompts.ts"

//
// Types
//

export interface ConceptInput {
  name: string
  type: "Entity" | "Rule" | "Caveat"
}

export interface EdgeInput {
  source_name: string
  target_name: string
  relation:    "DEPENDS_ON" | "CONFLICTS_WITH" | "DEFINED_IN"
}

export interface ExtractionResponse {
  concepts: ConceptInput[]
  edges:    EdgeInput[]
}

export interface ExtractionResult {
  response:  ExtractionResponse | null
  error:     string | null
  provider:  LLMProvider | null
  truncated: boolean
}

export interface ProviderResult {
  provider: LLMProvider | null
  error:    string | null
}

//
// Mock mode for testing
//

function is_mock_mode(): boolean {
  return process.env.BRANE_LLM_MOCK === "1"
}

/**
 * Return a deterministic mock response based on content.
 * Used for tc tests to ensure reproducibility.
 */
function mock_extract(file_url: string, content: string): ExtractionResponse {
  // For testing: extract simple concepts from content patterns
  const concepts: ConceptInput[] = []
  const edges: EdgeInput[] = []

  // Look for class/interface definitions
  const class_matches = content.matchAll(/(?:class|interface)\s+(\w+)/g)
  for (const match of class_matches) {
    concepts.push({ name: match[1], type: "Entity" })
  }

  // Look for function definitions
  const func_matches = content.matchAll(/(?:function|async function|export function|export async function)\s+(\w+)/g)
  for (const match of func_matches) {
    concepts.push({ name: match[1], type: "Entity" })
  }

  // Look for TODO/FIXME comments
  const todo_matches = content.matchAll(/(?:TODO|FIXME|XXX):\s*(.+)/gi)
  for (const match of todo_matches) {
    const name = match[1].slice(0, 30).replace(/\s+/g, "_").toLowerCase()
    concepts.push({ name: `todo_${name}`, type: "Caveat" })
  }

  // Create DEPENDS_ON edges between consecutive concepts
  for (let i = 1; i < concepts.length && i < 5; i++) {
    edges.push({
      source_name: concepts[i].name,
      target_name: concepts[0].name,
      relation:    "DEPENDS_ON"
    })
  }

  return { concepts, edges }
}

//
// Provider detection
//

/**
 * Check if a CLI command exists.
 */
async function cli_exists(cmd: string): Promise<boolean> {
  try {
    const proc = Bun.spawn(["which", cmd], {
      stdout: "pipe",
      stderr: "pipe",
    })
    const exit_code = await proc.exited
    return exit_code === 0
  } catch {
    return false
  }
}

/**
 * Detect which LLM CLI is available.
 * Priority: config preference > claude > gemini
 */
export async function detect_provider(): Promise<ProviderResult> {
  // Check config preference first
  const preferred = get_preferred_provider()

  if (preferred) {
    if (!is_valid_provider(preferred)) {
      return { provider: null, error: `invalid provider in config: ${preferred}` }
    }

    const exists = await cli_exists(preferred)
    if (!exists) {
      return { provider: null, error: `configured provider '${preferred}' CLI not found (install it or remove preference from .brane/config.json)` }
    }

    return { provider: preferred, error: null }
  }

  // Auto-detect: prefer claude, fall back to gemini
  if (await cli_exists("claude")) {
    return { provider: "claude", error: null }
  }

  if (await cli_exists("gemini")) {
    return { provider: "gemini", error: null }
  }

  return { provider: null, error: "no LLM CLI found (install claude or gemini)" }
}

//
// CLI invocation
//

/**
 * Call the LLM CLI with a prompt and return the response.
 */
async function call_cli(provider: LLMProvider, prompt: string): Promise<{ output: string; error: string | null }> {
  const args = provider === "claude"
    ? ["claude", "--print", "--output-format", "json", "-p", prompt]
    : ["gemini", "--output-format", "json", prompt]

  try {
    const proc = Bun.spawn(args, {
      stdout: "pipe",
      stderr: "pipe",
    })

    const [stdout, stderr, exit_code] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ])

    if (exit_code !== 0) {
      const err_msg = stderr.trim() || `CLI exited with code ${exit_code}`
      return { output: "", error: err_msg }
    }

    return { output: stdout, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { output: "", error: `failed to run ${provider} CLI: ${message}` }
  }
}

/**
 * Parse and validate the LLM response.
 */
function parse_response(output: string): { response: ExtractionResponse | null; error: string | null } {
  // Try to extract JSON from the output (LLM might include extra text)
  let json_str = output.trim()

  // Look for JSON object in output
  const json_match = json_str.match(/\{[\s\S]*\}/)
  if (json_match) {
    json_str = json_match[0]
  }

  try {
    const parsed = JSON.parse(json_str)

    // Validate structure
    if (!parsed || typeof parsed !== "object") {
      return { response: null, error: "response is not an object" }
    }

    if (!Array.isArray(parsed.concepts)) {
      return { response: null, error: "response.concepts is not an array" }
    }

    if (!Array.isArray(parsed.edges)) {
      return { response: null, error: "response.edges is not an array" }
    }

    // Validate concepts
    const valid_types = new Set(["Entity", "Rule", "Caveat"])
    for (const c of parsed.concepts) {
      if (!c.name || typeof c.name !== "string") {
        return { response: null, error: "concept missing name" }
      }
      if (!c.type || !valid_types.has(c.type)) {
        return { response: null, error: `concept '${c.name}' has invalid type: ${c.type}` }
      }
    }

    // Validate edges
    const valid_relations = new Set(["DEPENDS_ON", "CONFLICTS_WITH", "DEFINED_IN"])
    for (const e of parsed.edges) {
      if (!e.source_name || typeof e.source_name !== "string") {
        return { response: null, error: "edge missing source_name" }
      }
      if (!e.target_name || typeof e.target_name !== "string") {
        return { response: null, error: "edge missing target_name" }
      }
      if (!e.relation || !valid_relations.has(e.relation)) {
        return { response: null, error: `edge has invalid relation: ${e.relation}` }
      }
    }

    return { response: parsed as ExtractionResponse, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { response: null, error: `failed to parse JSON: ${message}` }
  }
}

//
// Main extraction function
//

/**
 * Extract concepts from file content using LLM.
 */
export async function extract_from_content(
  file_url: string,
  content:  string
): Promise<ExtractionResult> {
  // Handle mock mode
  if (is_mock_mode()) {
    const { content: truncated_content, truncated } = truncate_content(content)
    const response = mock_extract(file_url, truncated_content)
    return { response, error: null, provider: "claude", truncated }
  }

  // Detect provider
  const { provider, error: provider_error } = await detect_provider()
  if (provider_error || !provider) {
    return { response: null, error: provider_error ?? "no provider", provider: null, truncated: false }
  }

  // Truncate content if needed
  const { content: truncated_content, truncated } = truncate_content(content)

  // Detect language and build prompt
  const language = detect_language(file_url)
  const prompt = build_full_prompt(file_url, truncated_content, language)

  // Call CLI
  const { output, error: cli_error } = await call_cli(provider, prompt)
  if (cli_error) {
    return { response: null, error: cli_error, provider, truncated }
  }

  // Parse response
  const { response, error: parse_error } = parse_response(output)
  if (parse_error) {
    return { response: null, error: parse_error, provider, truncated }
  }

  return { response, error: null, provider, truncated }
}

//
// Binary file detection
//

/**
 * Check if content appears to be binary.
 * Returns true if content has null bytes or high ratio of non-printable characters.
 */
export function is_binary_content(content: string): boolean {
  // Check for null bytes
  if (content.includes("\0")) {
    return true
  }

  // Check ratio of non-printable characters
  let non_printable = 0
  const sample_size = Math.min(content.length, 8000)

  for (let i = 0; i < sample_size; i++) {
    const code = content.charCodeAt(i)
    // Non-printable: not tab, newline, carriage return, or printable ASCII
    if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
      non_printable++
    }
    // Also count high bytes (non-ASCII)
    if (code > 127) {
      non_printable++
    }
  }

  // If more than 10% non-printable, consider it binary
  return non_printable / sample_size > 0.1
}
