//
// list.ts - list tracked files from body.db
//

import type { Params, Result, Emit } from "../../../lib/types.ts"
import { success, error } from "../../../lib/result.ts"
import { resolve } from "node:path"
import { existsSync } from "node:fs"
import { Database } from "bun:sqlite"

interface ListParams {
  path?:    string
  pattern?: string
}

interface FileRecord {
  id:    number
  url:   string
  hash:  string
  size:  number
  mtime: number
}

interface ListResult {
  files:   FileRecord[]
  summary: {
    count: number
  }
}

//
// glob pattern matching
//
function matches_glob(url: string, pattern: string): boolean {
  // Extract filename from URL
  const filename = url.split("/").pop() || ""

  if (pattern.startsWith("*.")) {
    // Extension pattern: *.ts
    const ext = pattern.slice(1)
    return filename.endsWith(ext)
  }

  if (pattern.includes("*")) {
    // Convert glob to regex
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$")
    return regex.test(filename)
  }

  // Exact match
  return filename === pattern
}

//
// main handler
//
export async function handler(params: Params, emit?: Emit): Promise<Result<ListResult>> {
  const p = (params ?? {}) as ListParams

  // Check brane is initialized
  const brane_path = resolve(process.cwd(), ".brane")
  const db_path = resolve(brane_path, "body.db")

  if (!existsSync(brane_path) || !existsSync(db_path)) {
    return error({
      brane: [{
        code:    "not_initialized",
        message: "brane not initialized (run brane init)"
      }]
    })
  }

  // Open database
  const db = new Database(db_path)

  // Build query
  let query = "SELECT id, url, hash, size, mtime FROM files"
  const query_params: string[] = []

  if (p.path) {
    // Filter by path prefix - convert relative path to absolute URL prefix
    const abs_path = resolve(process.cwd(), p.path)
    const url_prefix = `file://${abs_path}`
    query += " WHERE url LIKE ?"
    query_params.push(`${url_prefix}%`)
  }

  query += " ORDER BY url"

  // Execute query
  const stmt = db.prepare(query)
  let rows = stmt.all(...query_params) as FileRecord[]

  db.close()

  // Apply pattern filter if specified (post-query since SQLite LIKE is limited)
  if (p.pattern) {
    rows = rows.filter(row => matches_glob(row.url, p.pattern!))
  }

  return success({
    files:   rows,
    summary: {
      count: rows.length
    }
  })
}
