# Current Prompt / Task

## Active Task

**Implement basic harness: REPL + sys.call + /ping**

## Goal

Get the foundational system running:
1. `sys.call("/ping", params)` - echoes params back
2. CLI invocation: `brane /ping '{"foo": "bar"}'`
3. REPL: `brane repl` then `/ping {"foo": "bar"}`
4. Global `sys` object exported for programmatic use

## Interface Design

### sys.call

```typescript
// Direct programmatic call
import { sys } from "brane"

const response = await sys.call("/ping", { echo: "hello" })
// {
//   status: "success",
//   result: { echo: "hello" },
//   errors: null,
//   meta: { path: "/ping", timestamp: "...", duration_ms: 0 }
// }
```

### CLI

```bash
# Params from argument (JSON string)
brane /ping '{"echo": "hello"}'

# Params from stdin (default, like curl)
echo '{"echo": "hello"}' | brane /ping

# Params from file (@ prefix, like curl)
brane /ping @params.json

# Params from directory (all .json files merged? TBD)
brane /ping @params/
```

### REPL

```
$ brane repl
brane> /ping {"echo": "hello"}
{
  "status": "success",
  "result": { "echo": "hello" },
  ...
}
brane> .exit
```

## /ping Handler

The simplest possible handler - echoes params as result:

```typescript
// src/handlers/ping.ts
export async function handler(params: unknown): Promise<Result> {
  return {
    status: "success",
    result: params,
    errors: null,
    meta: {}
  }
}
```

## Constraints

- `params` = input (not "data")
- `result` = output
- snake_case for variables/functions
- Pedantic whitespace
- Result envelope always

## Open Questions

1. Directory input - merge all .json files? Or error?
2. Empty params - `{}` or `null`?
3. REPL prompt format - `brane>` or `>`?

## Expected Output

Working system where:
```bash
brane /ping '{"test": true}'
# outputs JSON result

brane repl
# interactive REPL

# In code:
import { sys } from "brane"
await sys.call("/ping", {})
```
