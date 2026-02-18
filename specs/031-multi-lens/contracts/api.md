# API Contracts: Multi-Lens

All endpoints follow the standard Result envelope: `{ status, result, errors, meta }`.

## New Endpoints

### `/state/init`

Create `.brane/state.db` with the config table. Idempotent.

```
Input:  {}
Output: { path: string, created: boolean }
Errors: { state: [{ code: "write_error", message }] }
```

### `/lens/create`

Create a new named lens with body.db + mind.db.

```
Input:  { name: string, config?: string }   // config = YAML file path
Output: { name: string, path: string, created: boolean }
Errors:
  name:   [{ code: "required" | "invalid" | "already_exists", message }]
  config: [{ code: "not_found" | "invalid_yaml" | "missing_name", message }]
```

### `/lens/use`

Set the active lens in state.db.

```
Input:  { name: string }
Output: { name: string, active: true }
Errors:
  name: [{ code: "required" | "not_found", message }]
```

### `/lens/list`

List all available lenses with active marker.

```
Input:  {}
Output: { lenses: [{ name: string, active: boolean, path: string }] }
Errors:
  brane: [{ code: "not_initialized", message }]
```

### `/lens/delete`

Delete a non-default, non-active lens.

```
Input:  { name: string }
Output: { name: string, deleted: true }
Errors:
  name: [{ code: "required" | "not_found" | "is_default" | "is_active", message }]
```

### `/lens/migrate`

Move flat layout to `.brane/lens/default/`. Idempotent.

```
Input:  {}
Output: { migrated: boolean, from: string, to: string }
Errors:
  brane:  [{ code: "not_initialized" | "already_migrated" | "no_flat_layout", message }]
```

## Modified Endpoints

### `/lens/show` (existing — extended)

Now accepts optional `name` param to inspect a specific lens (not just active).

```
Input:  { name?: string }   // defaults to active lens
Output: { name, version, description, concepts, relations, consolidation }  // unchanged shape
```

### `/body/init` (existing — extended)

Now accepts optional `path` param for lens-specific initialization.

```
Input:  { path?: string }   // defaults to .brane/ (flat layout)
Output: { path: string, created: boolean }  // unchanged shape
```

### `/mind/init` (existing — extended)

Now accepts optional `path` param for lens-specific initialization.

```
Input:  { path?: string, force?: boolean }   // path = lens directory
Output: { path: string, created: boolean, schema_version: string }  // unchanged shape
```

## Internal API (not sys.call — lib functions)

### `src/lib/state.ts`

```typescript
// Resolve paths for the active lens
resolve_lens_paths(): { brane_path: string, body_db_path: string, mind_db_path: string, lens_name: string }

// Get active lens name from state.db (or "default" if flat layout)
get_active_lens(): string

// Set active lens in state.db
set_active_lens(name: string): void

// Open state.db (create if needed)
open_state(): Database

// Check if state.db exists
has_state(): boolean

// Validate lens name
is_valid_lens_name(name: string): boolean

// List lens directories
list_lenses(): string[]
```
