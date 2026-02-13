//
// index.ts - build FTS5 index from file contents
//

import type { Params, Result, Emit } from "../../../lib/types.ts"
import { success, error } from "../../../lib/result.ts"
import { resolve } from "node:path"
import { existsSync } from "node:fs"
import { Database } from "bun:sqlite"

interface IndexParams {
  path?:  string
  force?: boolean
}

interface IndexResult {
  indexed: number
  skipped: number
  deleted: number
  errors:  number
}

//
// binary detection
//

// known binary extensions
const BINARY_EXTENSIONS = new Set([
  // images
  ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".ico", ".webp", ".svg", ".tiff", ".tif",
  // audio/video
  ".mp3", ".mp4", ".wav", ".avi", ".mkv", ".mov", ".flac", ".ogg", ".webm",
  // archives
  ".zip", ".tar", ".gz", ".bz2", ".xz", ".7z", ".rar",
  // executables/libraries
  ".exe", ".dll", ".so", ".dylib", ".bin", ".o", ".a",
  // databases
  ".db", ".sqlite", ".sqlite3",
  // fonts
  ".ttf", ".otf", ".woff", ".woff2", ".eot",
  // documents (binary)
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  // other
  ".pyc", ".class", ".wasm"
])

function has_binary_extension(url: string): boolean {
  const path = url.replace("file://", "")
  const dot_idx = path.lastIndexOf(".")
  if (dot_idx === -1) return false
  const ext = path.slice(dot_idx).toLowerCase()
  return BINARY_EXTENSIONS.has(ext)
}

function is_binary_content(buffer: Buffer): boolean {
  // check first 8KB for null bytes
  const check_len = Math.min(buffer.length, 8192)
  for (let i = 0; i < check_len; i++) {
    if (buffer[i] === 0) return true
  }
  return false
}

//
// content reading
//

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

async function read_text_content(file_path: string): Promise<string | null> {
  try {
    const file = Bun.file(file_path)
    const size = file.size

    // skip large files
    if (size > MAX_FILE_SIZE) return null

    const buffer = Buffer.from(await file.arrayBuffer())

    // check for binary content
    if (is_binary_content(buffer)) return null

    // try to decode as UTF-8
    const text = buffer.toString("utf-8")

    // check for replacement character (invalid UTF-8)
    if (text.includes("\ufffd")) return null

    return text
  } catch {
    return null
  }
}

//
// main handler
//

export async function handler(params: Params, emit?: Emit): Promise<Result<IndexResult>> {
  const p = (params ?? {}) as IndexParams

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

  // open database
  const db = new Database(db_path)

  // create FTS5 table if not exists
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS files_fts USING fts5(
      url,
      content
    )
  `)

  // create index status table if not exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS files_fts_status (
      url TEXT PRIMARY KEY,
      indexed_hash TEXT NOT NULL
    )
  `)

  // prepare statements
  const select_files_stmt = db.prepare("SELECT url, hash FROM files")
  const select_status_stmt = db.prepare("SELECT indexed_hash FROM files_fts_status WHERE url = ?")
  const insert_status_stmt = db.prepare("INSERT OR REPLACE INTO files_fts_status (url, indexed_hash) VALUES (?, ?)")
  const delete_status_stmt = db.prepare("DELETE FROM files_fts_status WHERE url = ?")
  const insert_fts_stmt = db.prepare("INSERT INTO files_fts (url, content) VALUES (?, ?)")
  const delete_fts_stmt = db.prepare("DELETE FROM files_fts WHERE url = ?")
  const select_all_status_stmt = db.prepare("SELECT url FROM files_fts_status")

  const force = p.force === true
  const path_filter = p.path ? `file://${resolve(process.cwd(), p.path)}` : null

  // get all tracked files
  let tracked = select_files_stmt.all() as { url: string; hash: string }[]

  // apply path filter
  if (path_filter) {
    tracked = tracked.filter(f => f.url.startsWith(path_filter))
  }

  const tracked_urls = new Set(tracked.map(f => f.url))

  // process results
  let indexed_count = 0
  let skipped_count = 0
  let error_count = 0

  // index files
  for (const file of tracked) {
    const { url, hash } = file

    // check if already indexed with same hash (unless force)
    if (!force) {
      const status = select_status_stmt.get(url) as { indexed_hash: string } | null
      if (status && status.indexed_hash === hash) {
        skipped_count++
        continue
      }
    }

    // check for binary extension
    if (has_binary_extension(url)) {
      skipped_count++
      continue
    }

    // read file content
    const file_path = url.replace("file://", "")
    const content = await read_text_content(file_path)

    if (content === null) {
      // binary or encoding error - skip
      skipped_count++
      continue
    }

    // remove old FTS entry if exists
    delete_fts_stmt.run(url)

    // insert new FTS entry
    try {
      insert_fts_stmt.run(url, content)
      insert_status_stmt.run(url, hash)
      indexed_count++
    } catch {
      error_count++
    }
  }

  // clean up stale index entries
  let deleted_count = 0
  const all_indexed = select_all_status_stmt.all() as { url: string }[]

  for (const indexed of all_indexed) {
    // apply path filter to cleanup too
    if (path_filter && !indexed.url.startsWith(path_filter)) {
      continue
    }

    if (!tracked_urls.has(indexed.url)) {
      delete_fts_stmt.run(indexed.url)
      delete_status_stmt.run(indexed.url)
      deleted_count++
    }
  }

  db.close()

  return success({
    indexed: indexed_count,
    skipped: skipped_count,
    deleted: deleted_count,
    errors:  error_count
  })
}
