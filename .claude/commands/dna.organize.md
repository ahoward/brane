---
description: Reorganize the DNA directory structure based on content analysis for optimal organization
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

Supported arguments:
- `--dry-run`: Show proposed changes without executing
- `--aggressive`: More willing to merge/split categories

## Outline

Goal: Analyze all content in `./dna/` and reorganize for optimal discoverability while maintaining the "not for context" status of `./dna/_/`.

### Execution Steps

1. **Verify prerequisites**:
   - Check if `./dna/` exists with content
   - If not exists: ERROR "DNA directory not initialized. Run /dna.init first."
   - If empty (no categories): Report "No content to organize."

2. **Analyze current structure**:
   - Scan all directories and files in `./dna/` (excluding `_/`)
   - Build inventory of categories, files, and nesting depth
   - Analyze content of each file for theme alignment

3. **Identify optimization opportunities**:

   a. **Merge similar categories** (overlap > 70%):
      - Example: `docs/` + `documentation/` → `technical/`
      - Example: `people/` + `team/` → `team/`

   b. **Split large categories** (> 20 files):
      - Create subcategories based on content themes
      - Example: `technical/` with 30 files → `technical/api/`, `technical/architecture/`

   c. **Flatten deep nesting** (> 3 levels):
      - Move deeply nested files closer to root
      - Preserve context in filename if needed

   d. **Relocate misplaced files**:
      - Files whose content doesn't match their category
      - Example: API doc in `product/` → move to `technical/`

   e. **Handle naming conflicts** during moves:
      - Use numeric suffix: `file-2.md`, `file-3.md`

4. **Execute reorganization** (unless `--dry-run`):
   - Move files to new locations
   - Handle conflicts with numeric suffixes
   - Track all changes for reporting

5. **Clean up empty directories**:
   - Remove directories that are now empty
   - NEVER remove `./dna/_/`, `./dna/_/inbox/`, `./dna/_/uncategorized/`

6. **Update README index**:
   - Regenerate auto-generated section in `./dna/README.md`
   - Same format as `/dna.process` README update
   - Preserve manual sections

7. **Report changes**:
   ```text
   Reorganized DNA directory:

   Merged:
   - ./dna/docs/ + ./dna/documentation/ → ./dna/technical/

   Split:
   - ./dna/technical/ (25 files) → ./dna/technical/api/ (10), ./dna/technical/architecture/ (8), ./dna/technical/ (7)

   Moved:
   - ./dna/product/api-spec.md → ./dna/technical/api/spec.md
   - ./dna/misc/budget.md → ./dna/business/budget.md

   Removed (empty):
   - ./dna/misc/
   - ./dna/docs/

   Updated: ./dna/README.md

   Structure: 8 top-level categories, max depth 2
   ```

### Reorganization Rules

1. **Protected paths** - NEVER modify:
   - `./dna/_/`
   - `./dna/_/inbox/`
   - `./dna/_/uncategorized/`
   - `./dna/README.md` (update content only, don't move/delete)

2. **Category naming**:
   - Always use kebab-case
   - Prefer standard names: `product`, `team`, `technical`, `process`, `business`, `legal`, `customers`, `marketing`

3. **Merge thresholds**:
   - Default: Merge if > 70% content overlap
   - Aggressive mode: Merge if > 50% overlap

4. **Split thresholds**:
   - Default: Split if > 20 files
   - Aggressive mode: Split if > 10 files

5. **Nesting limits**:
   - Maximum 3 levels recommended
   - Flatten deeper structures

### Error Handling

| Condition | Action |
|-----------|--------|
| DNA not initialized | ERROR: "DNA directory not initialized. Run /dna.init first." |
| No content | Report: "No content to organize." |
| Circular reference | WARN: Skip, report issue |
| Permission denied | WARN: Skip file, report, continue |
