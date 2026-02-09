// tc.config.ts - test runner configuration
//
// This file configures the tc test runner for this project.
// tc.ts reads this file at startup to determine project-specific settings.

export default {
  // Entry point for running handlers - receives handler path and stdin
  // tc.ts runs: bun run <entry> /<handler_path>
  entry: "brane",

  // Tests directory relative to project root
  tests_dir: "tests",
}
