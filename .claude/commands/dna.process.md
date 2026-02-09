---
description: Process files from DNA inbox into categorized locations based on content analysis
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

Supported arguments:
- `--dry-run`: Show what would happen without moving files
- `--verbose`: Show detailed analysis for each file
- `--no-convert`: Skip file conversion, keep original formats
- `--convert-only`: Only convert files already in DNA (skip inbox processing)

## Outline

Goal: Process all files in `./dna/_/inbox/` by analyzing their content, converting to plaintext formats, and moving them to appropriate category directories.

### Execution Steps

1. **Verify prerequisites**:
   - Check if `./dna/_/inbox/` exists
   - Check if `./dna/_/archive/` exists (create if missing)
   - If inbox not found: ERROR "DNA directory not initialized. Run /dna.init first."

2. **Scan inbox**:
   - Recursively find all files in `./dna/_/inbox/**/*`
   - If no files found: Report "No files to process. Inbox is empty."

3. **Process each file**:

   For each file in inbox:

   a. **Convert to plaintext** (unless `--no-convert`):

      | Original Format | Convert To | Method |
      |-----------------|------------|--------|
      | `.docx` | `.md` | Extract text, preserve headings/lists with pandoc or manual extraction |
      | `.doc` | `.md` | Extract text with pandoc or antiword |
      | `.pptx` | `.md` | Extract slide text, one section per slide |
      | `.ppt` | `.md` | Extract slide text |
      | `.pdf` (text-based) | `.md` | Extract text with pdftotext, preserve structure |
      | `.xlsx` | `.csv` | Convert to CSV (preserve tabular data) |
      | `.xls` | `.csv` | Convert to CSV |
      | `.txt` | `.md` | Rename to .md |
      | `.md` | `.md` | Keep as-is |
      | `.jpg/.png/.gif` | Keep original | Move to `assets/` category |
      | Binary/unknown | Keep original | Move to `_/uncategorized/` |

      **Archive original**: Before converting, copy the original file to `./dna/_/archive/[category]/[filename]` preserving the category structure.

   b. **Read and analyze content**:
      - Read converted/original file contents
      - Analyze text to determine primary theme/category

   c. **Determine category** using content analysis:

      | Content Theme | Category Directory |
      |---------------|-------------------|
      | Product roadmaps, features, requirements | `product/` |
      | Team structure, people, org charts | `team/` |
      | Technical docs, architecture, APIs | `technical/` |
      | Processes, workflows, procedures | `process/` |
      | Financial, business plans, metrics | `business/` |
      | Legal, compliance, contracts | `legal/` |
      | Customer info, feedback, personas | `customers/` |
      | Marketing, brand, messaging | `marketing/` |
      | Engineering standards, coding guides | `engineering/` |
      | Sales, pricing, proposals | `sales/` |
      | Research, analysis, studies | `research/` |
      | Investor decks, pitch materials, fundraising | `investor/` |
      | Competitive analysis, market comparisons | `competitive/` |
      | Images, photos, graphics | `assets/` |
      | Cannot determine / binary / empty | `_/uncategorized/` |

   d. **Create category directory** if it doesn't exist (use kebab-case)

   e. **Handle naming conflicts**:
      - If target file exists: append numeric suffix
      - `file.md` → `file-2.md` → `file-3.md` → ...

   f. **Move converted file** to category directory
      - If `--dry-run`: Report what would happen, don't move

4. **Update README index**:
   - Read `./dna/README.md`
   - Find `<!-- AUTO-GENERATED START -->` and `<!-- AUTO-GENERATED END -->` markers
   - Replace content between markers with current directory structure:

   ```markdown
   ## Directory Structure

   Last updated: YYYY-MM-DD HH:MM

   ### Categories

   - **product/** - Product roadmaps, features, and requirements
     - `roadmap.md` - Current product roadmap
     - `features/` - Feature specifications

   - **technical/** - Technical documentation and architecture
     - `api-docs.md` - API documentation

   [... list all categories and their contents ...]

   ### Quick Navigation

   | Looking for... | Go to... |
   |----------------|----------|
   | Product plans | `./dna/product/` |
   | API docs | `./dna/technical/` |
   ```

   - Preserve content before START marker and after END marker

5. **Report results**:
   ```text
   Processed 5 files from inbox:
   - product-roadmap.docx → ./dna/product/roadmap.md (converted, archived)
   - team-structure.pptx → ./dna/team/structure.md (converted, archived)
   - api-docs.pdf → ./dna/technical/api-docs.md (converted, archived)
   - data.xlsx → ./dna/business/data.csv (converted, archived)
   - photo.jpg → ./dna/assets/photo.jpg (kept original)

   Updated: ./dna/README.md
   Categories: product (new), team (new), technical (new), business (new), assets (new)
   Converted: 4 files
   Archived: 4 originals in ./dna/_/archive/
   ```

### File Conversion Details

**For .docx/.doc files**:
```bash
# Using pandoc (preferred)
pandoc input.docx -o output.md --wrap=none

# Or extract manually: read document, preserve headings as ##, lists as -, tables as markdown tables
```

**For .pptx/.ppt files**:
```bash
# Extract text from each slide, format as:
# # Slide 1: [Title]
# [Content]
#
# # Slide 2: [Title]
# [Content]
```

**For .pdf files**:
```bash
# Using pdftotext
pdftotext -layout input.pdf output.txt
# Then convert to markdown structure

# If PDF is image-based (scanned), keep original and note in uncategorized
```

**For .xlsx/.xls files**:
```bash
# Convert each sheet to CSV
# Name as: filename_sheet1.csv, filename_sheet2.csv
# Or use first sheet only as filename.csv
```

### Categorization Guidelines

When analyzing content, look for these signals:

- **product/**: "roadmap", "feature", "release", "milestone", "product requirements", "PRD"
- **team/**: "org chart", "team", "roles", "responsibilities", "hiring", "onboarding"
- **technical/**: "API", "architecture", "system design", "database", "infrastructure"
- **process/**: "workflow", "procedure", "how to", "steps", "checklist", "SOP"
- **business/**: "revenue", "budget", "forecast", "P&L", "metrics", "KPI"
- **legal/**: "contract", "terms", "agreement", "compliance", "policy", "NDA"
- **customers/**: "persona", "feedback", "interview", "support", "user research"
- **marketing/**: "brand", "campaign", "messaging", "content", "social media"
- **investor/**: "investor", "pitch", "deck", "fundraising", "executive summary", "venture"
- **research/**: "study", "research", "clinical", "scientific", "paper", "analysis"
- **competitive/**: "competitor", "competition", "comparison", "market share"

If content spans multiple categories, choose the primary one based on the document's main purpose.

### Error Handling

| Condition | Action |
|-----------|--------|
| Inbox doesn't exist | ERROR: "DNA directory not initialized. Run /dna.init first." |
| Conversion fails | WARN: Keep original format, move to category anyway |
| File read error | WARN: Skip file, report error, continue with others |
| Permission denied | WARN: Report specific file, continue with others |
| Binary file (non-image) | Move to `_/uncategorized/` with note |
| Empty file | Move to `_/uncategorized/` with note |
| Image file | Move to `assets/` without conversion |
