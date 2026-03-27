//
// web-search.ts - web search for loop's research cycles
//
// Shells out to curl for DuckDuckGo HTML search, extracts URLs.
// Mock mode returns deterministic results for testing.
//

import { spawn } from "node:child_process"

export interface SearchResult {
  query:   string
  urls:    string[]
  error?:  string
}

const MAX_URLS_PER_QUERY = 3

//
// Mock mode check
//
function is_mock_search(): boolean {
  return process.env.BRANE_LLM_MOCK === "1" || process.env.BRANE_SEARCH_MOCK === "1"
}

//
// Real search: DuckDuckGo HTML lite
//
async function ddg_search(query: string): Promise<string[]> {
  const encoded = encodeURIComponent(query)
  const url = `https://html.duckduckgo.com/html/?q=${encoded}`

  const result = await new Promise<{ stdout: string; code: number }>((resolve, reject) => {
    const proc = spawn("curl", [
      "-sL",
      "--max-time", "10",
      "--proto", "=http,https",
      "-A", "Mozilla/5.0 (compatible; brane/1.0)",
      url,
    ], { stdio: ["pipe", "pipe", "pipe"] })

    let stdout = ""
    proc.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString() })
    proc.on("error", (err: Error) => reject(err))
    proc.on("close", (code: number | null) => resolve({ stdout, code: code ?? 1 }))
  })

  if (result.code !== 0 || !result.stdout) {
    return []
  }

  // Extract URLs from DuckDuckGo HTML results
  // DDG lite wraps result links in <a rel="nofollow" class="result__a" href="...">
  const urls: string[] = []
  const regex = /href="(https?:\/\/[^"]+)"/g
  let match: RegExpExecArray | null

  while ((match = regex.exec(result.stdout)) !== null) {
    const href = match[1]
    // Skip DDG internal links and common noise
    if (href.includes("duckduckgo.com")) continue
    if (href.includes("duck.co")) continue
    if (href.includes("ad_domain")) continue
    // DDG lite wraps URLs in redirect: //duckduckgo.com/l/?uddg=ENCODED_URL
    // Direct links are what we want
    if (!urls.includes(href)) {
      urls.push(href)
    }
    if (urls.length >= MAX_URLS_PER_QUERY) break
  }

  // Also try extracting from uddg= parameter (DDG redirect URLs)
  if (urls.length < MAX_URLS_PER_QUERY) {
    const uddg_regex = /uddg=([^&"]+)/g
    while ((match = uddg_regex.exec(result.stdout)) !== null && urls.length < MAX_URLS_PER_QUERY) {
      try {
        const decoded = decodeURIComponent(match[1])
        if (decoded.startsWith("http") && !decoded.includes("duckduckgo.com") && !urls.includes(decoded)) {
          urls.push(decoded)
        }
      } catch {
        // skip malformed URLs
      }
    }
  }

  return urls
}

//
// Mock search
//
function mock_search(query: string): string[] {
  // Return deterministic mock URLs based on query hash
  const hash = query.split("").reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)
  const idx = Math.abs(hash) % 100
  return [
    `https://example.com/article-${idx}`,
    `https://example.com/guide-${idx + 1}`,
  ]
}

//
// Public API
//
export async function web_search(query: string): Promise<SearchResult> {
  if (is_mock_search()) {
    return { query, urls: mock_search(query) }
  }

  try {
    const urls = await ddg_search(query)
    return { query, urls }
  } catch (e: any) {
    return { query, urls: [], error: e.message ?? "search failed" }
  }
}
