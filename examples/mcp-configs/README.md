# MCP Configuration Examples

Drop these into your editor/agent config to connect brane as a memory server.

## Claude Code

Copy `claude-code.json` contents into `~/.claude/settings.json`:

```bash
# Or merge it manually:
cat examples/mcp-configs/claude-code.json
```

Claude Code will auto-discover brane's tools, resources, and prompts on next session start.

## Cursor

Settings → MCP Servers → paste contents of `cursor.json`.

## Custom Agent

Any MCP-compatible agent can connect. The server speaks JSON-RPC 2.0 over stdio:

```bash
# Start the MCP server directly
brane mcp

# Or point your agent framework at it
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"my-agent","version":"1.0"}}}' | brane mcp
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BRANE_LLM_RATE_LIMIT` | `30` | Max LLM calls per minute |
| `BRANE_LLM_SESSION_LIMIT` | `200` | Max LLM calls per session |
| `BRANE_MAX_FILES_PER_LEARN` | `50` | Max files per learn operation |
| `BRANE_MCP_MAX_RESPONSE` | `65536` | Max response payload bytes |
| `BRANE_EMBED_MOCK` | unset | Use deterministic test embeddings |
| `BRANE_LLM_MOCK` | unset | Use mock LLM extraction |
