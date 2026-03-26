#!/usr/bin/env bun
//
// migrate-spike.ts - whitebox spike for migration internals
//
// Tests: version comparison, migration chain, backup/restore, logging
//

import { compare_versions, migrate, LATEST_VERSION } from "../src/lib/migrate.ts"
import type { Migration } from "../src/lib/migrate.ts"
import { CozoDb } from "../src/lib/cozo"
import { mkdtempSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import { tmpdir } from "node:os"

let passed = 0
let failed = 0

function assert(condition: boolean, name: string, detail?: string) {
  if (condition) {
    console.log(`PASS: ${name}`)
    passed++
  } else {
    console.log(`FAIL: ${name}${detail ? ` — ${detail}` : ""}`)
    failed++
  }
}

// --- Test: compare_versions ---
console.log("--- compare_versions ---")
assert(compare_versions("1.7.0", "1.7.0") === 0, "equal versions")
assert(compare_versions("1.7.0", "1.8.0") === -1, "1.7.0 < 1.8.0")
assert(compare_versions("1.8.0", "1.7.0") === 1, "1.8.0 > 1.7.0")
assert(compare_versions("1.9.0", "1.10.0") === -1, "1.9.0 < 1.10.0 (numeric, not lexicographic)")
assert(compare_versions("2.0.0", "1.99.0") === 1, "2.0.0 > 1.99.0")
assert(compare_versions("0.0.0", "1.7.0") === -1, "0.0.0 < 1.7.0")
console.log("")

// --- Test: migrate on current version (no-op) ---
console.log("--- migrate: no-op on current version ---")
const tmp1 = mkdtempSync(resolve(tmpdir(), "brane-migrate-"))
const db1_path = resolve(tmp1, "mind.db")
const db1 = new CozoDb("rocksdb", db1_path)

// Create schema_meta with current version
await db1.run(`:create schema_meta { key: String => value: String }`)
await db1.run(`?[key, value] <- [['version', '${LATEST_VERSION}']] :put schema_meta { key => value }`)

const result1 = await migrate(db1, db1_path)
assert(result1.migrated === false, "no migration on current version")
assert(result1.from_version === LATEST_VERSION, `from_version is ${LATEST_VERSION}`)
assert(result1.to_version === LATEST_VERSION, `to_version is ${LATEST_VERSION}`)
assert(result1.steps === 0, "0 steps")
assert(result1.backup_path === null, "no backup created")
db1.close()
console.log("")

// --- Test: migrate from 0.0.0 (pre-versioning) ---
console.log("--- migrate: 0.0.0 -> current ---")
const tmp2 = mkdtempSync(resolve(tmpdir(), "brane-migrate-"))
const db2_path = resolve(tmp2, "mind.db")
const db2 = new CozoDb("rocksdb", db2_path)

// Create schema_meta but with no version (simulates pre-versioning)
await db2.run(`:create schema_meta { key: String => value: String }`)
// Also need concepts relation for the backup to work
await db2.run(`:create concepts { id: Int, name: String, type: String, vector: <F32; 256>? }`)
await db2.run(`?[id, name, type, vector] <- [[1, 'TestConcept', 'Entity', null]] :put concepts { id, name, type, vector }`)

const result2 = await migrate(db2, db2_path)
assert(result2.migrated === true, "migration ran")
assert(result2.from_version === "0.0.0", "from 0.0.0")
assert(result2.to_version === LATEST_VERSION, `to ${LATEST_VERSION}`)
assert(result2.steps === 1, "1 step (0.0.0 -> 1.7.0)")
assert(result2.backup_path !== null, "backup created")

// Verify backup file exists
const backup_exists = existsSync(result2.backup_path!)
assert(backup_exists, `backup file exists at ${result2.backup_path}`)

// Verify backup is named correctly
assert(result2.backup_path!.endsWith("mind.db.backup.v0.0.0"), "backup named with source version")

// Verify data survived migration
const concepts = await db2.run(`?[id, name, type] := *concepts[id, name, type, _]`)
assert(concepts.rows.length === 1, "concept data preserved after migration")
assert(concepts.rows[0][1] === "TestConcept", "concept name preserved")

// Verify version was updated
const version = await db2.run(`?[value] := *schema_meta['version', value]`)
assert(version.rows[0][0] === LATEST_VERSION, `version updated to ${LATEST_VERSION}`)
db2.close()
console.log("")

// --- Test: version ahead of binary ---
console.log("--- migrate: version ahead of binary ---")
const tmp3 = mkdtempSync(resolve(tmpdir(), "brane-migrate-"))
const db3_path = resolve(tmp3, "mind.db")
const db3 = new CozoDb("rocksdb", db3_path)

await db3.run(`:create schema_meta { key: String => value: String }`)
await db3.run(`?[key, value] <- [['version', '99.0.0']] :put schema_meta { key => value }`)

try {
  await migrate(db3, db3_path)
  assert(false, "should have thrown for version ahead")
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err)
  assert(msg.includes("newer than this binary"), "error mentions binary upgrade")
  assert(msg.includes("99.0.0"), "error includes the db version")
}
db3.close()
console.log("")

// --- Summary ---
console.log(`\n=== ${passed} passed, ${failed} failed ===`)
process.exit(failed > 0 ? 1 : 0)
