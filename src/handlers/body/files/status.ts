//
// status.ts - show changed/new/deleted files vs body.db
//

import type { Params, Result, Emit } from "../../../lib/types.ts"
import { success, error } from "../../../lib/result.ts"
import { resolve_lens_paths } from "../../../lib/state.ts"
import { resolve, basename, relative } from "node:path"
import { existsSync, statSync, readdirSync, readFileSync } from "node:fs"
import { Database } from "bun:sqlite"
import { createHash } from "node:crypto"

interface StatusParams {
  path?:  string
  quick?: boolean
}

interface ModifiedFile {
  url:      string
  old_hash: string
  new_hash: string
}

interface DeletedFile {
  url:  string
  hash: string
}

interface NewFile {
  path: string
}

interface StatusResult {
  modified: ModifiedFile[]
  deleted:  DeletedFile[]
  new:      NewFile[]
  summary: {
    modified: number
    deleted:  number
    new:      number
    clean:    boolean
  }
}

//
// hash computation
//
async function compute_hash(file_path: string): Promise<string> {
  const file = Bun.file(file_path)
  const buffer = await file.arrayBuffer()
  const hash = createHash("sha256")
  hash.update(Buffer.from(buffer))
  return hash.digest("hex")
}

//
// gitignore pattern matching (from add.ts)
//
function parse_ignore_file(path: string): string[] {
  if (!existsSync(path)) return []

  const content = readFileSync(path, "utf-8")
  return content
    .split("\n")
    .map(line => line.trim())
    .filter(line => line && !line.startsWith("#"))
}

function matches_pattern(name: string, pattern: string): boolean {
  if (pattern.endsWith("/")) {
    return name === pattern.slice(0, -1)
  }

  if (pattern.startsWith("*.")) {
    const ext = pattern.slice(1)
    return name.endsWith(ext)
  }

  if (pattern.includes("*")) {
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$")
    return regex.test(name)
  }

  return name === pattern
}

function is_ignored(
  file_path: string,
  base_dir:  string,
  patterns:  string[]
): boolean {
  const rel_path = relative(base_dir, file_path)
  const parts = rel_path.split("/")

  for (const pattern of patterns) {
    for (const part of parts) {
      if (matches_pattern(part, pattern)) return true
    }
    if (matches_pattern(rel_path, pattern)) return true
  }

  return false
}

//
// file discovery for new files
//
function discover_files(
  path:            string,
  ignore_patterns: string[],
  base_dir:        string,
  tracked_urls:    Set<string>
): string[] {
  const files: string[] = []

  if (!existsSync(path)) return files

  const stat = statSync(path)

  if (stat.isFile()) {
    const name = basename(path)

    // Skip hidden files
    if (name.startsWith(".")) return files

    // Skip ignored files
    if (is_ignored(path, base_dir, ignore_patterns)) return files

    // Skip already tracked files
    const url = `file://${path}`
    if (tracked_urls.has(url)) return files

    files.push(path)
  } else if (stat.isDirectory()) {
    const name = basename(path)

    // Skip hidden directories (except root)
    if (name.startsWith(".") && path !== base_dir) return files

    // Read local ignore files
    const local_gitignore = parse_ignore_file(resolve(path, ".gitignore"))
    const local_braneignore = parse_ignore_file(resolve(path, ".braneignore"))
    const local_patterns = [...ignore_patterns, ...local_gitignore, ...local_braneignore]

    const entries = readdirSync(path)

    for (const entry of entries) {
      const entry_path = resolve(path, entry)
      const discovered = discover_files(entry_path, local_patterns, base_dir, tracked_urls)
      files.push(...discovered)
    }
  }

  return files
}

//
// main handler
//
export async function handler(params: Params, emit?: Emit): Promise<Result<StatusResult>> {
  const p = (params ?? {}) as StatusParams

  // Check brane is initialized
  const lens_paths = resolve_lens_paths()
  const brane_path = lens_paths.brane_path
  const db_path = lens_paths.body_db_path

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

  // Build query for tracked files
  let query = "SELECT id, url, hash, size, mtime FROM files"
  const query_params: string[] = []

  if (p.path) {
    const abs_path = resolve(process.cwd(), p.path)
    const url_prefix = `file://${abs_path}`
    query += " WHERE url LIKE ?"
    query_params.push(`${url_prefix}%`)
  }

  query += " ORDER BY url"

  // Get tracked files
  const stmt = db.prepare(query)
  const tracked = stmt.all(...query_params) as { id: number; url: string; hash: string; size: number; mtime: number }[]

  db.close()

  // Check each tracked file
  const modified: ModifiedFile[] = []
  const deleted: DeletedFile[] = []
  const tracked_urls = new Set<string>()

  for (const row of tracked) {
    tracked_urls.add(row.url)

    // Extract file path from URL
    const file_path = row.url.replace("file://", "")

    if (!existsSync(file_path)) {
      // File was deleted
      deleted.push({
        url:  row.url,
        hash: row.hash
      })
    } else {
      // Check if modified (by hash)
      const current_hash = await compute_hash(file_path)

      if (current_hash !== row.hash) {
        modified.push({
          url:      row.url,
          old_hash: row.hash,
          new_hash: current_hash
        })
      }
    }
  }

  // Scan for new files (unless quick mode)
  const new_files: NewFile[] = []

  if (!p.quick) {
    const root_gitignore = parse_ignore_file(resolve(process.cwd(), ".gitignore"))
    const root_braneignore = parse_ignore_file(resolve(process.cwd(), ".braneignore"))
    const root_patterns = [...root_gitignore, ...root_braneignore]

    const scan_path = p.path ? resolve(process.cwd(), p.path) : process.cwd()
    const discovered = discover_files(scan_path, root_patterns, process.cwd(), tracked_urls)

    for (const file_path of discovered) {
      new_files.push({
        path: relative(process.cwd(), file_path)
      })
    }
  }

  const clean = modified.length === 0 && deleted.length === 0 && new_files.length === 0

  return success({
    modified: modified,
    deleted:  deleted,
    new:      new_files,
    summary: {
      modified: modified.length,
      deleted:  deleted.length,
      new:      new_files.length,
      clean:    clean
    }
  })
}
