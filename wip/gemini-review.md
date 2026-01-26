# Gemini Review: /ping Tests

**Date:** 2026-01-26
**Status:** Partial (quota exhausted mid-review)

## Gemini's Feedback

### Blind Spots Identified

1. **Negative Test Cases:**
   - No tests for malformed JSON
   - No tests for incorrect data types
   - No tests for how errors field would be structured

2. **Edge Cases for Valid Input:**
   - Large payloads (extremely large arrays, deeply nested objects)
   - Character encoding / special characters / Unicode

3. **Meta-data Validation:**
   - No tests to ensure timestamp/duration_ms are present
   - No tests for correct format or reasonable values

4. **Concurrency/Load:** (out of scope for /ping)

5. **Security:** (out of scope for /ping - it just echoes)

## Claude's Response to Feedback

### Will Add

| Test | Rationale |
|------|-----------|
| `success-boolean` | Type coverage |
| `success-unicode` | Emoji, special chars |
| `success-empty-string-key` | Edge case `{"": "val"}` |
| `error-invalid-json` | Malformed input handling |

### Won't Add (for /ping)

| Suggestion | Reason |
|------------|--------|
| Large payloads | Performance test, not unit test |
| Concurrency | Out of scope for echo handler |
| Security/injection | /ping just echoes, no processing |

### Design Decision

**Should /ping fail on invalid JSON?**

Yes. If stdin contains invalid JSON, the CLI layer should return:
```json
{
  "status": "error",
  "result": null,
  "errors": {
    "params": [{"code": "invalid_json", "message": "..."}]
  },
  "meta": {...}
}
```

This is a CLI concern, not a /ping concern. But we test it here since /ping is our first handler.

## Updated Test Plan

```
tests/ping/data/
├── success-empty/
├── success-object/
├── success-nested/
├── success-array/
├── success-null/
├── success-boolean/        # NEW
├── success-unicode/        # NEW
├── success-empty-key/      # NEW
└── error-invalid-json/     # NEW
```
