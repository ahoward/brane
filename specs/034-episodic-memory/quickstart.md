# Quickstart: Episodic Memory

## Creating Episodes

```bash
# Record an observation
brane /mind/episodes/create '{
  "agent_id": "claude-code",
  "observation": "User prefers snake_case naming conventions",
  "context": "reviewing PR #42",
  "tags": ["preference", "style"]
}'

# Record a decision with outcome
brane /mind/episodes/create '{
  "agent_id": "claude-code",
  "observation": "Chose to split large PR into 3 smaller ones",
  "context": "PR review workflow",
  "outcome": "User approved, said this was the right call",
  "tags": ["decision", "workflow"]
}'
```

## Listing and Filtering

```bash
# List all episodes
brane /mind/episodes/list '{}'

# Filter by agent
brane /mind/episodes/list '{"agent_id": "claude-code"}'

# Filter by tag
brane /mind/episodes/list '{"tag": "preference"}'

# Filter by time range
brane /mind/episodes/list '{"after": "2026-03-25T00:00:00Z", "before": "2026-03-27T00:00:00Z"}'
```

## Semantic Search

```bash
# Find relevant past experiences
brane /mind/episodes/search '{"query": "naming conventions"}'

# Search within a specific agent's episodes
brane /mind/episodes/search '{"query": "PR workflow", "agent_id": "claude-code", "limit": 5}'
```

## Getting and Deleting

```bash
# Get a specific episode
brane /mind/episodes/get '{"id": 1}'

# Delete an episode
brane /mind/episodes/delete '{"id": 1}'
```

## Schema Migration

Existing mind.db databases are automatically migrated from v1.7.0 to v1.8.0 on first access. A backup is created at `.brane/mind.db.backup.v1.7.0` before migration. No user action required.
