# Quickstart: LLM-Powered Extraction

## Prerequisites

1. Anthropic API key (get one at https://console.anthropic.com)
2. Brane initialized in your project (`brane init`)

## Setup

### Option 1: Environment Variable (Quick)

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

### Option 2: Config File (Persistent)

Create `.brane/config.json`:

```json
{
  "llm": {
    "provider": "anthropic",
    "api_key": "sk-ant-..."
  }
}
```

## Usage

### Scan Files for Concepts

```bash
# Scan all files
brane calabi scan

# Scan specific path
brane calabi scan --path src/

# Dry run (see what would be scanned)
brane calabi scan --dry-run
```

### View Extracted Concepts

```bash
# List all concepts
brane mind concepts list

# Query specific concept
brane mind concepts get --name "User"
```

### Verify Graph Integrity

```bash
# Run verification rules
brane mind verify
```

## Example Session

```bash
# 1. Initialize brane
$ brane init
✓ Created .brane/body.db

# 2. Initialize mind
$ brane mind init
✓ Created .brane/mind.db

# 3. Add files to track
$ brane body files add src/
✓ Added 15 files

# 4. Configure LLM
$ export ANTHROPIC_API_KEY="sk-ant-..."

# 5. Scan for concepts
$ brane calabi scan
✓ Scanned 15 files
✓ Created 42 concepts
✓ Created 28 edges

# 6. View results
$ brane mind concepts list
ID  NAME           TYPE
1   User           Entity
2   AuthService    Entity
3   Order          Entity
...
```

## Troubleshooting

### "LLM not configured"

Make sure you have either:
- `ANTHROPIC_API_KEY` environment variable set, OR
- `.brane/config.json` with `llm.api_key`

### "Rate limit exceeded"

The scanner automatically retries with backoff. If persistent:
- Reduce batch size (scan smaller directories)
- Wait a few minutes and retry

### "Invalid API key"

Verify your key at https://console.anthropic.com/account/keys

### Binary Files Skipped

Binary files (images, compiled code) are automatically skipped. This is expected behavior.
