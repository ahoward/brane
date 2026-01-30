//
// config.ts - load .brane/config.json
//

import { resolve } from "node:path"
import { existsSync, readFileSync } from "node:fs"

export type LLMProvider = "claude" | "gemini"

export interface LLMConfig {
  provider?: LLMProvider
}

export interface BraneConfig {
  llm?: LLMConfig
}

export interface ConfigResult {
  config: BraneConfig | null
  error:  string | null
}

/**
 * Load .brane/config.json from the current working directory.
 * Returns null config if file doesn't exist (not an error).
 * Returns error only if file exists but is invalid JSON or has invalid values.
 */
export function load_config(): ConfigResult {
  const brane_path = resolve(process.cwd(), ".brane")
  const config_path = resolve(brane_path, "config.json")

  if (!existsSync(config_path)) {
    return { config: null, error: null }
  }

  try {
    const content = readFileSync(config_path, "utf-8")
    const config = JSON.parse(content) as BraneConfig

    // Validate config structure
    const validation_error = validate_config(config)
    if (validation_error) {
      return { config: null, error: validation_error }
    }

    return { config, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { config: null, error: `failed to parse .brane/config.json: ${message}` }
  }
}

/**
 * Validate config structure and values.
 * Returns error message if invalid, null if valid.
 */
function validate_config(config: BraneConfig): string | null {
  // Config must be an object
  if (typeof config !== "object" || config === null) {
    return "config must be an object"
  }

  // Validate llm section if present
  if (config.llm !== undefined) {
    if (typeof config.llm !== "object" || config.llm === null) {
      return "config.llm must be an object"
    }

    // Validate provider if present
    if (config.llm.provider !== undefined) {
      if (typeof config.llm.provider !== "string") {
        return "config.llm.provider must be a string"
      }
      if (!is_valid_provider(config.llm.provider)) {
        return `config.llm.provider must be "claude" or "gemini", got "${config.llm.provider}"`
      }
    }
  }

  return null
}

/**
 * Get the preferred LLM provider from config, or null if not set.
 */
export function get_preferred_provider(): LLMProvider | null {
  const { config, error } = load_config()

  if (error || !config) {
    return null
  }

  return config.llm?.provider ?? null
}

/**
 * Validate that a provider string is valid.
 */
export function is_valid_provider(provider: string): provider is LLMProvider {
  return provider === "claude" || provider === "gemini"
}
