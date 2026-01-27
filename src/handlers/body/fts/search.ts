//
// search.ts - full-text search across indexed files
//

import type { Params, Result } from "../../../lib/types.ts"
import { success, error } from "../../../lib/result.ts"
import { resolve } from "node:path"
import { existsSync } from "node:fs"
import { Database } from "bun:sqlite"

interface SearchParams {
  query?: string
  path?:  string
  limit?: number
}

interface SearchMatch {
  url:     string
  snippet: string
  score:   number
}

interface SearchResult {
  matches: SearchMatch[]
  total:   number
}

const DEFAULT_LIMIT = 100

export async function handler(params: Params): Promise<Result<SearchResult>> {
  const p = (params ?? {}) as SearchParams

  // check brane is initialized
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

  // validate query
  if (p.query === undefined || p.query === null || p.query === "") {
    return error({
      query: [{
        code:    "required",
        message: "query is required"
      }]
    })
  }

  const query = p.query
  const limit = p.limit ?? DEFAULT_LIMIT
  const path_filter = p.path ? `file://${resolve(process.cwd(), p.path)}` : null

  // open database
  const db = new Database(db_path)

  // check if FTS table exists
  const table_check = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='files_fts'"
  ).get()

  if (!table_check) {
    db.close()
    return success({
      matches: [],
      total:   0
    })
  }

  // build query
  let sql: string
  let sql_params: (string | number)[]

  if (path_filter) {
    sql = `
      SELECT
        url,
        snippet(files_fts, 1, '>>>', '<<<', '...', 32) as snippet,
        bm25(files_fts) as score
      FROM files_fts
      WHERE files_fts MATCH ?
        AND url LIKE ?
      ORDER BY score
      LIMIT ?
    `
    sql_params = [query, `${path_filter}%`, limit]
  } else {
    sql = `
      SELECT
        url,
        snippet(files_fts, 1, '>>>', '<<<', '...', 32) as snippet,
        bm25(files_fts) as score
      FROM files_fts
      WHERE files_fts MATCH ?
      ORDER BY score
      LIMIT ?
    `
    sql_params = [query, limit]
  }

  // execute search
  let rows: { url: string; snippet: string; score: number }[]

  try {
    const stmt = db.prepare(sql)
    rows = stmt.all(...sql_params) as { url: string; snippet: string; score: number }[]
  } catch (err) {
    db.close()
    const message = err instanceof Error ? err.message : String(err)
    return error({
      query: [{
        code:    "invalid",
        message: `invalid search query: ${message}`
      }]
    })
  }

  // get total count (without limit) for path filter case
  let total = rows.length

  if (rows.length === limit) {
    // might be more results, get actual count
    let count_sql: string
    let count_params: (string | number)[]

    if (path_filter) {
      count_sql = `
        SELECT COUNT(*) as count
        FROM files_fts
        WHERE files_fts MATCH ?
          AND url LIKE ?
      `
      count_params = [query, `${path_filter}%`]
    } else {
      count_sql = `
        SELECT COUNT(*) as count
        FROM files_fts
        WHERE files_fts MATCH ?
      `
      count_params = [query]
    }

    try {
      const count_result = db.prepare(count_sql).get(...count_params) as { count: number }
      total = count_result.count
    } catch {
      // ignore count errors, use rows.length
    }
  }

  db.close()

  // format results
  const matches: SearchMatch[] = rows.map(row => ({
    url:     row.url,
    snippet: row.snippet,
    score:   Math.abs(row.score) // bm25 returns negative scores, lower is better
  }))

  return success({
    matches: matches,
    total:   total
  })
}
