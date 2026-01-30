# Quickstart: Vector Search

## Setup

```bash
# Initialize brane
echo '{}' | bun run src/cli.ts /body/init
echo '{}' | bun run src/cli.ts /mind/init
```

## Create Concepts with Embeddings

```bash
# Concepts automatically get embeddings on creation
echo '{"name": "AuthService", "type": "Entity"}' | bun run src/cli.ts /mind/concepts/create
echo '{"name": "LoginHandler", "type": "Entity"}' | bun run src/cli.ts /mind/concepts/create
echo '{"name": "DatabasePool", "type": "Entity"}' | bun run src/cli.ts /mind/concepts/create
echo '{"name": "UserCredentials", "type": "Entity"}' | bun run src/cli.ts /mind/concepts/create
```

## Search by Meaning

```bash
# Find concepts related to "authentication"
echo '{"query": "user authentication"}' | bun run src/cli.ts /mind/search

# Expected output:
# {
#   "status": "success",
#   "result": {
#     "matches": [
#       { "id": 1, "name": "AuthService", "type": "Entity", "score": 0.89 },
#       { "id": 2, "name": "LoginHandler", "type": "Entity", "score": 0.82 },
#       { "id": 4, "name": "UserCredentials", "type": "Entity", "score": 0.71 }
#     ]
#   }
# }
```

## Limit Results

```bash
# Get only top 2 matches
echo '{"query": "data storage", "limit": 2}' | bun run src/cli.ts /mind/search
```

## Testing with Mock Embeddings

```bash
# For reproducible tests, use mock mode
export BRANE_EMBED_MOCK=1

# Mock embeddings are deterministic (same input = same output)
echo '{"name": "TestConcept", "type": "Entity"}' | bun run src/cli.ts /mind/concepts/create
echo '{"query": "test"}' | bun run src/cli.ts /mind/search
```

## Use Case: Graph Entry Points

Vector search finds "anchor" concepts. Then use graph traversal:

```bash
# 1. Find entry points
RESULTS=$(echo '{"query": "authentication"}' | bun run src/cli.ts /mind/search)

# 2. Get edges from anchor concepts
ANCHOR_ID=$(echo "$RESULTS" | jq -r '.result.matches[0].id')
echo "{\"source\": $ANCHOR_ID}" | bun run src/cli.ts /mind/edges/list

# 3. Expand to connected concepts
# (This is what /context/query does under the hood)
```

## Integration with /context/query

The `/context/query` endpoint uses vector search internally:

```bash
echo '{"query": "Why is auth failing?"}' | bun run src/cli.ts /context/query

# 1. Vector search finds: AuthService, LoginHandler
# 2. Graph traversal expands to related concepts
# 3. Provenance links pull code snippets from body.db
# 4. Returns structured context for AI agents
```
