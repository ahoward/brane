# Test Review Request for Ali (Gemini)

## Context

We're building **Brane** - a CLI tool with a `sys.call("/path", params)` interface. Every call returns a consistent Result envelope:

```typescript
{
  status: "success" | "error",
  result: T | null,
  errors: ErrorMap | null,
  meta: { path, timestamp, duration_ms }
}
```

## Current Task: `/ping` Handler

The `/ping` handler is the simplest possible - it echoes `params` back as `result`. This tests the basic harness.

## Tests I've Designed

| Test Case | Input | Expected Result |
|-----------|-------|-----------------|
| `success-empty` | `{}` | `{}` |
| `success-object` | `{echo: "hello", count: 42}` | same |
| `success-nested` | `{user: {name, prefs: {theme}}}` | same |
| `success-array` | `{items: [1,2,3], tags: ["a","b"]}` | same |
| `success-null` | `null` | `null` |

All expect `status: "success"`, `errors: null`, `meta.path: "/ping"`.

## Questions for You (Antagonist Role)

Please challenge these tests. What am I missing?

1. **Edge cases I missed?**
   - Very large objects?
   - Deeply nested (100 levels)?
   - Empty string keys? `{"": "value"}`
   - Numeric keys that look like arrays?

2. **Invalid input scenarios?**
   - Malformed JSON on stdin
   - Binary/non-UTF8 input
   - Empty stdin (no input at all)

3. **Type edge cases?**
   - Boolean values
   - Numbers: integers, floats, negative, zero
   - Unicode strings: emoji, RTL, null bytes?

4. **Should /ping ever fail?**
   - Currently designed to always succeed
   - Is that correct, or should some inputs cause errors?

5. **Consistency questions:**
   - Is `null` input returning `null` result correct?
   - Or should empty input default to `{}`?

## Your Task

Play antagonist. Find the blind spots. Suggest additional test cases or modifications.

Return your feedback in this format:

```
## Additional Tests Suggested
- test-name: description

## Modifications to Existing Tests
- test-name: change X to Y because Z

## Questions/Concerns
- ...

## Approved As-Is
- (or list what looks good)
```
