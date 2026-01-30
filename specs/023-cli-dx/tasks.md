# Tasks: 023-cli-dx

**Input**: spec.md, plan.md, research.md
**Prerequisites**: 022-whitebox-scripts complete

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)

---

## Phase 1: Foundation

**Purpose**: Set up CLI infrastructure and verify citty works with Bun compile

- [x] T001 Install citty dependency (`bun add citty`)
- [x] T002 Create src/cli/ directory structure
- [x] T003 Implement routing logic in cli.ts (API mode vs CLI mode)
- [x] T004 Verify citty works with `bun build --compile`
- [x] T005 Create src/cli/output.ts with format_table, format_object, format_error
- [x] T006 Create src/cli/aliases.ts with expand_aliases function

**Checkpoint**: `brane concept --help` shows help, `brane /ping` still works ✅

---

## Phase 2: Convenience Commands

**Purpose**: Implement top-level shortcuts that users will use most

- [x] T007 [P] Implement `brane init` (body init + mind init)
- [x] T008 [P] Implement `brane scan <path>` (body scan)
- [x] T009 [P] Implement `brane search <query>` (mind search)
- [x] T010 [P] Implement `brane verify` (mind verify)
- [x] T011 Implement `brane repl` command (existing, just routed)

**Checkpoint**: `brane init && brane scan src/ && brane search "auth"` works ✅

---

## Phase 3: Core Resource Commands

**Purpose**: Implement concept and edge commands (most used)

- [x] T012 Implement `brane concept create --name --type`
- [x] T013 Implement `brane concept list [--type] [--limit]`
- [x] T014 Implement `brane concept get <id>`
- [x] T015 Implement `brane concept update <id> [--name] [--type]`
- [x] T016 Implement `brane concept delete <id>`
- [x] T017 Implement `brane edge create --from --to --rel`
- [x] T018 Implement `brane edge list [--from] [--to] [--rel]`
- [x] T019 Implement `brane edge get <id>`
- [x] T020 Implement `brane edge update <id> [--rel] [--weight]`
- [x] T021 Implement `brane edge delete <id>`

**Checkpoint**: Full concept and edge CRUD works via CLI ✅

---

## Phase 4: Supporting Commands

**Purpose**: Complete remaining resource commands

- [x] T022 [P] Implement `brane rule` subcommands (create, list, get, query, delete)
- [x] T023 [P] Implement `brane annotation` subcommands (create, list, get, delete)
- [x] T024 [P] Implement `brane provenance` subcommands (create, list, delete)
- [x] T025 [P] Implement `brane body` subcommands (init, scan, file)
- [x] T026 [P] Implement `brane fts` subcommands (index, search)
- [x] T027 [P] Implement `brane context query`
- [x] T028 [P] Implement `brane extract <path>`
- [x] T029 [P] Implement `brane pr-verify`

**Checkpoint**: All handlers have CLI equivalents ✅

---

## Phase 5: Polish

**Purpose**: Aliases, help improvements, whitebox script updates

- [x] T030 Wire up aliases (c, e, r, a, p, b, f)
- [x] T031 Add global flags (--json per command)
- [ ] T032 Improve help text with examples (deferred)
- [x] T033 Keep examples/00-quickstart.sh as API mode reference
- [x] T034 [P] Create examples/10-cli-quickstart.sh (CLI mode demo)
- [x] T035 [P] Create examples/11-cli-aliases.sh (alias demo)
- [x] T036 Create examples/12-cli-vs-api.sh (comparison demo)
- [x] T037 Verify all original whitebox scripts still pass (API mode)
- [x] T038 Build compiled binary and test all commands

**Checkpoint**: Full CLI complete, all tests pass ✅

---

## Phase 6: Documentation (Optional)

**Purpose**: Shell completions and docs

- [ ] T039 Implement `brane completion bash`
- [ ] T040 Implement `brane completion zsh`
- [ ] T041 Implement `brane completion fish`
- [ ] T042 Update CLAUDE.md with CLI examples

---

## Summary

**Completed**: 36/42 tasks (Phase 1-5 complete)
**Deferred**: 6 tasks (help examples, shell completions)

All core functionality implemented:
- CLI mode with noun-verb commands
- API mode preserved (backwards compatible)
- Short aliases (c, e, r, a, p, b, f)
- Unix-style output (tables) + --json flag
- 226 tc tests pass
- 13 whitebox scripts pass
