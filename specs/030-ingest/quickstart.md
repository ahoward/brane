# Quickstart: Ingest

## Basic Usage

```bash
# Initialize workspace
brane init .

# Ingest a single file
brane ingest src/auth.ts

# Ingest a directory
brane ingest src/

# Ingest everything (defaults to .)
brane ingest

# Preview what would happen
brane ingest src/ --dry-run

# JSON output for scripting
brane ingest src/auth.ts --json
```

## Typical Onboarding Flow

```bash
brane init .
brane ingest .
brane concept list
brane graph summary
```

## Output Format

```
ingesting: src/auth.ts (added)
  concepts: 4 extracted (4 created, 0 reused)
  edges: 3 extracted (3 created)
  provenance: 4 links
ingesting: src/login.ts (unchanged, skipped)

summary: 2 files scanned, 1 extracted, 1 skipped, 0 errors
```

## Dry Run Output

```
ingesting: src/auth.ts (added, dry run)
  concepts:
    AuthService (Entity)
    TokenStore (Entity)
  edges:
    AuthService -> TokenStore (DEPENDS_ON)
  (no changes applied)

summary: 1 file would be extracted (dry run)
```
