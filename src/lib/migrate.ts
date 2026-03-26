//
// migrate.ts - versioned schema migrations for mind.db
//
// Automatically detects outdated schemas on open_mind() and applies
// sequential migrations to reach LATEST_VERSION. Backs up before
// migrating, restores on failure.
//

import type { CozoDb } from "./cozo"
import { dirname, resolve } from "node:path"
import { EMBED_DIM } from "./embed.ts"

//
// The latest schema version this binary supports.
// Bump this when adding a new migration.
//
export const LATEST_VERSION = "1.11.0"

//
// A single migration step: transforms schema from one version to the next.
//
export interface Migration {
  from:  string
  to:    string
  apply: (db: CozoDb) => Promise<void>
}

//
// Result of running migrate().
//
export interface MigrateResult {
  migrated:     boolean
  from_version: string
  to_version:   string
  steps:        number
  backup_path:  string | null
}

//
// Ordered migration registry. Each entry's `to` must equal the next entry's `from`.
// The first real migration will be added by issue #34 (episodic memory).
//
const MIGRATIONS: Migration[] = [
  // v0.0.0 → v1.7.0: no-op stamp for pre-versioning databases
  {
    from: "0.0.0",
    to:   "1.7.0",
    apply: async (_db: CozoDb) => {
      // No schema changes — just stamps the version.
      // All v1.7.0 relations already exist (created by /mind/init).
    }
  },

  // v1.7.0 → v1.8.0: add episodes relation + HNSW index for episodic memory
  {
    from: "1.7.0",
    to:   "1.8.0",
    apply: async (db: CozoDb) => {
      // Create episodes relation
      await db.run(`
        :create episodes {
          id: Int,
          agent_id: String,
          timestamp: String,
          observation: String,
          context: String,
          outcome: String,
          tags: String,
          vector: <F32; ${EMBED_DIM}>?,
          source_concept_id: Int
        }
      `)

      // Create HNSW index for semantic search on episodes
      await db.run(`
        ::hnsw create episodes:semantic {
          dim: ${EMBED_DIM},
          m: 50,
          dtype: F32,
          fields: [vector],
          distance: Cosine,
          ef_construction: 100
        }
      `)
    }
  },

  // v1.8.0 → v1.9.0: add agent_id to concepts and edges
  {
    from: "1.8.0",
    to:   "1.9.0",
    apply: async (db: CozoDb) => {
      // --- Migrate concepts: add agent_id column ---

      // 1. Drop HNSW index (depends on the relation)
      await db.run(`::hnsw drop concepts:semantic`)

      // 2. Create temp with new schema
      await db.run(`
        :create concepts_tmp {
          id: Int,
          name: String,
          type: String,
          vector: <F32; ${EMBED_DIM}>?,
          agent_id: String default ""
        }
      `)

      // 3. Copy existing data (agent_id defaults to empty string)
      await db.run(`
        ?[id, name, type, vector, agent_id] := *concepts[id, name, type, vector], agent_id = ""
        :put concepts_tmp { id, name, type, vector, agent_id }
      `)

      // 4. Drop original
      await db.run(`::remove concepts`)

      // 5. Create with new schema
      await db.run(`
        :create concepts {
          id: Int,
          name: String,
          type: String,
          vector: <F32; ${EMBED_DIM}>?,
          agent_id: String default ""
        }
      `)

      // 6. Copy data back
      await db.run(`
        ?[id, name, type, vector, agent_id] := *concepts_tmp[id, name, type, vector, agent_id]
        :put concepts { id, name, type, vector, agent_id }
      `)

      // 7. Drop temp
      await db.run(`::remove concepts_tmp`)

      // 8. Recreate HNSW index
      await db.run(`
        ::hnsw create concepts:semantic {
          dim: ${EMBED_DIM},
          m: 50,
          dtype: F32,
          fields: [vector],
          distance: Cosine,
          ef_construction: 100
        }
      `)

      // --- Migrate edges: add agent_id column ---

      // 1. Create temp with new schema
      await db.run(`
        :create edges_tmp {
          id: Int,
          source: Int,
          target: Int,
          relation: String,
          weight: Float default 1.0,
          agent_id: String default ""
        }
      `)

      // 2. Copy existing data
      await db.run(`
        ?[id, source, target, relation, weight, agent_id] := *edges[id, source, target, relation, weight], agent_id = ""
        :put edges_tmp { id, source, target, relation, weight, agent_id }
      `)

      // 3. Drop original
      await db.run(`::remove edges`)

      // 4. Create with new schema
      await db.run(`
        :create edges {
          id: Int,
          source: Int,
          target: Int,
          relation: String,
          weight: Float default 1.0,
          agent_id: String default ""
        }
      `)

      // 5. Copy data back
      await db.run(`
        ?[id, source, target, relation, weight, agent_id] := *edges_tmp[id, source, target, relation, weight, agent_id]
        :put edges { id, source, target, relation, weight, agent_id }
      `)

      // 6. Drop temp
      await db.run(`::remove edges_tmp`)
    }
  },

  // v1.9.0 → v1.10.0: add archived field to episodes for consolidation
  {
    from: "1.9.0",
    to:   "1.10.0",
    apply: async (db: CozoDb) => {
      // Drop HNSW index on episodes
      await db.run(`::hnsw drop episodes:semantic`)

      // Create temp with new schema
      await db.run(`
        :create episodes_tmp {
          id: Int,
          agent_id: String,
          timestamp: String,
          observation: String,
          context: String,
          outcome: String,
          tags: String,
          vector: <F32; ${EMBED_DIM}>?,
          source_concept_id: Int,
          archived: Bool default false
        }
      `)

      // Copy existing data
      await db.run(`
        ?[id, agent_id, timestamp, observation, context, outcome, tags, vector, source_concept_id, archived] :=
          *episodes[id, agent_id, timestamp, observation, context, outcome, tags, vector, source_concept_id],
          archived = false
        :put episodes_tmp { id, agent_id, timestamp, observation, context, outcome, tags, vector, source_concept_id, archived }
      `)

      // Drop original
      await db.run(`::remove episodes`)

      // Create with new schema
      await db.run(`
        :create episodes {
          id: Int,
          agent_id: String,
          timestamp: String,
          observation: String,
          context: String,
          outcome: String,
          tags: String,
          vector: <F32; ${EMBED_DIM}>?,
          source_concept_id: Int,
          archived: Bool default false
        }
      `)

      // Copy data back
      await db.run(`
        ?[id, agent_id, timestamp, observation, context, outcome, tags, vector, source_concept_id, archived] :=
          *episodes_tmp[id, agent_id, timestamp, observation, context, outcome, tags, vector, source_concept_id, archived]
        :put episodes { id, agent_id, timestamp, observation, context, outcome, tags, vector, source_concept_id, archived }
      `)

      // Drop temp
      await db.run(`::remove episodes_tmp`)

      // Recreate HNSW index
      await db.run(`
        ::hnsw create episodes:semantic {
          dim: ${EMBED_DIM},
          m: 50,
          dtype: F32,
          fields: [vector],
          distance: Cosine,
          ef_construction: 100
        }
      `)
    }
  },

  // v1.10.0 → v1.11.0: add entity_timestamps relation for temporal queries
  {
    from: "1.10.0",
    to:   "1.11.0",
    apply: async (db: CozoDb) => {
      await db.run(`
        :create entity_timestamps {
          entity_type: String,
          entity_id: Int
          =>
          created_at: String
        }
      `)
    }
  },
]

//
// Compare two semver strings numerically.
// Returns -1 if a < b, 0 if equal, 1 if a > b.
//
export function compare_versions(a: string, b: string): number {
  const pa = a.split(".").map(s => parseInt(s, 10))
  const pb = b.split(".").map(s => parseInt(s, 10))

  for (let i = 0; i < 3; i++) {
    const va = pa[i] ?? 0
    const vb = pb[i] ?? 0
    if (va < vb) return -1
    if (va > vb) return 1
  }

  return 0
}

//
// Validate version string format (strict: digits and dots only).
//
const VERSION_RE = /^\d+\.\d+\.\d+$/

function is_valid_version(v: string): boolean {
  return VERSION_RE.test(v)
}

//
// Read schema version from mind.db. Returns "0.0.0" if schema_meta
// relation doesn't exist. Throws on other errors (I/O, lock, etc).
//
async function get_schema_version(db: CozoDb): Promise<string> {
  try {
    const result = await db.run(`
      ?[value] := *schema_meta['version', value]
    `)
    const rows = result.rows as string[][]
    if (rows.length > 0 && rows[0][0]) {
      return rows[0][0]
    }
  } catch (err: unknown) {
    // Only swallow "relation not found" errors — re-throw everything else
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes("not found") || msg.includes("does not exist")) {
      return "0.0.0"
    }
    throw err
  }
  return "0.0.0"
}

//
// Update schema version in schema_meta.
// Validates version format to prevent query injection.
//
async function set_schema_version(db: CozoDb, version: string): Promise<void> {
  if (!is_valid_version(version)) {
    throw new Error(`invalid schema version format: ${version}`)
  }
  await db.run(`
    ?[key, value] <- [['version', '${version}']]
    :put schema_meta { key => value }
  `)
}

//
// Run migrations on an open mind.db.
//
// Called from open_mind() after the database is opened.
// If the database is already at LATEST_VERSION, returns immediately.
// If the database is ahead of the binary, throws an error.
// Otherwise, backs up the database and applies migrations sequentially.
//
export async function migrate(db: CozoDb, db_path: string): Promise<MigrateResult> {
  const current = await get_schema_version(db)

  // Already current — no migration needed
  if (compare_versions(current, LATEST_VERSION) === 0) {
    return {
      migrated:     false,
      from_version: current,
      to_version:   current,
      steps:        0,
      backup_path:  null,
    }
  }

  // Database is newer than this binary
  if (compare_versions(current, LATEST_VERSION) > 0) {
    throw new Error(
      `mind.db schema v${current} is newer than this binary supports (v${LATEST_VERSION}). Upgrade brane.`
    )
  }

  // Find the chain of migrations to apply
  const chain: Migration[] = []
  let version = current

  while (compare_versions(version, LATEST_VERSION) < 0) {
    const next = MIGRATIONS.find(m => m.from === version)
    if (!next) {
      throw new Error(
        `no migration path from v${version} to v${LATEST_VERSION}. ` +
        `This may indicate a corrupted schema_meta. ` +
        `Try: brane /mind/init --force`
      )
    }
    chain.push(next)
    version = next.to
  }

  // Backup before migrating
  const backup_dir = dirname(db_path)
  const backup_path = resolve(backup_dir, `mind.db.backup.v${current}`)

  try {
    await db.backup(backup_path)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`failed to backup mind.db before migration: ${msg}`)
  }

  console.error(`brane: migrating mind.db v${current} -> v${LATEST_VERSION} (${chain.length} step${chain.length === 1 ? "" : "s"})`)

  // Apply migrations sequentially
  for (let i = 0; i < chain.length; i++) {
    const step = chain[i]
    console.error(`brane: step ${i + 1}/${chain.length}: v${step.from} -> v${step.to}`)

    try {
      await step.apply(db)
      await set_schema_version(db, step.to)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`brane: migration failed at v${step.from} -> v${step.to}, restoring backup...`)

      // Restore from backup
      try {
        await db.restore(backup_path)
        console.error(`brane: backup restored successfully`)
      } catch (restore_err) {
        const restore_msg = restore_err instanceof Error ? restore_err.message : String(restore_err)
        console.error(`brane: WARNING: backup restore also failed: ${restore_msg}`)
        console.error(`brane: manual backup available at: ${backup_path}`)
      }

      throw new Error(
        `migration v${step.from} -> v${step.to} failed: ${msg}. Database restored from backup.`
      )
    }
  }

  console.error(`brane: migration complete (v${LATEST_VERSION})`)

  return {
    migrated:     true,
    from_version: current,
    to_version:   LATEST_VERSION,
    steps:        chain.length,
    backup_path,
  }
}
