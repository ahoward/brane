//
// add.ts - add files to body.db
//

import type { Params, Result, Emit } from "../../../lib/types.ts"
import { success, error } from "../../../lib/result.ts"
import { resolve_lens_paths } from "../../../lib/state.ts"
import { resolve, basename, dirname, relative } from "node:path"
import { existsSync, statSync, readdirSync, readFileSync } from "node:fs"
import { Database } from "bun:sqlite"
import { createHash } from "node:crypto"

interface AddParams {
  path?:   string
  paths?:  string[]
  hidden?: boolean
}

interface FileRecord {
  id:       number
  url:      string
  hash:     string
  size:     number
  mtime:    number
  created?: boolean
  updated?: boolean
}

interface AddResult {
  files:   FileRecord[]
  summary: {
    added:   number
    updated: number
    errors:  number
  }
}

//
// gitignore pattern matching (simplified)
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
  // Simple glob matching: *.ext, name, dir/
  if (pattern.endsWith("/")) {
    // Directory pattern
    return name === pattern.slice(0, -1)
  }

  if (pattern.startsWith("*.")) {
    // Extension pattern
    const ext = pattern.slice(1)
    return name.endsWith(ext)
  }

  if (pattern.includes("*")) {
    // Convert glob to regex
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$")
    return regex.test(name)
  }

  // Exact match
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
    // Check each part of the path
    for (const part of parts) {
      if (matches_pattern(part, pattern)) return true
    }
    // Also check the full relative path
    if (matches_pattern(rel_path, pattern)) return true
  }

  return false
}

//
// file discovery
//
function discover_files(
  path:         string,
  include_hidden: boolean,
  ignore_patterns: string[],
  base_dir:     string
): string[] {
  const files: string[] = []
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

    // Skip hidden directories unless requested
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
// main handler
//
export async function handler(params: Params, emit?: Emit): Promise<Result<AddResult>> {
  const p = (params ?? {}) as AddParams

  // Collect paths
  let paths: string[] = []

  if (p.path) {
    paths.push(p.path)
  }

  if (p.paths && Array.isArray(p.paths)) {
    paths.push(...p.paths)
  }

  if (paths.length === 0) {
    return error({
      params: [{
        code:    "required",
        message: "path or paths is required"
      }]
    })
  }

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

  // Prepare statements
  const select_stmt = db.prepare("SELECT id, url, hash, size, mtime FROM files WHERE url = ?")
  const insert_stmt = db.prepare("INSERT INTO files (url, hash, size, mtime) VALUES (?, ?, ?, ?)")
  const update_stmt = db.prepare("UPDATE files SET hash = ?, size = ?, mtime = ? WHERE id = ?")

  // Load root ignore patterns
  const root_gitignore = parse_ignore_file(resolve(process.cwd(), ".gitignore"))
  const root_braneignore = parse_ignore_file(resolve(process.cwd(), ".braneignore"))
  const root_patterns = [...root_gitignore, ...root_braneignore]

  const include_hidden = p.hidden === true

  // Process paths
  const files: FileRecord[] = []
  const path_errors: Record<string, { code: string; message: string }[]> = {}
  let added = 0
  let updated = 0
  let error_count = 0

  for (const input_path of paths) {
    const abs_path = resolve(process.cwd(), input_path)

    // Check path exists
    if (!existsSync(abs_path)) {
      path_errors[input_path] = [{
        code:    "not_found",
        message: `file does not exist: ${input_path}`
      }]
      error_count++
      continue
    }

    // Discover files
    const discovered = discover_files(abs_path, include_hidden, root_patterns, process.cwd())

    for (const file_path of discovered) {
      try {
        const stat = statSync(file_path)
        const url = `file://${file_path}`
        const hash = await compute_hash(file_path)
        const size = stat.size
        const mtime = Math.floor(stat.mtimeMs / 1000)

        // Check if exists
        const existing = select_stmt.get(url) as { id: number; hash: string } | null

        if (existing) {
          // Update
          update_stmt.run(hash, size, mtime, existing.id)
          files.push({
            id:      existing.id,
            url:     url,
            hash:    hash,
            size:    size,
            mtime:   mtime,
            updated: true
          })
          updated++
        } else {
          // Insert
          const result = insert_stmt.run(url, hash, size, mtime)
          files.push({
            id:      Number(result.lastInsertRowid),
            url:     url,
            hash:    hash,
            size:    size,
            mtime:   mtime,
            created: true
          })
          added++
        }
      } catch (err) {
        path_errors[file_path] = [{
          code:    "error",
          message: err instanceof Error ? err.message : String(err)
        }]
        error_count++
      }
    }
  }

  db.close()

  // Build result
  const result: AddResult = {
    files:   files,
    summary: {
      added:   added,
      updated: updated,
      errors:  error_count
    }
  }

  // If all paths failed, return error
  if (files.length === 0 && error_count > 0) {
    if (paths.length === 1) {
      // Single path error
      return error({
        path: path_errors[paths[0]] || [{
          code:    "error",
          message: "unknown error"
        }]
      })
    } else {
      return error({
        paths: path_errors
      })
    }
  }

  // Partial success or full success
  if (error_count > 0) {
    return {
      status:  "success",
      result:  result,
      errors:  { paths: path_errors },
      meta:    {} as any
    }
  }

  return success(result)
}
