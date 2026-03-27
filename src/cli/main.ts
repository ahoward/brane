//
// main.ts - Main CLI command definition
//

import { defineCommand } from "citty"
import { get_version } from "../version.ts"

// Import all commands
import { init } from "./commands/init.ts"
import { search } from "./commands/search.ts"
import { verify } from "./commands/verify.ts"
import { concept } from "./commands/concept.ts"
import { edge } from "./commands/edge.ts"
import { rule } from "./commands/rule.ts"
import { body } from "./commands/body.ts"
import { fts } from "./commands/fts.ts"
import { annotation } from "./commands/annotation.ts"
import { provenance } from "./commands/provenance.ts"
import { context } from "./commands/context.ts"
import { prVerify } from "./commands/pr-verify.ts"
import { lens } from "./commands/lens.ts"
import { graph } from "./commands/graph.ts"
import { prune } from "./commands/prune.ts"
import { memory } from "./commands/memory.ts"
import { ingestSessions } from "./commands/ingest-sessions.ts"
import { status } from "./commands/status.ts"
import { digest } from "./commands/digest.ts"
import { ask } from "./commands/ask.ts"
import { storm } from "./commands/storm.ts"
import { enhance } from "./commands/enhance.ts"

export const main = defineCommand({
  meta: {
    name: "brane",
    version: get_version(),
    description: "Semantic Nervous System - Knowledge Graph CLI",
  },
  subCommands: {
    // Convenience commands (most used)
    init,
    status,
    digest,
    ask,
    storm,
    enhance,
    search,
    verify,
    prune,

    // Resource commands
    concept,
    edge,
    rule,
    annotation,
    provenance,

    // Subsystem commands
    body,
    fts,
    context,

    // Calabi commands
    "pr-verify": prVerify,

    // Lens commands
    lens,

    // Memory commands
    memory,
    "ingest-sessions": ingestSessions,

    // Graph exploration
    graph,
  },
})

// Alias mapping for short commands
export const subCommandAliases: Record<string, string> = {
  d: "digest",
  s: "storm",
  c: "concept",
  e: "edge",
  r: "rule",
  a: "annotation",
  p: "provenance",
  b: "body",
  f: "fts",
  l: "lens",
  g: "graph",
  m: "memory",
}
