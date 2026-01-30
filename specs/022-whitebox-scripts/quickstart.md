# Quickstart: Whitebox Scripts

**Feature**: 022-whitebox-scripts
**Date**: 2026-01-30

## Prerequisites

1. Build the Brane binary:
   ```bash
   bun build src/cli.ts --compile --outfile brane
   ```

2. Verify it works:
   ```bash
   ./brane /ping
   # Should return: {"status":"success","result":{"ping":"pong"},...}
   ```

## Running Examples

### Quick Start (Full Workflow)

```bash
# Run the complete workflow demo
./examples/00-quickstart.sh
```

This demonstrates: init → scan → extract → search → verify

### Individual Commands

```bash
# Run any individual example
./examples/01-body-init.sh
./examples/06-mind-search.sh
# etc.
```

### Run All Tests

```bash
# Execute all examples as a test suite
./examples/run-all.sh
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BRANE_BIN` | `./brane` | Path to compiled Brane binary |
| `BRANE_EMBED_MOCK` | `1` | Use mock embeddings (faster, deterministic) |

## Example: Custom Binary Location

```bash
# Build to a different location
bun build src/cli.ts --compile --outfile /usr/local/bin/brane

# Run examples with custom path
BRANE_BIN=/usr/local/bin/brane ./examples/00-quickstart.sh
```

## Script Structure

Each script follows this pattern:

```bash
#!/usr/bin/env bash
# Brief description of what this script demonstrates

set -e  # Exit on error

# Source common utilities
source "$(dirname "$0")/lib/common.sh"

# Create temp workspace
setup_workspace

# === Step 1: Description ===
echo "=== Step 1: Description ==="
$BRANE /some/command <<< '{"param": "value"}'
echo

# === Step 2: Description ===
# ...

echo "✅ Success!"
```

## Troubleshooting

### "Brane binary not found"

Build the binary first:
```bash
bun build src/cli.ts --compile --outfile brane
```

Or set the path explicitly:
```bash
export BRANE_BIN=/path/to/brane
```

### "Permission denied"

Make scripts executable:
```bash
chmod +x examples/*.sh
```

### Scripts fail with embedding errors

Use mock embeddings for testing:
```bash
export BRANE_EMBED_MOCK=1
./examples/06-mind-search.sh
```
