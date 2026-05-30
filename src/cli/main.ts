//
// main.ts - Main CLI command definition
//
// Hippocampus v2: 3 top-level verbs (remember, recall, forget)
// Everything else under `brane admin <command>`
//

import { defineCommand } from "citty"
import { get_version } from "../version.ts"

// Top-level hippocampus commands
import { remember, recall, forget, memory } from "./commands/memory.ts"

// Init stays top-level (needed before anything else)
import { init } from "./commands/init.ts"
import { status } from "./commands/status.ts"

// Admin commands
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
import { ingestSessions } from "./commands/ingest-sessions.ts"
import { digest } from "./commands/digest.ts"
import { ask } from "./commands/ask.ts"
import { storm } from "./commands/storm.ts"
import { enhance } from "./commands/enhance.ts"
import { loop } from "./commands/loop.ts"
import { rebuild } from "./commands/rebuild.ts"
import { tldr } from "./commands/tldr.ts"
import { consolidate } from "./commands/consolidate.ts"
import { decay } from "./commands/decay.ts"

//
// Admin namespace: all power-user / graph commands
//
const admin = defineCommand({
  meta: {
    name: "admin",
    description: "Admin commands: graph, search, verify, prune, digest, and more",
  },
  subCommands: {
    // Knowledge ops
    digest,
    ask,
    storm,
    enhance,
    loop,
    rebuild,
    tldr,
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

    // Memory admin
    memory,
    consolidate,
    decay,
    "ingest-sessions": ingestSessions,

    // Graph exploration
    graph,
  },
})

export const main = defineCommand({
  meta: {
    name: "brane",
    version: get_version(),
    description: "Semantic Nervous System - 3 verbs: remember, recall, forget",
  },
  subCommands: {
    // Hippocampus: the 3 verbs (primary interface)
    remember,
    recall,
    forget,

    // Essential commands (stay top-level)
    init,
    status,

    // Admin namespace (power-user / graph commands)
    admin,

    // Backward-compat: all commands also accessible directly
    digest,
    ask,
    storm,
    enhance,
    loop,
    rebuild,
    tldr,
    search,
    verify,
    prune,
    concept,
    edge,
    rule,
    annotation,
    provenance,
    body,
    fts,
    context,
    "pr-verify": prVerify,
    lens,
    memory,
    consolidate,
    decay,
    "ingest-sessions": ingestSessions,
    graph,
  },
})

// Alias mapping for short commands
export const subCommandAliases: Record<string, string> = {
  r: "remember",
  "?": "recall",
  x: "forget",
}
