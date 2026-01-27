# /ping Handler Tests

The `/ping` handler echoes `params` back as `result`. It's the simplest handler, used to validate the basic harness.

## Test Cases

| Test | Input | Expected Result |
|------|-------|-----------------|
| `success-empty` | `{}` | `{}` |
| `success-object` | `{echo: "hello", count: 42}` | same |
| `success-nested` | `{user: {name, prefs: {theme}}}` | same |
| `success-array` | `{items: [1,2,3], tags: ["a","b"]}` | same |
| `success-null` | `null` | `null` |
| `success-boolean` | `{active: true, deleted: false}` | same |
| `success-unicode` | emoji, japanese, rtl, escapes | same |
| `success-empty-key` | `{"": "empty key"}` | same |
| `error-invalid-json` | `{not valid json` | error response |

## Result Envelope

All responses follow the standard envelope:

```json
{
  "status": "success" | "error",
  "result": <echoed params> | null,
  "errors": null | { "params": [...] },
  "meta": {
    "path": "/ping",
    "timestamp": "<iso8601>",
    "duration_ms": <number>
  }
}
```

## REPL Prompt

🤖—🧠 >

## Reviewed By

- **Claude** - Designed initial test cases
- **Gemini** - Antagonist review (suggested unicode, boolean, empty-key, invalid-json)
