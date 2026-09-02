//
// downgrade.ts - test helper: walk a v1.13.0 mind.db back to v1.12.0
//
// A RocksDB directory cannot sensibly be checked in as a fixture, and the
// binary always initializes at the latest version. So the migration test
// builds a current db, downgrades it in place, then reopens it through a
// handler - open_mind() is what runs migrate(), not /mind/init.
//
// Usage: bun run downgrade.ts <path-to-mind.db>
//

import { CozoDb } from "../../../src/lib/cozo"

const db_path = process.argv[2] ?? ".brane/mind.db"
const db = new CozoDb("rocksdb", db_path)

// Drop the v1.13.0 relations
for (const rel of ["claims", "authorities"]) {
  try {
    await db.run(`::remove ${rel}`)
  } catch {
    // already absent
  }
}

// Drop the contradictions built-in rule row
try {
  await db.run(`
    ?[name, description, body, builtin] := *rules[name, description, body, builtin], name = 'contradictions'
    :rm rules { name, description, body, builtin }
  `)
} catch {
  // already absent
}

// Stamp the version back
await db.run(`
  ?[key, value] <- [['version', '1.12.0']]
  :put schema_meta { key => value }
`)

db.close()
