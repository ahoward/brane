//
// init.ts - initialize .brane/ directory and body.db
//

import type { Params, Result, Emit } from "../../lib/types.ts"
import { success, error } from "../../lib/result.ts"
import { resolve } from "node:path"
import { existsSync, statSync, mkdirSync } from "node:fs"
import { Database } from "bun:sqlite"

interface InitParams {
  path?: string
}

interface InitResult {
  path:    string
  created: boolean
}

export async function handler(params: Params, emit?: Emit): Promise<Result<InitResult>> {
  const p = (params ?? {}) as InitParams

  // determine target path
  let target_path: string

  if (p.path === undefined || p.path === null) {
    target_path = process.cwd()
  } else if (p.path === "") {
    return error({
      path: [{
        code:    "invalid",
        message: "path cannot be empty"
      }]
    })
  } else {
    target_path = resolve(p.path)
  }

  // check target exists
  if (!existsSync(target_path)) {
    return error({
      path: [{
        code:    "not_found",
        message: `directory does not exist: ${target_path}`
      }]
    })
  }

  // check target is a directory
  const target_stat = statSync(target_path)
  if (!target_stat.isDirectory()) {
    return error({
      path: [{
        code:    "not_a_directory",
        message: `path is not a directory: ${target_path}`
      }]
    })
  }

  const brane_path = resolve(target_path, ".brane")

  // check if .brane exists
  if (existsSync(brane_path)) {
    const brane_stat = statSync(brane_path)

    if (!brane_stat.isDirectory()) {
      return error({
        path: [{
          code:    "brane_is_file",
          message: `.brane exists but is not a directory: ${brane_path}`
        }]
      })
    }

    // .brane directory exists, check for body.db
    const db_path = resolve(brane_path, "body.db")

    if (existsSync(db_path)) {
      // already initialized, idempotent success
      return success({
        path:    brane_path,
        created: false
      })
    }

    // .brane exists but no body.db, create it
    create_body_db(db_path)

    return success({
      path:    brane_path,
      created: true
    })
  }

  // create .brane directory
  mkdirSync(brane_path, { recursive: true })

  // create body.db
  const db_path = resolve(brane_path, "body.db")
  create_body_db(db_path)

  return success({
    path:    brane_path,
    created: true
  })
}

function create_body_db(db_path: string): void {
  const db = new Database(db_path)

  // enable WAL mode
  db.exec("PRAGMA journal_mode=WAL")

  // create files table
  db.exec(`
    CREATE TABLE IF NOT EXISTS files (
      id    INTEGER PRIMARY KEY,
      url   TEXT NOT NULL UNIQUE,
      hash  TEXT NOT NULL,
      size  INTEGER NOT NULL,
      mtime INTEGER NOT NULL
    )
  `)

  db.close()
}
