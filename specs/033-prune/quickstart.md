# Quickstart: 033-prune

## Basic usage

```bash
# ingest some files
brane init
brane ingest src/

# delete a file
rm src/auth.ts

# see what would be pruned
brane prune --dry-run

# prune orphaned concepts
brane prune
```

## With lenses

```bash
brane lens use my-lens
brane prune --dry-run    # operates on active lens
brane prune
```

## API mode

```bash
# dry run
echo '{"dry_run": true}' | brane /mind/prune

# actual prune
echo '{}' | brane /mind/prune
```
