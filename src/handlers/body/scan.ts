//
// scan.ts - full directory scan: hash all files, update body.db
//

import type { Params, Result, Emit } from "../../lib/types.ts"
import { success, error } from "../../lib/result.ts"
import { resolve, basename, relative } from "node:path"
import { existsSync, statSync, readdirSync, readFileSync } from "node:fs"
import { Database } from "bun:sqlite"
import { createHash } from "node:crypto"

interface ScanParams {
  path?:    string
  dry_run?: boolean
  hidden?:  boolean
}

interface AddedFile {
  url:  string
  hash: string
  size: number
}

interface UpdatedFile {
  url:      string
  old_hash: string
  new_hash: string
  size:     number
}

interface DeletedFile {
  url: string
}

interface ScanResult {
  added:     AddedFile[]
  updated:   UpdatedFile[]
  deleted:   DeletedFile[]
  unchanged: number
  dry_run?:  boolean
  summary: {
    added:     number
    updated:   number
    deleted:   number
    unchanged: number
    errors:    number
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
// gitignore pattern matching
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
// file discovery
//
function discover_files(
  path:            string,
  include_hidden:  boolean,
  ignore_patterns: string[],
  base_dir:        string
): string[] {
  const files: string[] = []

  if (!existsSync(path)) return files

  const stat = statSync(path)

  if (stat.isFile()) {
    const name = basename(path)

    // Skip hidden files unless requested
    if (!include_hidden && name.startsWith(".")) {
      return files
    }

    // Skip ignored files
    if (is_ignored(path, base_dir, ignore_patterns)) {
      return files
    }

    files.push(path)
  } else if (stat.isDirectory()) {
    const name = basename(path)

    // Skip hidden directories unless requested (except root)
    if (!include_hidden && name.startsWith(".") && path !== base_dir) {
      return files
    }

    // Read local ignore files
    const local_gitignore = parse_ignore_file(resolve(path, ".gitignore"))
    const local_braneignore = parse_ignore_file(resolve(path, ".braneignore"))
    const local_patterns = [...ignore_patterns, ...local_gitignore, ...local_braneignore]

    const entries = readdirSync(path)

    for (const entry of entries) {
      const entry_path = resolve(path, entry)
      const discovered = discover_files(entry_path, include_hidden, local_patterns, base_dir)
      files.push(...discovered)
    }
  }

  return files
}

//
// main handler
//
export async function handler(params: Params, emit?: Emit): Promise<Result<ScanResult>> {
  const p = (params ?? {}) as ScanParams

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

  // Prepare statements
  const select_all_stmt = db.prepare("SELECT id, url, hash, size, mtime FROM files")
  const select_by_url_stmt = db.prepare("SELECT id, url, hash, size, mtime FROM files WHERE url = ?")
  const insert_stmt = db.prepare("INSERT INTO files (url, hash, size, mtime) VALUES (?, ?, ?, ?)")
  const update_stmt = db.prepare("UPDATE files SET hash = ?, size = ?, mtime = ? WHERE id = ?")
  const delete_stmt = db.prepare("DELETE FROM files WHERE id = ?")

  // Load root ignore patterns
  const root_gitignore = parse_ignore_file(resolve(process.cwd(), ".gitignore"))
  const root_braneignore = parse_ignore_file(resolve(process.cwd(), ".braneignore"))
  const root_patterns = [...root_gitignore, ...root_braneignore]

  const include_hidden = p.hidden === true
  const dry_run = p.dry_run === true

  // Determine scan root
  const scan_root = p.path ? resolve(process.cwd(), p.path) : process.cwd()

  // Discover files on filesystem
  const discovered = discover_files(scan_root, include_hidden, root_patterns, process.cwd())
  const discovered_urls = new Set(discovered.map(f => `file://${f}`))

  // Get tracked files
  const tracked = select_all_stmt.all() as { id: number; url: string; hash: string; size: number; mtime: number }[]

  // Filter tracked files by path if specified
  let filtered_tracked = tracked
  if (p.path) {
    const url_prefix = `file://${scan_root}`
    filtered_tracked = tracked.filter(t => t.url.startsWith(url_prefix))
  }

  const tracked_map = new Map(filtered_tracked.map(t => [t.url, t]))

  // Process results
  const added: AddedFile[] = []
  const updated: UpdatedFile[] = []
  const deleted: DeletedFile[] = []
  let unchanged = 0
  let error_count = 0

  // Check for new and modified files
  for (const file_path of discovered) {
    const url = `file://${file_path}`

    try {
      const stat = statSync(file_path)
      const hash = await compute_hash(file_path)
      const size = stat.size
      const mtime = Math.floor(stat.mtimeMs / 1000)

      const existing = tracked_map.get(url)

      if (existing) {
        if (existing.hash !== hash) {
          // Modified
          updated.push({
            url:      url,
            old_hash: existing.hash,
            new_hash: hash,
            size:     size
          })

          if (!dry_run) {
            update_stmt.run(hash, size, mtime, existing.id)
          }
        } else {
          // Unchanged
          unchanged++
        }
        tracked_map.delete(url)
      } else {
        // New file
        added.push({
          url:  url,
          hash: hash,
          size: size
        })

        if (!dry_run) {
          insert_stmt.run(url, hash, size, mtime)
        }
      }
    } catch (err) {
      error_count++
    }
  }

  // Remaining tracked files are deleted (not found on filesystem)
  for (const [url, record] of tracked_map) {
    deleted.push({ url })

    if (!dry_run) {
      delete_stmt.run(record.id)
    }
  }

  db.close()

  const result: ScanResult = {
    added:     added,
    updated:   updated,
    deleted:   deleted,
    unchanged: unchanged,
    summary: {
      added:     added.length,
      updated:   updated.length,
      deleted:   deleted.length,
      unchanged: unchanged,
      errors:    error_count
    }
  }

  if (dry_run) {
    result.dry_run = true
  }

  return success(result)
}
