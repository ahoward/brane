//
// session-parser.ts - parse Claude Code JSONL session logs
//
// Extracts human↔assistant conversation turns from session logs.
// Filters out tool_result/tool_use machinery to surface actual dialogue.
//

import { readFileSync, readdirSync, statSync, existsSync, openSync, readSync, closeSync } from "node:fs"
import { resolve, join } from "node:path"
import { homedir } from "node:os"

//
// A single conversation turn extracted from a session log
//
export interface SessionTurn {
  role:      "user" | "assistant"
  text:      string
  timestamp: string
}

//
// A parsed session with metadata
//
export interface ParsedSession {
  session_id:   string
  file_path:    string
  project_hash: string
  turns:        SessionTurn[]
  first_ts:     string
  last_ts:      string
}

//
// Discover Claude Code session log directories
//
export function find_session_dirs(): string[] {
  const claude_dir = resolve(homedir(), ".claude", "projects")
  if (!existsSync(claude_dir)) return []

  try {
    return readdirSync(claude_dir)
      .map(name => join(claude_dir, name))
      .filter(p => {
        try { return statSync(p).isDirectory() }
        catch { return false }
      })
  } catch {
    return []
  }
}

//
// Find all session log files in a project directory
//
export function find_session_files(project_dir: string): string[] {
  try {
    return readdirSync(project_dir)
      .filter(name => name.endsWith(".jsonl"))
      .map(name => join(project_dir, name))
      .filter(p => {
        try { return statSync(p).isFile() }
        catch { return false }
      })
      .sort((a, b) => {
        // Sort by modification time, newest first
        try { return statSync(b).mtimeMs - statSync(a).mtimeMs }
        catch { return 0 }
      })
  } catch {
    return []
  }
}

//
// Find session files for the current project (match by cwd)
//
export function find_project_sessions(cwd?: string): string[] {
  const target_cwd = cwd ?? process.cwd()
  const dirs = find_session_dirs()

  const all_files: string[] = []

  for (const dir of dirs) {
    const files = find_session_files(dir)
    for (const file of files) {
      if (session_matches_cwd(file, target_cwd)) {
        all_files.push(file)
      }
    }
  }

  return all_files
}

//
// Check if a session file contains messages from a given working directory.
// Reads only the first 8KB to avoid loading entire files into memory.
//
function session_matches_cwd(file_path: string, target_cwd: string): boolean {
  try {
    const buf = Buffer.alloc(8192)
    const fd = openSync(file_path, "r")
    const bytes_read = readSync(fd, buf, 0, 8192, 0)
    closeSync(fd)

    const head = buf.subarray(0, bytes_read).toString("utf8")
    const lines = head.split("\n")

    for (const line of lines) {
      if (!line.trim()) continue
      try {
        const obj = JSON.parse(line)
        if (obj.cwd && obj.cwd === target_cwd) return true
      } catch {
        continue
      }
    }
    return false
  } catch {
    return false
  }
}

//
// Parse a session JSONL file into conversation turns.
//
// Extracts only actual human text + assistant text responses.
// Skips: tool_result messages, tool_use blocks, progress, queue-operation, system.
//
// Uses Bun.file().text() for efficient reading, then processes line-by-line.
// Session logs are typically 1-40MB; the line-by-line processing avoids
// creating large intermediate arrays.
//
export function parse_session(file_path: string): ParsedSession | null {
  try {
    // Guard: ensure path is a file, not a directory
    if (!statSync(file_path).isFile()) return null
  } catch {
    return null
  }

  try {
    const content = readFileSync(file_path, "utf8")

    const turns: SessionTurn[] = []
    let session_id = ""
    let project_hash = ""
    let first_ts = ""
    let last_ts = ""

    // Extract project hash from path: ~/.claude/projects/{hash}/{session}.jsonl
    const path_parts = file_path.split("/")
    const jsonl_idx = path_parts.findIndex(p => p.endsWith(".jsonl"))
    if (jsonl_idx >= 1) {
      project_hash = path_parts[jsonl_idx - 1]
      session_id = path_parts[jsonl_idx].replace(".jsonl", "")
    }

    // Process line-by-line without splitting into array
    let start = 0
    while (start < content.length) {
      let end = content.indexOf("\n", start)
      if (end === -1) end = content.length
      const line = content.substring(start, end)
      start = end + 1

      if (!line.trim()) continue

      let obj: Record<string, unknown>
      try {
        obj = JSON.parse(line)
      } catch {
        continue
      }

      const type = obj.type as string
      const timestamp = (obj.timestamp ?? "") as string

      if (!session_id && obj.sessionId) {
        session_id = obj.sessionId as string
      }

      if (type === "user") {
        const text = extract_user_text(obj)
        if (text) {
          turns.push({ role: "user", text, timestamp })
          if (!first_ts) first_ts = timestamp
          last_ts = timestamp
        }
      } else if (type === "assistant") {
        const text = extract_assistant_text(obj)
        if (text) {
          turns.push({ role: "assistant", text, timestamp })
          if (!first_ts) first_ts = timestamp
          last_ts = timestamp
        }
      }
    }

    if (turns.length === 0) return null

    return {
      session_id,
      file_path,
      project_hash,
      turns,
      first_ts,
      last_ts,
    }
  } catch {
    return null
  }
}

//
// Extract text from a user message.
// Returns null if message is only tool results (not actual human input).
//
function extract_user_text(obj: Record<string, unknown>): string | null {
  const msg = obj.message as { content?: unknown } | undefined
  if (!msg?.content) return null

  const content = msg.content

  // Direct string content — human typed text
  if (typeof content === "string") {
    const trimmed = content.trim()
    return trimmed.length > 0 ? trimmed : null
  }

  // Array content — look for text blocks that aren't tool results
  if (Array.isArray(content)) {
    const text_blocks = content
      .filter((block: Record<string, unknown>) => block.type === "text")
      .map((block: Record<string, unknown>) => (block.text as string ?? "").trim())
      .filter((t: string) => t.length > 0)

    // If the array ONLY has tool_result blocks (no text blocks), skip it
    const has_tool_results = content.some((block: Record<string, unknown>) => block.type === "tool_result")
    if (has_tool_results && text_blocks.length === 0) return null

    return text_blocks.length > 0 ? text_blocks.join("\n") : null
  }

  return null
}

//
// Extract text from an assistant message.
// Collects only text blocks, skips tool_use blocks.
//
function extract_assistant_text(obj: Record<string, unknown>): string | null {
  const msg = obj.message as { content?: unknown } | undefined
  if (!msg?.content) return null

  const content = msg.content
  if (!Array.isArray(content)) return null

  const text_blocks = content
    .filter((block: Record<string, unknown>) => block.type === "text")
    .map((block: Record<string, unknown>) => (block.text as string ?? "").trim())
    .filter((t: string) => t.length > 0)

  return text_blocks.length > 0 ? text_blocks.join("\n") : null
}

//
// Chunk turns into conversation exchanges for episode creation.
// Groups consecutive user+assistant pairs into exchanges.
// Each exchange becomes one episode.
//
export interface ConversationExchange {
  user_text:      string
  assistant_text: string
  timestamp:      string
}

export function group_exchanges(turns: SessionTurn[]): ConversationExchange[] {
  const exchanges: ConversationExchange[] = []

  let i = 0
  while (i < turns.length) {
    // Collect consecutive user turns
    const user_parts: string[] = []
    let ts = ""
    while (i < turns.length && turns[i].role === "user") {
      user_parts.push(turns[i].text)
      if (!ts) ts = turns[i].timestamp
      i++
    }

    // Collect consecutive assistant turns
    const assistant_parts: string[] = []
    while (i < turns.length && turns[i].role === "assistant") {
      assistant_parts.push(turns[i].text)
      if (!ts) ts = turns[i].timestamp
      i++
    }

    if (user_parts.length > 0 || assistant_parts.length > 0) {
      exchanges.push({
        user_text: user_parts.join("\n"),
        assistant_text: assistant_parts.join("\n"),
        timestamp: ts,
      })
    }
  }

  return exchanges
}
