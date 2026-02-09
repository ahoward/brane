//
// hash.ts - compute SHA-256 hash for files
//

import type { Params, Result } from "../../../lib/types.ts"
import { success, error } from "../../../lib/result.ts"
import { resolve } from "node:path"
import { existsSync, statSync } from "node:fs"
import { createHash } from "node:crypto"

interface HashParams {
  path?:  string
  paths?: string[]
}

interface HashFile {
  path: string
  hash: string
  size: number
}

interface HashResult {
  files: HashFile[]
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
export async function handler(params: Params): Promise<Result<HashResult>> {
  const p = (params ?? {}) as HashParams

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

  // Process files
  const files: HashFile[] = []
  const path_errors: Record<string, { code: string; message: string }[]> = {}

  for (const input_path of paths) {
    const abs_path = resolve(process.cwd(), input_path)

    // Check file exists
    if (!existsSync(abs_path)) {
      path_errors[input_path] = [{
        code:    "not_found",
        message: `file does not exist: ${input_path}`
      }]
      continue
    }

    // Check it's a file
    const stat = statSync(abs_path)
    if (!stat.isFile()) {
      path_errors[input_path] = [{
        code:    "not_a_file",
        message: `path is not a file: ${input_path}`
      }]
      continue
    }

    try {
      const hash = await compute_hash(abs_path)
      files.push({
        path: input_path,
        hash: hash,
        size: stat.size
      })
    } catch (err) {
      path_errors[input_path] = [{
        code:    "error",
        message: err instanceof Error ? err.message : String(err)
      }]
    }
  }

  // If all paths failed, return error
  if (files.length === 0 && Object.keys(path_errors).length > 0) {
    if (paths.length === 1) {
      return error({
        path: path_errors[paths[0]]
      })
    } else {
      return error({
        paths: path_errors
      })
    }
  }

  // Return results (partial success if some failed)
  if (Object.keys(path_errors).length > 0) {
    return {
      status:  "success",
      result:  { files },
      errors:  { paths: path_errors },
      meta:    {} as any
    }
  }

  return success({ files })
}
