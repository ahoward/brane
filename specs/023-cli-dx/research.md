# Research: 023-cli-dx

## R1: CLI Library Selection

### Question
Which TypeScript CLI library best fits Brane's needs?

### Options Evaluated
1. **commander.js** - Most popular, but TypeScript is bolted-on
2. **yargs** - Feature-rich, but type safety requires plugins
3. **oclif** - Enterprise-grade, but heavy (class-based)
4. **clipanion** - Powers Yarn, but decorator-based
5. **citty** - Powers Nuxt CLI, clean TypeScript
6. **cleye** - Minimal, excellent type inference

### Decision: citty

### Rationale
- Native TypeScript with good inference
- Clean `defineCommand()` API matches Brane's functional style
- Nested subcommands work well (`brane concept create`)
- Auto-generated help
- Lightweight (~15KB)
- Battle-tested (Nuxt CLI)
- Bun compatible

### Verification
```bash
bun add citty
# Test basic command definition compiles and runs
```

---

## R2: Output Format Design

### Question
What should default (non-JSON) output look like?

### Options
1. **Fancy tables** (box-drawing characters)
2. **Tab-separated** (TSV)
3. **Aligned columns** (printf-style)
4. **Key: value** for single objects

### Decision: Tab-separated for lists, Key: Value for objects

### Rationale
- TSV is `cut`/`awk` friendly
- No dependencies needed
- Matches `docker ps`, `kubectl get`
- Column alignment is nice-to-have but adds complexity

### Examples
```
# List output (TSV)
ID	NAME	TYPE	CREATED
1	AuthService	Entity	2024-01-30
2	Database	Entity	2024-01-30

# Single object output
Name: AuthService
Type: Entity
Created: 2024-01-30T09:00:00Z

# Search results
SCORE	ID	NAME	TYPE
0.92	1	AuthService	Entity
```

---

## R3: Alias Implementation

### Question
How to implement short aliases (`c` → `concept`)?

### Options
1. **citty aliases** - If supported natively
2. **Pre-processing** - Expand before passing to citty
3. **Duplicate commands** - Register both `c` and `concept`

### Decision: Pre-processing expansion

### Rationale
- citty doesn't have native alias support
- Pre-processing is simple and transparent
- Only expand first 1-2 args (commands, not values)

### Implementation
```typescript
const aliases = { c: "concept", e: "edge", ... }

function expand(args: string[]): string[] {
  return args.map((arg, i) =>
    i < 2 && !arg.startsWith("-") && aliases[arg]
      ? aliases[arg]
      : arg
  )
}
```

---

## R4: Stdin + Flags Merge Strategy

### Question
How to handle both stdin JSON and CLI flags?

### Options
1. **Flags only** - Ignore stdin in CLI mode
2. **Stdin only** - Ignore flags if stdin present
3. **Merge (stdin base, flags override)**
4. **Error if both**

### Decision: Merge with flags taking precedence

### Rationale
- Allows partial override: `echo '{"type":"Entity"}' | brane c create --name Foo`
- Intuitive: explicit flags beat implicit stdin
- Power user feature for complex operations

### Implementation
```typescript
async function get_params(args: ParsedArgs): Promise<object> {
  let params = {}

  // Read stdin if available
  if (!process.stdin.isTTY) {
    const stdin = await read_stdin()
    if (stdin.trim()) {
      params = JSON.parse(stdin)
    }
  }

  // Merge flags (override stdin)
  return { ...params, ...flags_to_params(args) }
}
```

---

## R5: Compiled Binary Compatibility

### Question
Will citty work with `bun build --compile`?

### Investigation Required
- citty uses dynamic imports internally?
- Any Node.js-specific APIs that Bun compile doesn't support?

### Mitigation Plan
1. Test early in Phase 1
2. If issues: fall back to cleye (more minimal)
3. Last resort: hand-roll with process.argv parsing

### Test Command
```bash
bun add citty
bun build src/cli.ts --compile --outfile brane-test
./brane-test concept list --help
```

---

## R6: Help Text Quality

### Question
How to ensure help is discoverable and useful?

### Best Practices (from clig.dev)
1. Lead with examples
2. Show most common use first
3. Include `--help` at every level
4. Group related flags

### citty Help Customization
```typescript
defineCommand({
  meta: {
    name: "concept",
    description: "Manage concepts in the knowledge graph",
    // citty supports examples in meta
  },
  args: {
    name: {
      type: "string",
      required: true,
      description: "Concept name (e.g., 'AuthService')",
    },
  },
})
```

### Example Help Output Target
```
brane concept create - Create a new concept

Usage:
  brane concept create --name <name> --type <type> [options]

Examples:
  brane concept create --name AuthService --type Entity
  brane c create -n UserModel -t Entity -d "User data model"

Options:
  --name, -n     Concept name (required)
  --type, -t     Entity | Rule | File (required)
  --description, -d  Optional description
  --json, -j     Output as JSON

Aliases: brane c create
```
