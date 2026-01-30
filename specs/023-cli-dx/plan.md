# Plan: 023-cli-dx

**Spec**: spec.md
**Status**: Draft

## Technical Context

- **Runtime**: Bun 1.x (TypeScript native)
- **CLI Library**: citty (UnJS ecosystem)
- **Existing**: sys.call() routing, JSON envelope responses
- **Compiled Binary**: `bun build --compile` (must continue to work)

## Architecture

### File Structure

```
src/
├── cli.ts              # Entry point (routing: API vs CLI mode)
├── cli/
│   ├── main.ts         # Main citty command definition
│   ├── output.ts       # Output formatting (unix/json)
│   ├── commands/
│   │   ├── init.ts     # brane init (convenience)
│   │   ├── scan.ts     # brane scan (convenience)
│   │   ├── search.ts   # brane search (convenience)
│   │   ├── verify.ts   # brane verify (convenience)
│   │   ├── body.ts     # brane body [init|scan|file]
│   │   ├── concept.ts  # brane concept [create|list|get|update|delete]
│   │   ├── edge.ts     # brane edge [create|list|get|update|delete]
│   │   ├── rule.ts     # brane rule [create|list|get|query|delete]
│   │   ├── annotation.ts
│   │   ├── provenance.ts
│   │   ├── context.ts
│   │   ├── fts.ts
│   │   ├── extract.ts
│   │   ├── pr-verify.ts
│   │   └── repl.ts
│   └── aliases.ts      # Short command aliases (c→concept, e→edge)
└── handlers/           # Unchanged - sys.call() targets
```

### Routing Logic

```typescript
// cli.ts
async function main() {
  const args = process.argv.slice(2)

  // No args → REPL
  if (args.length === 0) {
    return start_repl()
  }

  // API mode: first arg starts with /
  if (args[0].startsWith("/")) {
    return api_mode(args)
  }

  // CLI mode
  return cli_mode(args)
}
```

### Command Definition Pattern

```typescript
// src/cli/commands/concept.ts
import { defineCommand } from "citty"
import { sys } from "../../index.ts"
import { output } from "../output.ts"

export const concept = defineCommand({
  meta: {
    name: "concept",
    description: "Manage concepts in the knowledge graph",
  },
  subCommands: {
    create: defineCommand({
      meta: { name: "create", description: "Create a new concept" },
      args: {
        name: { type: "string", required: true, alias: "n", description: "Concept name" },
        type: { type: "string", required: true, alias: "t", description: "Entity|Rule|File" },
        description: { type: "string", alias: "d", description: "Optional description" },
      },
      async run({ args }) {
        const result = await sys.call("/mind/concepts/create", {
          name: args.name,
          type: args.type,
          description: args.description,
        })
        output(result, args)
      },
    }),
    list: defineCommand({
      meta: { name: "list", description: "List concepts" },
      args: {
        type: { type: "string", alias: "t", description: "Filter by type" },
        limit: { type: "string", alias: "l", description: "Max results" },
        json: { type: "boolean", alias: "j", description: "JSON output" },
      },
      async run({ args }) {
        const result = await sys.call("/mind/concepts/list", {
          type: args.type,
          limit: args.limit ? parseInt(args.limit) : undefined,
        })
        output(result, args)
      },
    }),
    // get, update, delete...
  },
})
```

### Output Formatting

```typescript
// src/cli/output.ts
import type { Result } from "../lib/types.ts"

interface OutputOptions {
  json?: boolean
  quiet?: boolean
}

export function output(result: Result<any>, options: OutputOptions = {}) {
  if (options.json) {
    console.log(JSON.stringify(result, null, 2))
  } else if (result.status === "error") {
    format_error(result)
  } else {
    format_success(result)
  }

  if (result.status === "error") {
    process.exit(1)
  }
}

function format_error(result: Result<any>) {
  // Human-readable error to stderr
  for (const [field, errors] of Object.entries(result.errors || {})) {
    for (const err of errors as any[]) {
      console.error(`error: ${err.message}`)
    }
  }
}

function format_success(result: Result<any>) {
  // Detect result shape and format appropriately
  const data = result.result

  if (Array.isArray(data)) {
    format_table(data)
  } else if (data?.concepts) {
    format_table(data.concepts)
  } else if (data?.edges) {
    format_table(data.edges)
  } else if (data?.matches) {
    format_search_results(data.matches)
  } else if (typeof data === "object") {
    format_object(data)
  } else {
    console.log(data)
  }
}

function format_table(rows: any[]) {
  if (rows.length === 0) {
    console.log("(no results)")
    return
  }
  // Simple table formatting
  const keys = Object.keys(rows[0])
  const header = keys.map(k => k.toUpperCase()).join("\t")
  console.log(header)
  for (const row of rows) {
    console.log(keys.map(k => row[k] ?? "").join("\t"))
  }
}
```

### Alias Registration

```typescript
// src/cli/aliases.ts
export const aliases: Record<string, string> = {
  c: "concept",
  e: "edge",
  r: "rule",
  a: "annotation",
  p: "provenance",
  b: "body",
  f: "file",
}

// Expand aliases before citty routing
export function expand_aliases(args: string[]): string[] {
  return args.map((arg, i) => {
    // Only expand if it looks like a command (not a flag or value)
    if (i < 2 && !arg.startsWith("-") && aliases[arg]) {
      return aliases[arg]
    }
    return arg
  })
}
```

## Research Decisions

### R1: citty vs cleye

**Decision**: citty

**Rationale**:
- Better subcommand support (nested defineCommand)
- Built-in help generation
- Used by Nuxt CLI (proven at scale)
- Clean async run() handlers

### R2: Output Formatting

**Decision**: Tab-separated tables for lists, key: value for objects

**Rationale**:
- Tab-separated is parseable by cut/awk
- Consistent with ls, ps, docker ps
- No external table library needed

### R3: Stdin JSON Handling

**Decision**: Merge stdin JSON with flags (flags win)

**Rationale**:
- Allows `echo '{"type":"Entity"}' | brane concept create --name Foo`
- Flags override stdin for explicit user intent
- Backwards compatible with pure JSON input

### R4: Error Format

**Decision**: `error: <message>` to stderr

**Rationale**:
- Matches git, cargo, npm conventions
- Doesn't pollute stdout for piping
- `--json` still returns full envelope to stdout

## Implementation Phases

### Phase 1: Foundation
- Install citty
- Create cli/ directory structure
- Implement routing (API vs CLI mode)
- Implement output formatting module

### Phase 2: Core Commands
- Implement convenience commands (init, scan, search, verify)
- Implement concept commands
- Implement edge commands

### Phase 3: Complete Commands
- Implement rule, annotation, provenance commands
- Implement body, fts, context commands
- Implement extract, pr-verify commands

### Phase 4: Polish
- Add aliases
- Add --help improvements
- Update whitebox scripts to use new CLI
- Add completion generation (stretch)

## Risk Mitigation

### Risk: citty doesn't work with bun compile
**Mitigation**: Test early with `bun build --compile`. If issues, fall back to cleye or manual parsing.

### Risk: Breaking existing scripts
**Mitigation**: API mode (`/path` prefix) is untouched. All existing whitebox scripts should pass unchanged.

### Risk: Complex flag parsing edge cases
**Mitigation**: Keep JSON input as escape hatch for complex cases.

## Dependencies

```json
{
  "dependencies": {
    "citty": "^0.1.6"
  }
}
```

## Test Strategy

1. **Existing whitebox scripts**: Must pass unchanged (API mode)
2. **New CLI whitebox scripts**: Mirror functionality with new syntax
3. **Unit tests**: Output formatting functions
4. **Manual testing**: Tab completion, help output
