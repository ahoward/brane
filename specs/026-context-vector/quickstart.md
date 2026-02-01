# Quickstart: Context Vector Search

## Setup

```bash
# Initialize brane (if not already done)
brane init

# Create some concepts
brane concept create --name "AuthService" --type Entity
brane concept create --name "LoginController" --type Entity
brane concept create --name "SessionManager" --type Entity
brane concept create --name "DatabaseConnection" --type Entity
```

## Basic Usage

### Hybrid Search (Default)

Find concepts semantically related to "authentication":

```bash
brane context "authentication"
```

Expected output includes `AuthService`, `LoginController`, `SessionManager` even though none contain "authentication" in their name.

### Exact Search

Find concepts with exact substring match:

```bash
brane context "auth" --mode exact
```

Returns only `AuthService` (contains "auth").

### Semantic Search

Find concepts by meaning only:

```bash
brane context "login flow" --mode semantic
```

Returns concepts related to login/auth regardless of name.

## Understanding Results

### Relevance Types

| Relevance | Meaning |
|-----------|---------|
| `exact` | Name contains query substring |
| `semantic` | Meaning similar to query |
| `both` | Matched both ways |
| `neighbor` | Connected via graph expansion |

### Similarity Scores

Semantic matches include a `score` (0.0-1.0):
- 1.0 = identical meaning
- 0.7+ = highly relevant
- 0.5+ = somewhat relevant
- <0.5 = loosely related

## CLI Options

```bash
brane context <query> [options]

Options:
  --mode <mode>    Search mode: hybrid (default), exact, semantic
  --depth <n>      Graph expansion depth: 0, 1, 2 (default: 1)
  --limit <n>      Max concepts to return (default: 10)
  --json           Output as JSON
```

## API Usage

```bash
# Hybrid search (default)
echo '{"query": "authentication"}' | bun run src/cli.ts /context/query

# Exact search
echo '{"query": "auth", "mode": "exact"}' | bun run src/cli.ts /context/query

# Semantic search with custom limit
echo '{"query": "database connections", "mode": "semantic", "limit": 20}' | bun run src/cli.ts /context/query
```

## Tips

1. **Short queries**: Use `--mode exact` for queries under 3 characters
2. **Exploration**: Use `--mode semantic` when you don't know exact names
3. **Precision**: Use `--mode exact` when you know what you're looking for
4. **Default**: `hybrid` mode gives you the best of both worlds
