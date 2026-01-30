# Spec: 023-cli-dx

**Status**: Draft
**Priority**: P1 (MVP)
**Dependencies**: 022-whitebox-scripts (complete)

## Problem Statement

Current CLI uses internal API paths (`brane /mind/concepts/create '{}'`) which is:
- Not discoverable (requires memorizing paths)
- Not hacker-friendly (no flags, no tab completion)
- JSON-only input (awkward for simple operations)

## Solution

Professional CLI with noun-verb commands, Unix-style flags, and backwards-compatible API mode.

## Design Principles

1. **Backwards compatible**: If `argv[1]` starts with `/`, use current API mode
2. **Singular nouns**: `brane concept`, not `brane concepts`
3. **Short aliases**: `brane c` = `brane concept`, `brane e` = `brane edge`
4. **Unix output by default**: Human-readable, `--json` for machine parsing
5. **Flags over JSON**: `--name foo --type Entity` for simple cases
6. **Stdin JSON still works**: `echo '{}' | brane concept create` for complex inputs

## Command Hierarchy

```
brane
├── init                          # body init + mind init (convenience)
├── scan <path>                   # body scan + fts index (convenience)
├── search <query>                # /mind/search (convenience)
├── verify [--rule <name>]        # /mind/verify (convenience)
│
├── body | b
│   ├── init [--path <dir>]
│   ├── scan <path> [--dry-run]
│   └── file | f
│       ├── add <path>
│       ├── list [--path <glob>]
│       ├── status [--path <glob>]
│       └── hash <path>
│
├── concept | c
│   ├── create --name <s> --type <Entity|Rule|File> [--description <s>]
│   ├── list [--type <s>] [--limit <n>]
│   ├── get <id>
│   ├── update <id> [--name <s>] [--type <s>]
│   └── delete <id>
│
├── edge | e
│   ├── create --from <id> --to <id> --rel <DEPENDS_ON|IMPLEMENTS|CONTAINS>
│   ├── list [--from <id>] [--to <id>] [--rel <s>]
│   ├── get <id>
│   ├── update <id> [--rel <s>] [--weight <n>]
│   └── delete <id>
│
├── rule | r
│   ├── create --name <s> --description <s> --body <datalog>
│   ├── list
│   ├── get <name>
│   ├── query <name>
│   └── delete <name>
│
├── annotation | a
│   ├── create --concept <id> --type <note|caveat|todo> --text <s>
│   ├── list [--concept <id>] [--type <s>]
│   ├── get <id>
│   └── delete <id>
│
├── provenance | p
│   ├── create --concept <id> --file <url>
│   ├── list [--concept <id>] [--file <url>]
│   └── delete --concept <id> --file <url>
│
├── context
│   └── query <query> [--depth <n>] [--limit <n>]
│
├── fts
│   ├── index [--path <glob>] [--force]
│   └── search <query> [--path <glob>] [--limit <n>]
│
├── extract <path>                # /calabi/extract
├── pr-verify [--rule <name>]     # /calabi/pr-verify
│
└── repl                          # interactive mode
```

## Global Flags

```
--help, -h        Show help for command
--version, -v     Show version
--json, -j        Output as JSON (default: unix-style)
--quiet, -q       Suppress non-error output
--verbose         Show debug information
--no-color        Disable colored output
```

## Output Modes

### Unix Style (default)
```bash
$ brane concept list
ID   NAME           TYPE     CREATED
1    AuthService    Entity   2024-01-30
2    Database       Entity   2024-01-30
3    no_cycles      Rule     2024-01-30

$ brane concept get 1
Name: AuthService
Type: Entity
Created: 2024-01-30T09:00:00Z

$ brane search "authentication"
SCORE  ID   NAME           TYPE
0.92   1    AuthService    Entity
0.45   5    LoginFlow      Entity
```

### JSON Style (--json)
```bash
$ brane concept list --json
{
  "status": "success",
  "result": {
    "concepts": [...],
    "total": 3
  },
  ...
}
```

## API Mode (Backwards Compatible)

If first argument starts with `/`, use existing behavior:

```bash
# These work exactly as before
brane /mind/concepts/create '{"name":"Foo","type":"Entity"}'
brane /body/init
echo '{"query":"auth"}' | brane /mind/search
```

## Flag-to-JSON Mapping

CLI flags map to JSON params:

```bash
brane concept create --name "Foo" --type "Entity"
# equivalent to:
brane /mind/concepts/create '{"name":"Foo","type":"Entity"}'

brane edge create --from 1 --to 2 --rel DEPENDS_ON
# equivalent to:
brane /mind/edges/create '{"source":1,"target":2,"relation":"DEPENDS_ON"}'
```

## Stdin Passthrough

JSON from stdin is merged with flags (flags take precedence):

```bash
echo '{"type":"Entity"}' | brane concept create --name "Foo"
# Results in: {"name":"Foo","type":"Entity"}
```

## Error Output

Errors go to stderr in human-readable format (unless --json):

```bash
$ brane concept create --name "Foo"
error: missing required flag --type
usage: brane concept create --name <s> --type <Entity|Rule|File>

$ brane concept get 999
error: concept not found: 999
```

## Shell Completion

Generate completion scripts:

```bash
brane completion bash > /etc/bash_completion.d/brane
brane completion zsh > ~/.zsh/completions/_brane
brane completion fish > ~/.config/fish/completions/brane.fish
```

## Implementation Notes

### Library: citty

```typescript
import { defineCommand, runMain } from "citty"

const concept = defineCommand({
  meta: { name: "concept", description: "Manage concepts" },
  subCommands: {
    create: defineCommand({
      args: {
        name: { type: "string", required: true, description: "Concept name" },
        type: { type: "string", required: true, description: "Entity|Rule|File" },
      },
      run({ args }) {
        return sys.call("/mind/concepts/create", { name: args.name, type: args.type })
      }
    }),
    list: defineCommand({...}),
    // ...
  }
})
```

### Routing Logic

```typescript
async function main() {
  const args = process.argv.slice(2)

  // API mode: first arg starts with /
  if (args[0]?.startsWith("/")) {
    return api_mode(args)
  }

  // CLI mode: use citty
  return runMain(main_command)
}
```

## User Stories

### US1: Quick Start (P1)
As a new user, I can run `brane init && brane scan src/` and get started without reading docs.

### US2: Discoverability (P1)
As a developer, I can run `brane --help` and `brane concept --help` to discover commands.

### US3: Scripting (P1)
As a CI system, I can use `brane concept list --json` and parse structured output.

### US4: Backwards Compatibility (P1)
As an existing user, my `brane /path/to/handler '{}'` scripts continue to work.

### US5: Tab Completion (P2)
As a power user, I can tab-complete commands and flags in my shell.

## Acceptance Criteria

1. [ ] `brane init` creates .brane/body.db and .brane/mind.db
2. [ ] `brane concept create --name X --type Entity` creates concept
3. [ ] `brane concept list` outputs human-readable table
4. [ ] `brane concept list --json` outputs JSON envelope
5. [ ] `brane /mind/concepts/list` works (API mode)
6. [ ] `brane c list` works (short alias)
7. [ ] All existing whitebox scripts pass (API mode)
8. [ ] New human-friendly whitebox scripts pass
9. [ ] `brane --help` shows all top-level commands
10. [ ] `brane concept --help` shows subcommands and flags

## Non-Goals

- Interactive prompts (keep it non-interactive for scripting)
- Config file support (use env vars if needed)
- Plugin system
