# Brane Coding Conventions

**Runtime:** Bun.js (TypeScript)
**Architecture:** Hexagonal / Ports & Adapters
**Test Framework:** tc (language-agnostic, JSON in/out)

---

## The Core Interface: `sys.call`

Every internal operation goes through a single, brutally consistent interface:

```typescript
const result = await sys.call("/namespace/method", data)
```

### Path Convention

Paths are namespaced, Unix-style, lowercase, kebab-case:

```typescript
sys.call("/body/files/hash", { path: "./src/index.ts" })
sys.call("/mind/concepts/create", { name: "AuthService", type: "Entity" })
sys.call("/admin/user/update", { id: 42, name: "ara" })
sys.call("/calabi/extract", { chunk: "..." })
```

### Input: Plain Old Data (POD)

Input is always a plain object. No classes, no instances, no magic.

```typescript
// YES - POD
sys.call("/body/scan", {
  path: "./src",
  exclude: ["node_modules", ".git"]
})

// NO - instances, classes, functions
sys.call("/body/scan", new ScanOptions(...))  // NO
sys.call("/body/scan", { callback: fn })       // NO
```

### Output: The Result Envelope

Every call returns the same shape. Always. No exceptions.

```typescript
interface Result<T = unknown> {
  status: "success" | "error"
  result: T | null
  errors: ErrorMap | null
  meta: Meta
}

interface Meta {
  path: string
  timestamp: string
  duration_ms: number
  [key: string]: unknown
}
```

### Error Structure: Mirror of Result

Errors mirror the result structure with arrays at leaf nodes:

```typescript
// If result would be:
{
  user: {
    name: "ara",
    email: "ara@example.com"
  }
}

// Errors mirror that path:
{
  user: {
    name: [{ code: "required", message: "name is required" }],
    email: [{ code: "invalid", message: "not a valid email" }]
  }
}
```

Error objects have consistent shape:

```typescript
interface ErrorDetail {
  code: string      // machine-readable: "required", "invalid", "not_found"
  message: string   // human-readable: "name is required"
  meta?: unknown    // optional context
}
```

---

## Example Call Flow

```typescript
// Success
const result = await sys.call("/mind/concepts/find", { name: "AuthService" })
// {
//   status: "success",
//   result: { id: 105, name: "AuthService", type: "Entity" },
//   errors: null,
//   meta: { path: "/mind/concepts/find", timestamp: "...", duration_ms: 3 }
// }

// Error
const result = await sys.call("/mind/concepts/create", { name: "" })
// {
//   status: "error",
//   result: null,
//   errors: { name: [{ code: "required", message: "name cannot be empty" }] },
//   meta: { path: "/mind/concepts/create", timestamp: "...", duration_ms: 1 }
// }

// Partial success with warnings (still "success" status)
const result = await sys.call("/body/scan", { path: "./src" })
// {
//   status: "success",
//   result: { files: [...], skipped: 3 },
//   errors: null,
//   meta: {
//     path: "/body/scan",
//     warnings: [{ code: "permission_denied", message: "..." }]
//   }
// }
```

---

## Handler Registration

Handlers are registered at paths:

```typescript
// src/handlers/body/files/hash.ts
export const handler: Handler = async (input) => {
  const { path } = input

  if (!path) {
    return {
      status: "error",
      result: null,
      errors: { path: [{ code: "required", message: "path is required" }] },
      meta: {}
    }
  }

  const hash = await hashFile(path)

  return {
    status: "success",
    result: { path, hash },
    errors: null,
    meta: {}
  }
}
```

Registration happens via file system convention:

```
src/handlers/
├── body/
│   ├── files/
│   │   ├── hash.ts      → /body/files/hash
│   │   └── scan.ts      → /body/files/scan
│   └── chunks/
│       └── extract.ts   → /body/chunks/extract
├── mind/
│   └── concepts/
│       ├── create.ts    → /mind/concepts/create
│       ├── find.ts      → /mind/concepts/find
│       └── update.ts    → /mind/concepts/update
└── _sys/
    ├── ping.ts          → /_sys/ping
    └── handlers.ts      → /_sys/handlers
```

---

## REPL Interface

The REPL is the primary development interface:

```
brane> /body/files/hash {"path": "./src/index.ts"}
{
  "status": "success",
  "result": { "path": "./src/index.ts", "hash": "abc123..." },
  "errors": null,
  "meta": { "path": "/body/files/hash", "duration_ms": 2 }
}

brane> /_sys/handlers
{
  "status": "success",
  "result": ["/body/files/hash", "/body/files/scan", ...],
  ...
}
```

REPL commands:
- `/path/to/handler {...}` - call handler with JSON input
- `.help` - show help
- `.handlers` - list all registered handlers
- `.exit` - quit

---

## TypeScript Conventions

### Module Structure

```typescript
// src/lib/thing.ts

// types at top
//
export interface Thing {
  id: number
  name: string
}

// constants
//
export const THING_VERSION = "1.0.0"

// main exports
//
export function createThing(name: string): Thing {
  return { id: Date.now(), name }
}

// internal helpers below
//
function validate(name: string): boolean {
  return name.length > 0
}
```

### Naming

| Thing | Style | Example |
|-------|-------|---------|
| Files | `kebab-case.ts` | `file-record.ts` |
| Types/Interfaces | `PascalCase` | `FileRecord`, `Result` |
| Constants | `SCREAMING_SNAKE` | `MAX_SIZE`, `VERSION` |
| Functions | `snake_case` | `compute_hash`, `read_file` |
| Variables | `snake_case` | `file_path`, `hash_value` |
| Handler paths | `/kebab-case` | `/body/files/hash` |

**Note:** We use `snake_case` for functions/variables (Ruby-style), not `camelCase`.
Exception: External library APIs may require camelCase.

### Terminology

| Term | Meaning | Chars |
|------|---------|-------|
| `params` | Input to a handler | 6 |
| `result` | Output from a handler | 6 |

Never use "data" - too generic. The symmetry of 6-char names is intentional.

### Whitespace

Be pedantic. Consistent spacing matters.

```typescript
// YES
const result = await sys.call("/ping", params)

// NO
const result=await sys.call("/ping",params)
```

### Guards and Early Returns

```typescript
export async function handler(input: Input): Promise<Result> {
  // guard first
  if (!input.path) {
    return errorResult({ path: [required("path")] })
  }

  // happy path
  const data = await process(input.path)
  return successResult(data)
}
```

### Result Helpers

```typescript
// src/lib/result.ts

export function successResult<T>(result: T, meta: Partial<Meta> = {}): Result<T> {
  return {
    status: "success",
    result,
    errors: null,
    meta: { ...meta }
  }
}

export function errorResult(errors: ErrorMap, meta: Partial<Meta> = {}): Result {
  return {
    status: "error",
    result: null,
    errors,
    meta: { ...meta }
  }
}

export function required(field: string): ErrorDetail {
  return { code: "required", message: `${field} is required` }
}

export function invalid(field: string, reason: string): ErrorDetail {
  return { code: "invalid", message: `${field} ${reason}` }
}
```

---

## Testing with tc

Tests are language-agnostic JSON in/out:

```
tests/
└── body/
    └── files/
        └── hash/
            ├── run                    # calls brane cli
            └── data/
                ├── success/
                │   ├── input.json     # { "path": "./fixture.txt" }
                │   └── expected.json  # { "status": "success", "result": { "hash": "<string>" } }
                └── missing-path/
                    ├── input.json     # {}
                    └── expected.json  # { "status": "error", "errors": { "path": [...] } }
```

The `run` script:

```bash
#!/usr/bin/env bash
exec brane call /body/files/hash
```

Pattern matching in expected.json:

```json
{
  "status": "success",
  "result": {
    "hash": "<string>",
    "timestamp": "<timestamp>"
  },
  "meta": {
    "duration_ms": "<number>"
  }
}
```

---

## File I/O

Use Bun's native APIs:

```typescript
// read
const content = await Bun.file(path).text()
const bytes = await Bun.file(path).arrayBuffer()

// write (atomic via temp file)
const tmp = `${path}.tmp.${crypto.randomUUID()}`
await Bun.write(tmp, content)
await Bun.rename(tmp, path)

// check existence
import { exists } from "fs/promises"
if (await exists(path)) { ... }
```

---

## Directory Structure

```
brane/
├── src/
│   ├── index.ts           # entry point
│   ├── repl.ts            # REPL implementation
│   ├── sys.ts             # sys.call implementation
│   ├── handlers/          # handler implementations by path
│   │   ├── _sys/          # system handlers
│   │   ├── body/          # body (SQLite) handlers
│   │   └── mind/          # mind (CozoDB) handlers
│   └── lib/               # shared utilities
│       ├── result.ts      # result/error helpers
│       ├── types.ts       # shared types
│       └── db/            # database utilities
├── tests/                 # tc test suites
├── dna/                   # project knowledge
├── .brane/                # runtime data (gitignored)
├── package.json
├── tsconfig.json
└── bunfig.toml
```

---

## What We Don't Do

- **No classes for data** - POD only
- **No exceptions for control flow** - return Result
- **No magic decorators** - explicit registration
- **No dependency injection frameworks** - simple imports
- **No ORMs** - raw SQL/Datalog
- **No runtime type checking libraries** - TypeScript is enough
- **No multiple return shapes** - always Result envelope

---

## Philosophy

From the PRD:

> **Core Thesis:** AI Agents do not need more context windows; they need **structured memory**.

The sys.call interface is that structure:
- Every operation is addressable
- Every operation has the same shape
- Every operation is testable with JSON in/out
- Every operation can be logged, traced, replayed

Simple beats clever. Consistency beats flexibility.

---

*Adapted from ara.t.howard's coding conventions (143 Ruby gems) for Bun.js/TypeScript.*
