//
// aliases.ts - Short command aliases
//

export const aliases: Record<string, string> = {
  c: "concept",
  e: "edge",
  r: "rule",
  a: "annotation",
  p: "provenance",
  b: "body",
  f: "fts",
}

//
// Expand aliases in argument list
// Only expands first 1-2 args (command/subcommand positions)
//
export function expand_aliases(args: string[]): string[] {
  return args.map((arg, i) => {
    // Only expand if:
    // - Position 0 or 1 (command/subcommand)
    // - Not a flag (doesn't start with -)
    // - Is a known alias
    if (i < 2 && !arg.startsWith("-") && aliases[arg]) {
      return aliases[arg]
    }
    return arg
  })
}
