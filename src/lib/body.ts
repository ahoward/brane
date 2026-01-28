//
// body.ts - shared utilities for body.db operations
//

import { resolve } from "node:path"
import { existsSync } from "node:fs"
import Database from "bun:sqlite"

//
// Check if file exists in body.db
//

export function file_exists_in_body(file_url: string): boolean {
  const brane_path = resolve(process.cwd(), ".brane")
  const body_db_path = resolve(brane_path, "body.db")

  if (!existsSync(body_db_path)) {
    return false
  }

  const db = new Database(body_db_path, { readonly: true })
  const result = db.query("SELECT 1 FROM files WHERE url = ?").get(file_url)
  db.close()

  return result !== null
}
