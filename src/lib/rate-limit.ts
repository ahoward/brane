//
// rate-limit.ts - circuit breaker for LLM-backed tools
//
// In-process tracking of LLM API calls with per-minute and per-session limits.
// Designed to prevent runaway agent loops from making hundreds of expensive API calls.
//
// Critical: consume_llm_call() atomically checks AND records in one synchronous
// step to prevent TOCTOU races from concurrent async operations.
//

export interface RateLimitConfig {
  calls_per_minute:  number  // max LLM calls per rolling minute window
  calls_per_session: number  // max LLM calls per MCP session lifetime
  max_files_per_learn: number  // max files in a single learn operation
}

export interface RateLimitResult {
  allowed: boolean
  error?: string
  calls_this_minute: number
  calls_this_session: number
}

function parse_int_env(name: string, fallback: number): number {
  const raw = process.env[name]
  if (raw === undefined || raw === "") return fallback
  const parsed = parseInt(raw, 10)
  return isNaN(parsed) ? fallback : parsed
}

const DEFAULT_CONFIG: RateLimitConfig = {
  calls_per_minute:    parse_int_env("BRANE_LLM_RATE_LIMIT", 10),
  calls_per_session:   parse_int_env("BRANE_LLM_SESSION_LIMIT", 100),
  max_files_per_learn: parse_int_env("BRANE_MAX_FILES_PER_LEARN", 50),
}

//
// In-process state — resets when the MCP server process starts.
//
let session_call_count = 0
const call_timestamps: number[] = []  // epoch-ms of each LLM call
let config: RateLimitConfig = { ...DEFAULT_CONFIG }

//
// Reset all state (called on MCP session start).
//
export function reset_rate_limiter(): void {
  session_call_count = 0
  call_timestamps.length = 0
  config = {
    calls_per_minute:    parse_int_env("BRANE_LLM_RATE_LIMIT", 10),
    calls_per_session:   parse_int_env("BRANE_LLM_SESSION_LIMIT", 100),
    max_files_per_learn: parse_int_env("BRANE_MAX_FILES_PER_LEARN", 50),
  }
}

//
// Get current config.
//
export function get_rate_limit_config(): RateLimitConfig {
  return { ...config }
}

//
// Check if an LLM call is allowed (does NOT consume a call).
// Use consume_llm_call() instead when you intend to make the call.
//
export function check_rate_limit(): RateLimitResult {
  const now = Date.now()
  const one_minute_ago = now - 60_000

  // Count calls in the last minute
  const calls_this_minute = call_timestamps.filter(t => t > one_minute_ago).length

  // Per-minute check
  if (calls_this_minute >= config.calls_per_minute) {
    return {
      allowed: false,
      error: `Rate limit exceeded: ${calls_this_minute} LLM calls in the last minute (limit: ${config.calls_per_minute}). Wait or reduce batch size.`,
      calls_this_minute,
      calls_this_session: session_call_count,
    }
  }

  // Per-session check
  if (session_call_count >= config.calls_per_session) {
    return {
      allowed: false,
      error: `Session limit exceeded: ${session_call_count} LLM calls this session (limit: ${config.calls_per_session}). Start a new session to continue.`,
      calls_this_minute,
      calls_this_session: session_call_count,
    }
  }

  return {
    allowed: true,
    calls_this_minute,
    calls_this_session: session_call_count,
  }
}

//
// Atomically check rate limit AND record the call in one synchronous step.
// This prevents TOCTOU races where concurrent async operations all pass
// the check before any of them record their call.
//
// Returns { allowed: true } if the call was recorded and may proceed.
// Returns { allowed: false, error } if the limit is exceeded — call NOT recorded.
//
export function consume_llm_call(): RateLimitResult {
  const result = check_rate_limit()
  if (result.allowed) {
    session_call_count++
    call_timestamps.push(Date.now())
    prune_timestamps()
  }
  return result
}

//
// Record an LLM call without checking limits (for force mode / CLI usage).
//
export function record_llm_call(): void {
  session_call_count++
  call_timestamps.push(Date.now())
  prune_timestamps()
}

//
// Prune old timestamps to prevent unbounded growth.
//
function prune_timestamps(): void {
  const cutoff = Date.now() - 60_000
  while (call_timestamps.length > 0 && call_timestamps[0] < cutoff) {
    call_timestamps.shift()
  }
}

//
// Check file count against learn limit.
//
export function check_file_count(file_count: number): { allowed: boolean; error?: string } {
  if (file_count > config.max_files_per_learn) {
    return {
      allowed: false,
      error: `File count (${file_count}) exceeds max_files_per_learn (${config.max_files_per_learn}). Use a more specific path to reduce file count.`,
    }
  }
  return { allowed: true }
}

//
// Get session stats for diagnostics.
//
export function get_session_stats(): { calls_this_session: number; calls_last_minute: number; config: RateLimitConfig } {
  const now = Date.now()
  const one_minute_ago = now - 60_000
  const calls_last_minute = call_timestamps.filter(t => t > one_minute_ago).length

  return {
    calls_this_session: session_call_count,
    calls_last_minute,
    config: { ...config },
  }
}
