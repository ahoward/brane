# Working Notes (Short-Term)

*Ephemeral scratchpad. Jointly edited. Cleared between major tasks.*

---

## Session: 2026-01-26

### Current Task: Basic Harness (/ping)

**Status:** ⛔ TEST BOUNDARY - Awaiting human approval

### Tests (After Gemini Review)

```
tests/ping/
├── run                          # exec bun run src/cli.ts /ping
├── skip                         # ← TEST BOUNDARY
└── data/
    ├── success-empty/           # {} → {}
    ├── success-object/          # {echo, count} → same
    ├── success-nested/          # {user: {prefs: ...}} → same
    ├── success-array/           # {items: [...]} → same
    ├── success-null/            # null → null
    ├── success-boolean/         # NEW: {active: true} → same
    ├── success-unicode/         # NEW: emoji, japanese, rtl → same
    ├── success-empty-key/       # NEW: {"": "val"} → same
    └── error-invalid-json/      # NEW: malformed → error
```

### Gemini Review Summary

**Added based on feedback:**
- `success-boolean` - type coverage
- `success-unicode` - character encoding edge case
- `success-empty-key` - edge case for empty string keys
- `error-invalid-json` - malformed JSON handling

**Not added (out of scope for /ping):**
- Large payload tests (performance, not unit)
- Concurrency tests
- Security/injection tests (ping just echoes)

### Design Decisions

1. **Invalid JSON → error response** (not crash)
   - CLI layer parses JSON
   - Returns `{status: "error", errors: {params: [{code: "invalid_json"}]}}`

2. **`null` input → `null` result** (not `{}`)
   - Preserves exact echo semantics

### Open Questions for Human

1. Is 9 test cases enough for /ping?
2. Should we test empty stdin separately from `null`?
3. REPL prompt format: `brane>` or `>`?

### Scratch

Gemini quota exhausted mid-review. Got useful feedback before cutoff.
