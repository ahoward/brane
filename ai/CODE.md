# Brane Code Style Guide

**Runtime:** Bun.js (TypeScript)
**Architecture:** Hexagonal with sys.call interface

---

## The Big Picture

### Philosophy

**Simple beats clever. Consistency beats flexibility. POD beats classes.**

Brane uses a single internal API pattern for everything:

```typescript
const result = await sys.call("/path/to/method", data)
```

Every method:
- Takes POD (Plain Old Data) input
- Returns POD output in a consistent envelope
- Is addressable by path
- Is testable with JSON in/out

---

## The Result Envelope

Every sys.call returns exactly this shape:

```typescript
interface Result<T = unknown> {
  status: "success" | "error"
  result: T | null
  errors: ErrorMap | null
  meta: Meta
}
```

### Success

```typescript
{
  status: "success",
  result: { id: 1, name: "thing" },
  errors: null,
  meta: { path: "/things/create", duration_ms: 5 }
}
```

### Error

```typescript
{
  status: "error",
  result: null,
  errors: {
    name: [{ code: "required", message: "name is required" }]
  },
  meta: { path: "/things/create", duration_ms: 1 }
}
```

### Error Mirror Structure

Errors mirror the result shape with arrays at leaves:

```typescript
// If result would be nested:
{ user: { profile: { name: "ara" } } }

// Errors mirror that path:
{ user: { profile: { name: [{ code: "invalid", message: "..." }] } } }
```

---

## Handler Pattern

Handlers live in `src/handlers/` following path convention:

```
src/handlers/body/files/hash.ts → /body/files/hash
```

Handler signature:

```typescript
import type { Handler } from "@/lib/types"
import { success, error, required } from "@/lib/result"

export const handler: Handler = async (input) => {
  const { path } = input

  if (!path) {
    return error({ path: [required("path")] })
  }

  const hash = await computeHash(path)
  return success({ path, hash })
}
```

---

## TypeScript Conventions

### File Structure

```typescript
// types first
//
interface Thing {
  id: number
  name: string
}

// constants
//
const VERSION = "1.0.0"

// exports
//
export function createThing(name: string): Thing {
  return { id: Date.now(), name }
}

// internal helpers
//
function validate(name: string): boolean {
  return name.length > 0
}
```

### Naming

| Thing | Style | Example |
|-------|-------|---------|
| Files | kebab-case | `file-hash.ts` |
| Types | PascalCase | `FileRecord` |
| Functions | camelCase | `computeHash` |
| Constants | SCREAMING_SNAKE | `MAX_SIZE` |
| Handler paths | /kebab-case | `/body/files/hash` |

### Guards and Early Returns

```typescript
async function handler(input: Input): Promise<Result> {
  // guards first
  if (!input.path) {
    return error({ path: [required("path")] })
  }

  if (!await exists(input.path)) {
    return error({ path: [notFound(input.path)] })
  }

  // happy path
  const data = await process(input.path)
  return success(data)
}
```

### No Classes for Data

```typescript
// YES - POD
interface User {
  id: number
  name: string
}

function createUser(name: string): User {
  return { id: Date.now(), name }
}

// NO - classes
class User {
  constructor(public name: string) {}
}
```

### No Exceptions for Control Flow

```typescript
// YES - return Result
function parse(json: string): Result<Data> {
  try {
    return success(JSON.parse(json))
  } catch (e) {
    return error({ json: [{ code: "invalid", message: "invalid JSON" }] })
  }
}

// NO - throw
function parse(json: string): Data {
  return JSON.parse(json)  // throws on invalid
}
```

---

## File I/O

Use Bun's native APIs:

```typescript
// read
const text = await Bun.file(path).text()
const bytes = await Bun.file(path).arrayBuffer()
const json = await Bun.file(path).json()

// write (prefer atomic)
async function writeAtomic(path: string, content: string) {
  const tmp = `${path}.tmp.${crypto.randomUUID()}`
  await Bun.write(tmp, content)
  await Bun.rename(tmp, path)
}

// check existence
import { exists } from "fs/promises"
if (await exists(path)) { ... }
```

---

## Testing

Tests use tc (language-agnostic JSON in/out):

```
tests/body/files/hash/
├── run
└── data/
    ├── success/
    │   ├── input.json
    │   └── expected.json
    └── missing-path/
        ├── input.json
        └── expected.json
```

Pattern matching in expected.json:

```json
{
  "status": "success",
  "result": {
    "hash": "<string>",
    "size": "<number>"
  },
  "meta": {
    "duration_ms": "<number>"
  }
}
```

---

## What We Don't Do

- No classes for data (POD only)
- No exceptions for control flow (return Result)
- No magic decorators (explicit registration)
- No DI frameworks (simple imports)
- No ORMs (raw SQL/Datalog)
- No multiple return shapes (always Result)
- No optional chaining abuse (guard early)

---

## Real Principles

1. **POD in, POD out** - no classes, no magic
2. **One interface** - sys.call for everything
3. **Mirror errors** - errors match result structure
4. **Guard early** - return errors at top
5. **Atomic writes** - temp file then rename
6. **Test with JSON** - tc for language-agnostic tests
7. **Simple beats clever** - always

---

*Derived from ara.t.howard's patterns across 143 Ruby gems, adapted for Bun.js/TypeScript.*
