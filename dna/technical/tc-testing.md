# tc Testing Conventions

**Source:** https://github.com/ahoward/tc

tc is a language-agnostic testing framework. Tests are specifications - implementations are disposable.

---

## Philosophy

> "In the AI age, specifications and tests are permanent while implementations are disposable."

Tests define the contract. Any language can implement that contract.

---

## How It Works

1. Tests provide input via `input.json` (stdin)
2. Any executable `run` script processes input
3. Output goes to stdout as JSON
4. tc compares actual vs `expected.json`

---

## Directory Structure

```
tests/
└── namespace/
    └── method/
        ├── run                    # executable (bash, bun, whatever)
        └── data/
            ├── happy-path/
            │   ├── input.json     # test input
            │   └── expected.json  # expected output
            ├── validation-error/
            │   ├── input.json
            │   └── expected.json
            └── edge-case/
                ├── input.json
                └── expected.json
```

---

## The `run` Script

For Brane, `run` calls the CLI:

```bash
#!/usr/bin/env bash
exec brane call /body/files/hash
```

Or directly via bun:

```bash
#!/usr/bin/env bash
exec bun run src/cli.ts call /body/files/hash
```

Input comes from stdin, output goes to stdout.

---

## Pattern Matching

expected.json can use patterns instead of exact values:

| Pattern | Matches |
|---------|---------|
| `<uuid>` | UUID v4 format |
| `<timestamp>` | ISO 8601 timestamp |
| `<number>` | Any number |
| `<string>` | Any string |
| `<boolean>` | true or false |
| `<null>` | null |
| `<any>` | Anything |

### Example

input.json:
```json
{
  "path": "./fixtures/sample.txt"
}
```

expected.json:
```json
{
  "status": "success",
  "result": {
    "path": "./fixtures/sample.txt",
    "hash": "<string>",
    "size": "<number>"
  },
  "errors": null,
  "meta": {
    "path": "/body/files/hash",
    "timestamp": "<timestamp>",
    "duration_ms": "<number>"
  }
}
```

---

## Test Naming Convention

Use kebab-case, descriptive names:

```
tests/body/files/hash/data/
├── success-basic/
├── success-large-file/
├── error-missing-path/
├── error-file-not-found/
└── error-permission-denied/
```

---

## Brane Test Patterns

### Success Case

input.json:
```json
{
  "path": "./fixtures/hello.txt"
}
```

expected.json:
```json
{
  "status": "success",
  "result": {
    "path": "./fixtures/hello.txt",
    "hash": "<string>"
  },
  "errors": null,
  "meta": {
    "path": "/body/files/hash",
    "duration_ms": "<number>"
  }
}
```

### Validation Error

input.json:
```json
{}
```

expected.json:
```json
{
  "status": "error",
  "result": null,
  "errors": {
    "path": [
      {
        "code": "required",
        "message": "<string>"
      }
    ]
  },
  "meta": {
    "path": "/body/files/hash",
    "duration_ms": "<number>"
  }
}
```

### Not Found Error

input.json:
```json
{
  "path": "./does-not-exist.txt"
}
```

expected.json:
```json
{
  "status": "error",
  "result": null,
  "errors": {
    "path": [
      {
        "code": "not_found",
        "message": "<string>"
      }
    ]
  },
  "meta": {
    "path": "/body/files/hash",
    "duration_ms": "<number>"
  }
}
```

---

## Running Tests

```bash
# run all tests
tc tests/

# run specific namespace
tc tests/body/

# run specific method
tc tests/body/files/hash/

# verbose output
tc -v tests/
```

---

## Why tc?

1. **Language-agnostic** - Same tests work if we rewrite in Rust/Go/whatever
2. **Spec-first** - Tests are the specification
3. **Simple** - JSON in, JSON out
4. **Debuggable** - Easy to inspect input/output
5. **AI-friendly** - Structured data, not prose assertions

---

*tc separates "what" (the test) from "how" (the implementation).*
