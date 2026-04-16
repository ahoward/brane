//
// memories.ts - SQLite audit trail for the hippocampus
//
// Every remember/forget is logged here alongside the graph write.
// CozoDB (mind.db) is the query engine. This is the readable ledger.
//

import { resolve } from "node:path"
import { existsSync } from "node:fs"
import { Database } from "bun:sqlite"
import { resolve_lens_paths } from "./state.ts"

//
// Types
//

export interface Memory {
  id:           string
  what:         string
  from_source:  string
  tags:         string[]
  agent:        string
  graph_id:     number | null
  created:      string
  tombstoned:   boolean
}

export interface MemoryWrite {
  what:         string
  from_source?: string
  tags?:        string[]
  agent:        string
  graph_id?:    number
}

//
// Schema
//

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS memories (
    id            TEXT PRIMARY KEY,
    what          TEXT NOT NULL,
    from_source   TEXT NOT NULL DEFAULT 'self',
    tags          TEXT NOT NULL DEFAULT '[]',
    agent         TEXT NOT NULL,
    graph_id      INTEGER,
    created       TEXT NOT NULL DEFAULT (datetime('now')),
    tombstoned    INTEGER NOT NULL DEFAULT 0,
    tombstoned_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_memories_agent ON memories(agent);
  CREATE INDEX IF NOT EXISTS idx_memories_created ON memories(created);
  CREATE INDEX IF NOT EXISTS idx_memories_tombstoned ON memories(tombstoned);
`

//
// Generate a memory ID (m_ + 12 hex chars)
//

export function make_memory_id(): string {
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("")
  return `m_${hex}`
}

//
// Open memories.db (creates schema if needed)
//

export function open_memories(): Database | null {
  const paths = resolve_lens_paths()
  const db_path = resolve(paths.brane_path, "memories.db")

  if (!existsSync(paths.brane_path)) return null

  try {
    const db = new Database(db_path)
    db.exec("PRAGMA journal_mode=WAL")
    db.exec(SCHEMA_SQL)
    return db
  } catch {
    return null
  }
}

//
// Record a memory (called alongside graph write)
//

export function record_memory(db: Database, mem: MemoryWrite): Memory {
  const id = make_memory_id()
  const from_source = mem.from_source ?? "self"
  const tags = mem.tags ?? []
  const tags_json = JSON.stringify(tags)
  const created = new Date().toISOString()

  db.run(
    `INSERT INTO memories (id, what, from_source, tags, agent, graph_id, created)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, mem.what, from_source, tags_json, mem.agent, mem.graph_id ?? null, created]
  )

  return {
    id,
    what: mem.what,
    from_source,
    tags,
    agent: mem.agent,
    graph_id: mem.graph_id ?? null,
    created,
    tombstoned: false,
  }
}

//
// Tombstone a memory (called alongside graph delete)
//

export function tombstone_memory(db: Database, id: string): boolean {
  const result = db.run(
    `UPDATE memories SET tombstoned = 1, tombstoned_at = datetime('now') WHERE id = ? AND tombstoned = 0`,
    [id]
  )
  return result.changes > 0
}

//
// Tombstone by graph_id (when forget comes through concept ID)
//

export function tombstone_by_graph_id(db: Database, graph_id: number): string | null {
  const row = db.query(
    `SELECT id FROM memories WHERE graph_id = ? AND tombstoned = 0`
  ).get(graph_id) as { id: string } | null

  if (!row) return null

  db.run(
    `UPDATE memories SET tombstoned = 1, tombstoned_at = datetime('now') WHERE id = ?`,
    [row.id]
  )
  return row.id
}

//
// List memories (for audit / CLI)
//

export interface ListOptions {
  agent?:      string
  limit?:      number
  include_tombstoned?: boolean
}

export function list_memories(db: Database, opts: ListOptions = {}): Memory[] {
  const conditions: string[] = []
  const params: unknown[] = []

  if (!opts.include_tombstoned) {
    conditions.push("tombstoned = 0")
  }
  if (opts.agent) {
    conditions.push("agent = ?")
    params.push(opts.agent)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""
  const limit = opts.limit ?? 100
  params.push(limit)

  const rows = db.query(
    `SELECT id, what, from_source, tags, agent, graph_id, created, tombstoned
     FROM memories ${where} ORDER BY created DESC LIMIT ?`
  ).all(...params) as any[]

  return rows.map(parse_row)
}

//
// Get a single memory by ID
//

export function get_memory(db: Database, id: string): Memory | null {
  const row = db.query(
    `SELECT id, what, from_source, tags, agent, graph_id, created, tombstoned FROM memories WHERE id = ?`
  ).get(id) as any
  if (!row) return null
  return parse_row(row)
}

//
// Get a memory by graph_id
//

export function get_memory_by_graph_id(db: Database, graph_id: number): Memory | null {
  const row = db.query(
    `SELECT id, what, from_source, tags, agent, graph_id, created, tombstoned
     FROM memories WHERE graph_id = ? AND tombstoned = 0`
  ).get(graph_id) as any
  if (!row) return null
  return parse_row(row)
}

//
// Count memories per agent
//

export function count_by_agent(db: Database): { agent: string; count: number }[] {
  return db.query(
    `SELECT agent, COUNT(*) as count FROM memories WHERE tombstoned = 0 GROUP BY agent ORDER BY count DESC`
  ).all() as { agent: string; count: number }[]
}

//
// Compact: physically remove tombstoned rows
//

export function compact(db: Database): number {
  const result = db.run(`DELETE FROM memories WHERE tombstoned = 1`)
  return result.changes
}

//
// List all non-tombstoned memories for rebuild
//

export function all_for_rebuild(db: Database): Memory[] {
  const rows = db.query(
    `SELECT id, what, from_source, tags, agent, graph_id, created, tombstoned
     FROM memories WHERE tombstoned = 0 ORDER BY created ASC`
  ).all() as any[]
  return rows.map(parse_row)
}

//
// Internal
//

function parse_row(row: any): Memory {
  let tags: string[] = []
  try {
    tags = JSON.parse(row.tags)
  } catch {
    tags = []
  }
  return {
    id:          row.id,
    what:        row.what,
    from_source: row.from_source,
    tags,
    agent:       row.agent,
    graph_id:    row.graph_id,
    created:     row.created,
    tombstoned:  !!row.tombstoned,
  }
}
