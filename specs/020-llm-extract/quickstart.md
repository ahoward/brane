# Quickstart: LLM-Powered Extraction

## Prerequisites

1. **Claude CLI** or **Gemini CLI** installed and authenticated
   - Claude: https://docs.anthropic.com/claude-code/getting-started
   - Gemini: https://ai.google.dev/gemini-api/docs/get-started/cli
2. Brane initialized in your project (`brane init`)

## Setup

### Option 1: Auto-Detection (Recommended)

If you have `claude` or `gemini` CLI installed and authenticated, Brane will auto-detect it. No configuration needed!

```bash
# Verify CLI is available
which claude   # or: which gemini
```

### Option 2: Explicit Provider (Optional)

If you have both CLIs installed, you can set a preference in `.brane/config.json`:

```json
{
  "llm": {
    "provider": "claude"
  }
}
```

Valid providers: `"claude"`, `"gemini"`

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

# 4. Scan for concepts (auto-detects claude or gemini CLI)
$ brane calabi scan
✓ Using claude CLI
✓ Scanned 15 files
✓ Created 42 concepts
✓ Created 28 edges

# 5. View results
$ brane mind concepts list
ID  NAME           TYPE
1   User           Entity
2   AuthService    Entity
3   Order          Entity
...
```

## Troubleshooting

### "No LLM CLI found"

Install either the Claude CLI or Gemini CLI:

```bash
# Claude (via npm)
npm install -g @anthropic-ai/claude-code

# Then authenticate
claude
```

### "CLI not authenticated"

Run the CLI directly to complete authentication:

```bash
claude    # Follow prompts to authenticate
# or
gemini    # Follow prompts to authenticate
```

### Binary Files Skipped

Binary files (images, compiled code) are automatically skipped. This is expected behavior.

### Slow Extraction

Large files are truncated to ~8000 tokens. If extraction is still slow:
- The CLI handles rate limiting automatically
- Check your network connection
- Try scanning smaller directories
