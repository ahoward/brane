//
// body.ts - shared utilities for body.db operations
//

import { existsSync } from "node:fs"
import Database from "bun:sqlite"
import { resolve_lens_paths } from "./state.ts"

//
// Check if file exists in body.db (uses active lens path resolution)
//

export function file_exists_in_body(file_url: string): boolean {
  const paths = resolve_lens_paths()

  if (!existsSync(paths.body_db_path)) {
    return false
  }

  const db = new Database(paths.body_db_path, { readonly: true })
  const result = db.query("SELECT 1 FROM files WHERE url = ?").get(file_url)
  db.close()

  return result !== null
}
