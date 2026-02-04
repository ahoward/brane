//
// main.ts - Main CLI command definition
//

import { defineCommand } from "citty"

// Import all commands
import { init } from "./commands/init.ts"
import { scan } from "./commands/scan.ts"
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
import { extract } from "./commands/extract.ts"
import { prVerify } from "./commands/pr-verify.ts"
import { lens } from "./commands/lens.ts"
import { graph } from "./commands/graph.ts"

export const main = defineCommand({
  meta: {
    name: "brane",
    version: "0.1.0",
    description: "Semantic Nervous System - Knowledge Graph CLI",
  },
  subCommands: {
    // Convenience commands (most used)
    init,
    scan,
    search,
    verify,

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
    extract,
    "pr-verify": prVerify,

    // Lens commands
    lens,

    // Graph exploration
    graph,
  },
})

// Alias mapping for short commands
export const subCommandAliases: Record<string, string> = {
  c: "concept",
  e: "edge",
  r: "rule",
  a: "annotation",
  p: "provenance",
  b: "body",
  f: "fts",
  l: "lens",
  g: "graph",
}
