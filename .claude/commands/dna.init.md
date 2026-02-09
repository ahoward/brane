---
description: Initialize the DNA directory structure for organizing company/product knowledge
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

Goal: Create or verify the DNA directory structure that serves as the "company brain" for organizing all company/product knowledge.

### Execution Steps

1. **Check current state**:
   - Check if `./dna/` directory exists
   - If path exists but is a file: ERROR "Path ./dna/ exists as a file. Cannot initialize."

2. **Create or verify structure**:

   **If ./dna/ does NOT exist:**
   - Create `./dna/` directory
   - Create `./dna/_/` internal directory
   - Create `./dna/_/inbox/` drop zone
   - Create `./dna/_/uncategorized/` overflow directory
   - Create `./dna/_/archive/` for original files before conversion
   - Create `./dna/README.md` with initial template (see README Template below)
   - Create `./dna/_/README.md` with "not for context" warning (see Internal README Template below)

   **If ./dna/ already exists:**
   - Verify `./dna/_/` exists, create if missing
   - Verify `./dna/_/inbox/` exists, create if missing
   - Verify `./dna/_/uncategorized/` exists, create if missing
   - Verify `./dna/_/archive/` exists, create if missing
   - Verify `./dna/README.md` exists, create with template if missing
   - Verify `./dna/_/README.md` exists, create if missing
   - Report any repairs made

3. **Report success**:
   ```text
   DNA directory initialized at ./dna/
   - Created: ./dna/README.md
   - Created: ./dna/_/README.md
   - Created: ./dna/_/inbox/
   - Created: ./dna/_/uncategorized/
   - Created: ./dna/_/archive/

   Ready to receive files in ./dna/_/inbox/
   Run /dna.process after adding files.
   ```

   Or if verifying existing:
   ```text
   DNA directory verified at ./dna/
   - Verified: ./dna/README.md
   - Verified: ./dna/_/README.md
   - Repaired: ./dna/_/inbox/ (was missing)

   Structure is ready.
   ```

### README Template

Create `./dna/README.md` with:

```markdown
# Company DNA

This directory contains organized company and product knowledge for humans and AI assistants.

## How to Use

1. **Add new content**: Drop files in `_/inbox/` then run `/dna.process`
2. **Find content**: Use `ls`, `find`, `grep` or read this index
3. **Reorganize**: Run `/dna.organize` to optimize structure

<!-- AUTO-GENERATED START - Do not edit below this line -->
## Directory Structure

*No content yet. Add files to `_/inbox/` and run `/dna.process`.*

<!-- AUTO-GENERATED END - Do not edit above this line -->

## Custom Notes

*Add any manual notes here - they will be preserved across updates.*
```

### Internal README Template

Create `./dna/_/README.md` with:

```markdown
# Internal Directory - NOT FOR CONTEXT

**This directory is for internal/meta state only.**

AI assistants and context-gathering tools should **NOT** include this directory in knowledge searches.

## Contents

- `inbox/` - Drop zone for new files awaiting processing
- `uncategorized/` - Files that couldn't be automatically categorized (need manual review)
- `archive/` - Original files preserved before conversion to plaintext

## Purpose

This underscore-prefixed directory stores operational state that is not part of the actual company knowledge base.
```

### Error Handling

| Condition | Action |
|-----------|--------|
| Permission denied | Report: "Permission denied. Check directory permissions." |
| Path is a file | Report: "Path ./dna/ exists as a file. Remove or rename it first." |
| Disk full | Report: "Could not create directories. Check available disk space." |
