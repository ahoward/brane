# Tasks: Binary Examples

**Branch**: `028-binary-examples` | **Date**: 2026-02-08 | **Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

## Task List

### Phase 1: Build Configuration

- [ ] **Task 1.1**: Update package.json build script
  - Change: `"build": "bun build src/cli.ts --compile --outfile brane"`
  - To: `"build": "mkdir -p bin && bun build src/cli.ts --compile --outfile bin/brane"`
  - Verify: `bun run build` creates `./bin/brane`

- [ ] **Task 1.2**: Update .envrc to add ./bin to PATH
  - Add: `export PATH="$PWD/bin:$PATH"` before other PATH modifications
  - Verify: After `direnv allow`, `which brane` shows `./bin/brane`

- [ ] **Task 1.3**: Update .gitignore for binary
  - Add `/bin/` to ignore compiled binary
  - Remove any existing `brane` entry that ignores root binary

- [ ] **Task 1.4**: Clean up old binary location
  - Delete `./brane` if it exists in project root
  - Ensure only `./bin/brane` exists after build

### Phase 2: Documentation Audit

- [ ] **Task 2.1**: Update README.md INSTALL section
  - Change: `./brane --help`
  - To: `brane --help`
  - Add note about PATH via .envrc

- [ ] **Task 2.2**: Audit README.md USAGE section
  - Verify all examples use `brane` command
  - Verify no `bun run src/cli.ts` patterns

- [ ] **Task 2.3**: Audit all quickstart.md files
  - Files: 9 quickstart files in specs/*/
  - Verify all use `brane` command
  - Verify no `bun run` patterns

### Phase 3: Validation Tests

- [ ] **Task 3.1**: Create binary validation test structure
  - Create `tests/binary-examples/run` executable
  - Create test data directories

- [ ] **Task 3.2**: Implement binary existence test
  - Test: `./bin/brane` exists after build
  - Test: Binary is executable

- [ ] **Task 3.3**: Implement basic command tests
  - Test: `brane --help` exits 0
  - Test: `brane init` works in temp directory
  - Test: `brane --version` works

- [ ] **Task 3.4**: Implement README example validation
  - Parse README.md for code blocks with `brane` commands
  - Execute each in isolated temp directory
  - Report pass/fail for each

### Phase 4: Final Validation

- [ ] **Task 4.1**: Run full test suite
  - `bun test` passes
  - New binary tests pass

- [ ] **Task 4.2**: Manual verification
  - Fresh clone simulation:
    1. `bun install`
    2. `bun run build`
    3. `direnv allow`
    4. `which brane` → `./bin/brane`
    5. `brane --help` works
    6. `brane init` works

- [ ] **Task 4.3**: Commit and push
  - Commit all changes
  - Push to 028-binary-examples branch
  - Create PR for review

## Dependencies

```
Task 1.1 ──┐
Task 1.2 ──┼──> Task 1.4 ──> Task 2.* ──> Task 3.* ──> Task 4.*
Task 1.3 ──┘
```

## Notes

- All documentation already uses `brane` command (except one INSTALL line)
- No schema changes needed
- Focus is on build/PATH infrastructure and validation
