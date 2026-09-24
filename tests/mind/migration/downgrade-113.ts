//
// downgrade-113.ts - test helper: walk a v1.14.0 mind.db back to v1.13.0
//
// Rebuilds concepts and edges as ALL-KEY relations (the pre-#129 shape) so the
// next open_mind() has a real 1.13.0 -> 1.14.0 migration to perform. Optionally
// injects a duplicate-id row, which is what the defect produced in the wild.
//
// Usage: bun run downgrade-113.ts <path-to-mind.db> [--with-duplicates]
//

import { CozoDb } from "../../../src/lib/cozo"
import { EMBED_DIM } from "../../../src/lib/embed.ts"

const db_path = process.argv[2] ?? ".brane/mind.db"
const with_dupes = process.argv.includes("--with-duplicates")
const db = new CozoDb("rocksdb", db_path)

const concepts = (await db.run(`?[id, name, type, vector, agent_id] := *concepts[id, name, type, vector, agent_id]`)).rows
const edges    = (await db.run(`?[id, source, target, relation, weight, agent_id] := *edges[id, source, target, relation, weight, agent_id]`)).rows

await db.run(`::hnsw drop concepts:semantic`)
await db.run(`::remove concepts`)
await db.run(`::remove edges`)

await db.run(`:create concepts { id: Int, name: String, type: String, vector: <F32; ${EMBED_DIM}>?, agent_id: String default "" }`)
await db.run(`:create edges { id: Int, source: Int, target: Int, relation: String, weight: Float default 1.0, agent_id: String default "" }`)

const lit = (v: unknown) => v === null ? "null" : typeof v === "string" ? `'${(v as string).replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'` : Array.isArray(v) ? `vec(${JSON.stringify(v)})` : String(v)

for (const r of concepts as unknown[][]) {
  await db.run(`?[id, name, type, vector, agent_id] <- [[${r.map(lit).join(", ")}]] :put concepts { id, name, type, vector, agent_id }`)
  if (with_dupes) {
    // the shape the bug produced: same id, stale name, still present
    const stale = [r[0], `STALE_${r[1]}`, r[2], r[3], r[4]]
    await db.run(`?[id, name, type, vector, agent_id] <- [[${stale.map(lit).join(", ")}]] :put concepts { id, name, type, vector, agent_id }`)
  }
}
for (const r of edges as unknown[][]) {
  await db.run(`?[id, source, target, relation, weight, agent_id] <- [[${r.map(lit).join(", ")}]] :put edges { id, source, target, relation, weight, agent_id }`)
}

await db.run(`::hnsw create concepts:semantic { dim: ${EMBED_DIM}, m: 50, dtype: F32, fields: [vector], distance: Cosine, ef_construction: 100 }`)
await db.run(`?[key, value] <- [['version', '1.13.0']] :put schema_meta { key => value }`)
db.close()
