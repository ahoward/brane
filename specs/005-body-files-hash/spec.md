# Feature Specification: body-files-hash

**Feature Branch**: `005-body-files-hash`
**Created**: 2026-01-27
**Status**: Draft
**Input**: Compute SHA-256 hash for a file

## User Scenarios & Testing

### User Story 1 - Hash a Single File (Priority: P1)

A developer wants to compute the SHA-256 hash of a file without adding it
to brane. They run `brane hash file.txt` and get the hash.

**Why this priority**: Useful for verification, debugging, and scripting.
Sometimes you just want the hash without tracking.

**Independent Test**: Hash a file, verify output matches `sha256sum`.

**Acceptance Scenarios**:

1. **Given** a file exists, **When** `/body/files/hash` is called with the
   file path, **Then** the SHA-256 hash is returned.

2. **Given** a hash result, **When** compared with `sha256sum` output,
   **Then** hashes match exactly.

---

### User Story 2 - Hash Multiple Files (Priority: P2)

A developer wants to hash multiple files at once. They run
`brane hash a.txt b.txt c.txt` and get hashes for all.

**Why this priority**: Batch operations are common, saves repeated calls.

**Independent Test**: Hash multiple files, verify all hashes correct.

**Acceptance Scenarios**:

1. **Given** multiple files, **When** `/body/files/hash` is called with
   paths array, **Then** hashes for all files are returned.

---

### User Story 3 - Hash from Stdin (Priority: P3)

A developer wants to hash content piped from another command. They run
`cat file.txt | brane hash -` and get the hash.

**Why this priority**: Unix pipeline integration, useful for scripting.

**Independent Test**: Pipe content to hash, verify correct hash.

**Acceptance Scenarios**:

1. **Given** content piped to stdin, **When** `/body/files/hash` is called
   with path "-", **Then** stdin content is hashed.

---

### Edge Cases

- What happens when file doesn't exist?
  → Return error with code `not_found`

- What happens when file is not readable?
  → Return error with code `permission_denied`

- What happens with empty file?
  → Return hash of empty content (e3b0c44...)

- What happens with binary files?
  → Hash works the same, content is bytes

## Requirements

### Functional Requirements

- **FR-001**: System MUST compute SHA-256 hash of file contents
- **FR-002**: System MUST accept single path via `path` parameter
- **FR-003**: System MUST accept multiple paths via `paths` array parameter
- **FR-004**: System MUST accept "-" to read from stdin
- **FR-005**: System MUST return hash as lowercase hex string (64 chars)
- **FR-006**: System MUST return file size in bytes
- **FR-007**: System MUST NOT require initialized `.brane/` directory

### Key Entities

- **HashResult**: Hash computation result
  - `path`: Original path (or "-" for stdin)
  - `hash`: SHA-256 hex string
  - `size`: File size in bytes

## Success Criteria

### Measurable Outcomes

- **SC-001**: Hash of 1MB file completes in <50ms
- **SC-002**: Hash output matches `sha256sum` exactly
- **SC-003**: All tc tests pass (single, multiple, stdin, errors)

## sys.call Interface

```typescript
// Hash single file
sys.call("/body/files/hash", { path: "file.txt" })

// Hash multiple files
sys.call("/body/files/hash", { paths: ["a.txt", "b.txt"] })

// Hash from stdin
sys.call("/body/files/hash", { path: "-" })

// Success result (single)
{
  status: "success",
  result: {
    files: [
      { path: "file.txt", hash: "abc123...", size: 1234 }
    ]
  },
  errors: null,
  meta: { path: "/body/files/hash", timestamp, duration_ms }
}

// Success result (multiple)
{
  status: "success",
  result: {
    files: [
      { path: "a.txt", hash: "abc123...", size: 100 },
      { path: "b.txt", hash: "def456...", size: 200 }
    ]
  },
  errors: null,
  meta: { path: "/body/files/hash", timestamp, duration_ms }
}

// Error (file not found)
{
  status: "error",
  result: null,
  errors: {
    path: [{ code: "not_found", message: "file does not exist: missing.txt" }]
  },
  meta: { path: "/body/files/hash", timestamp, duration_ms }
}
```

## CLI Interface

```bash
# Hash single file
brane hash file.txt

# Hash multiple files
brane hash a.txt b.txt c.txt

# Hash from stdin
cat file.txt | brane hash -
echo "hello" | brane hash -

# Raw mode
brane call /body/files/hash '{"path": "file.txt"}'
```
