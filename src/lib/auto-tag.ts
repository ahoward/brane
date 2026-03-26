//
// auto-tag.ts - heuristic tag classification for episodic memories
//
// Detects standard memory types from observation text using regex patterns.
// Auto-tags are additive: always merged with agent-provided tags (enrichment, not fallback).
// Patterns are intentionally conservative to minimize false positives.
//

const TAG_PATTERNS: [string, RegExp][] = [
  ["decision",   /\b(decided|decision|chose|chosen|go with|going with|plan is|agreed (?:to|on)|commit(?:ted)? to|opted|selecting|selected|resolved to|will proceed with)\b/i],
  ["preference", /\b(prefer|always use|never use|don't like|I like|avoid|should always|should never|rather than)\b/i],
  ["fact",       /\b(runs on|is located|version \d|port \d|hosted|configured|set to|defaults? to)\b/i],
  ["event",      /\b(deployed|launched|released|migrated|upgraded|downgraded|rolled back|shipped|merged|pushed)\b/i],
  ["lesson",     /\b(learned|discovered|realized|turns out|figured out|found out|now I know|key takeaway|important to note)\b/i],
  ["caveat",     /\b(warning|caveat|limitation|bug|race condition|fragile|workaround|gotcha|watch out|be careful|known issue|deprecated|unsupported)\b/i],
]

//
// Detect tags from text. Pass observation + outcome for best coverage.
//
export function auto_tag(text: string): string[] {
  const tags: string[] = []
  for (const [tag, pattern] of TAG_PATTERNS) {
    if (pattern.test(text)) {
      tags.push(tag)
    }
  }
  return tags
}

//
// Standard tag vocabulary — for prompt generation and documentation.
//
export const STANDARD_TAGS: { tag: string; description: string; examples: string }[] = [
  { tag: "decision",   description: "A choice that was made",             examples: '"We decided to use PostgreSQL", "Going with REST over GraphQL"' },
  { tag: "preference", description: "User or agent preference",           examples: '"I prefer terse responses", "Always use TypeScript"' },
  { tag: "fact",       description: "A concrete piece of information",    examples: '"Server runs on port 8443", "Uses PostgreSQL 15"' },
  { tag: "event",      description: "Something that happened",            examples: '"Deployed v2.3.0 to production", "Merged the auth PR"' },
  { tag: "lesson",     description: "Something learned from experience",  examples: '"Parallel tests cause flaky failures", "Need to warm cache first"' },
  { tag: "caveat",     description: "A warning or limitation discovered", examples: '"Auth middleware has a race condition", "Don\'t mock the database"' },
]
