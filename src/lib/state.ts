//
// state.ts - brane-wide state management via .brane/state.db
//
// The keystone of multi-lens: centralized path resolution for body.db and mind.db.
// Detects flat layout, new layout, and hybrid states.
//

import { resolve } from "node:path"
import { existsSync, readdirSync, statSync } from "node:fs"
import { Database } from "bun:sqlite"

export interface LensPaths {
  brane_path:   string
  body_db_path: string
  mind_db_path: string
  lens_name:    string
}

// Reserved names that cannot be used as lens names
const RESERVED_NAMES = new Set([
  "create", "list", "use", "delete", "migrate", "show",
  "import", "export", "stats", "bless",
  ".", "..", "default"
])

// Validate lens name: alphanumeric, hyphens, underscores only. Not empty. Not reserved.
export function is_valid_lens_name(name: string): boolean {
  if (!name || typeof name !== "string") return false
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(name)) return false
  if (RESERVED_NAMES.has(name)) return false
  return true
}

// "default" is special — always valid as an active lens, but cannot be created via /lens/create
export function is_valid_active_lens_name(name: string): boolean {
  if (name === "default") return true
  return is_valid_lens_name(name)
}

// Open state.db (read/write). Returns null if not found.
export function open_state(): Database | null {
  const brane_path = resolve(process.cwd(), ".brane")
  const state_db_path = resolve(brane_path, "state.db")

  if (!existsSync(state_db_path)) return null

  try {
    const db = new Database(state_db_path)
    return db
  } catch {
    return null
  }
}

// Check if state.db exists
export function has_state(): boolean {
  const brane_path = resolve(process.cwd(), ".brane")
  const state_db_path = resolve(brane_path, "state.db")
  return existsSync(state_db_path)
}

// Get active lens name from state.db. Falls back to "default" only if state.db doesn't exist.
// Throws if state.db exists but cannot be read (corruption, lock, etc.)
export function get_active_lens(): string {
  const db = open_state()
  if (!db) return "default"  // no state.db → flat layout → default

  try {
    const row = db.query("SELECT value FROM config WHERE key = ?").get("active_lens") as { value: string } | null
    db.close()
    return row?.value ?? "default"
  } catch (err) {
    db.close()
    throw new Error(`failed to read active lens from state.db: ${err instanceof Error ? err.message : String(err)}`)
  }
}

// Set active lens in state.db
export function set_active_lens(name: string): void {
  const db = open_state()
  if (!db) return

  try {
    db.run("INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)", ["active_lens", name])
    db.close()
  } catch {
    db.close()
  }
}

// List all lens names. Combines directory scan + flat layout detection.
export function list_lenses(): string[] {
  const brane_path = resolve(process.cwd(), ".brane")
  const lens_dir = resolve(brane_path, "lens")
  const lenses: string[] = []

  // Check for lens directory entries
  if (existsSync(lens_dir)) {
    try {
      const entries = readdirSync(lens_dir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory()) {
          lenses.push(entry.name)
        }
      }
    } catch {
      // ignore read errors
    }
  }

  // If no "default" lens directory exists, check for flat layout
  if (!lenses.includes("default")) {
    const flat_body = resolve(brane_path, "body.db")
    const flat_mind = resolve(brane_path, "mind.db")
    if (existsSync(flat_body) || existsSync(flat_mind)) {
      lenses.unshift("default")
    }
  }

  // Ensure "default" always appears if nothing else found
  if (lenses.length === 0) {
    lenses.push("default")
  }

  return lenses.sort()
}

// Check if a lens exists (either as directory or flat layout for "default")
export function lens_exists(name: string): boolean {
  const brane_path = resolve(process.cwd(), ".brane")

  if (name === "default") {
    // "default" exists if:
    // 1. .brane/lens/default/ directory exists, OR
    // 2. flat layout (.brane/body.db or .brane/mind.db) exists
    const lens_default_dir = resolve(brane_path, "lens", "default")
    if (existsSync(lens_default_dir)) return true
    const flat_body = resolve(brane_path, "body.db")
    const flat_mind = resolve(brane_path, "mind.db")
    return existsSync(flat_body) || existsSync(flat_mind)
  }

  // Named lens: check .brane/lens/{name}/ directory
  const lens_path = resolve(brane_path, "lens", name)
  return existsSync(lens_path) && statSync(lens_path).isDirectory()
}

// Resolve paths for the active (or specified) lens.
// Handles flat layout, new layout, and hybrid states.
export function resolve_lens_paths(lens_name?: string): LensPaths {
  const brane_path = resolve(process.cwd(), ".brane")
  const name = lens_name ?? get_active_lens()

  if (name === "default") {
    // New layout takes precedence over flat layout
    const lens_default_dir = resolve(brane_path, "lens", "default")
    if (existsSync(lens_default_dir)) {
      return {
        brane_path,
        body_db_path: resolve(lens_default_dir, "body.db"),
        mind_db_path: resolve(lens_default_dir, "mind.db"),
        lens_name:    "default"
      }
    }

    // Flat layout fallback
    return {
      brane_path,
      body_db_path: resolve(brane_path, "body.db"),
      mind_db_path: resolve(brane_path, "mind.db"),
      lens_name:    "default"
    }
  }

  // Named lens: .brane/lens/{name}/
  const lens_dir = resolve(brane_path, "lens", name)
  return {
    brane_path,
    body_db_path: resolve(lens_dir, "body.db"),
    mind_db_path: resolve(lens_dir, "mind.db"),
    lens_name:    name
  }
}

//
// Lens prompt management
//

export interface LensPromptInfo {
  name:        string
  prompt:      string
  description: string
  active:      boolean
  created_at:  string
}

// Ensure lens_prompts table exists (idempotent, for cases where state.db was created before this feature)
function ensure_lens_prompts_table(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS lens_prompts (
      name        TEXT PRIMARY KEY,
      prompt      TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      active      INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
}

// Save or update a lens prompt
export function set_lens_prompt(name: string, prompt: string, description?: string): boolean {
  const db = open_state()
  if (!db) return false
  try {
    ensure_lens_prompts_table(db)
    db.run(
      "INSERT OR REPLACE INTO lens_prompts (name, prompt, description, active, created_at) VALUES (?, ?, ?, COALESCE((SELECT active FROM lens_prompts WHERE name = ?), 0), datetime('now'))",
      [name, prompt, description ?? "", name],
    )
    db.close()
    return true
  } catch {
    db.close()
    return false
  }
}

// Get a single lens prompt
export function get_lens_prompt(name: string): LensPromptInfo | null {
  const db = open_state()
  if (!db) return null
  try {
    ensure_lens_prompts_table(db)
    const row = db.query("SELECT name, prompt, description, active, created_at FROM lens_prompts WHERE name = ?").get(name) as any
    db.close()
    if (!row) return null
    return { name: row.name, prompt: row.prompt, description: row.description, active: !!row.active, created_at: row.created_at }
  } catch {
    db.close()
    return null
  }
}

// Delete a lens prompt
export function delete_lens_prompt(name: string): boolean {
  const db = open_state()
  if (!db) return false
  try {
    ensure_lens_prompts_table(db)
    db.run("DELETE FROM lens_prompts WHERE name = ?", [name])
    db.close()
    return true
  } catch {
    db.close()
    return false
  }
}

// Activate a lens prompt
export function activate_lens_prompt(name: string): boolean {
  const db = open_state()
  if (!db) return false
  try {
    ensure_lens_prompts_table(db)
    const row = db.query("SELECT 1 FROM lens_prompts WHERE name = ?").get(name)
    if (!row) { db.close(); return false }
    db.run("UPDATE lens_prompts SET active = 1 WHERE name = ?", [name])
    db.close()
    return true
  } catch {
    db.close()
    return false
  }
}

// Deactivate a lens prompt
export function deactivate_lens_prompt(name: string): boolean {
  const db = open_state()
  if (!db) return false
  try {
    ensure_lens_prompts_table(db)
    db.run("UPDATE lens_prompts SET active = 0 WHERE name = ?", [name])
    db.close()
    return true
  } catch {
    db.close()
    return false
  }
}

// List all lens prompts
export function list_lens_prompts(): LensPromptInfo[] {
  const db = open_state()
  if (!db) return []
  try {
    ensure_lens_prompts_table(db)
    const rows = db.query("SELECT name, prompt, description, active, created_at FROM lens_prompts ORDER BY name").all() as any[]
    db.close()
    return rows.map(r => ({ name: r.name, prompt: r.prompt, description: r.description, active: !!r.active, created_at: r.created_at }))
  } catch {
    db.close()
    return []
  }
}

// Get combined prompt from all active lens prompts
export function get_active_lens_prompts(): string | undefined {
  const db = open_state()
  if (!db) return undefined
  try {
    ensure_lens_prompts_table(db)
    const rows = db.query("SELECT name, prompt FROM lens_prompts WHERE active = 1 ORDER BY name").all() as { name: string; prompt: string }[]
    db.close()
    if (rows.length === 0) return undefined
    return rows.map(r => `## Lens: ${r.name}\n${r.prompt}`).join("\n\n")
  } catch {
    db.close()
    return undefined
  }
}
