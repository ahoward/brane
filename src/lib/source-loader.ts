//
// source-loader.ts - load content from URL, file, directory, or stdin
//
// Supports:
//   - URLs (https://, http://) via curl with SSRF protection
//   - Local files (read as UTF-8)
//   - Directories (recursive, filtered)
//   - Stdin (piped input via "-")
//

import { existsSync, statSync, readFileSync, readdirSync } from "node:fs"
import { resolve, join, relative } from "node:path"
import { spawn } from "node:child_process"
import { createHash } from "node:crypto"

export interface LoadedSource {
  content:  string
  label:    string   // human-readable label (filename, URL, "stdin")
  hash:     string   // SHA256 of content for dedup
}

const MAX_FILE_BYTES = 1_000_000      // 1MB per file
const MAX_DIR_BYTES  = 5_000_000      // 5MB total for directory
const MAX_URL_BYTES  = 10_000_000     // 10MB for URL fetch
const CURL_TIMEOUT   = 30             // seconds

// SSRF protection: block local/private addresses
const BLOCKED_HOSTS = [
  "localhost", "127.0.0.1", "::1", "0.0.0.0",
  "169.254.169.254",  // cloud metadata
  "metadata.google.internal",
]

function is_url(source: string): boolean {
  return source.startsWith("https://") || source.startsWith("http://")
}

function sha256(content: string): string {
  return createHash("sha256").update(content, "utf-8").digest("hex")
}

//
// Detect binary files by checking first 8KB for null bytes
//
function is_binary(path: string): boolean {
  let fd: number | null = null
  try {
    const fs = require("node:fs")
    fd = fs.openSync(path, "r")
    const buf = Buffer.alloc(8192)
    const bytes_read = fs.readSync(fd, buf, 0, 8192, 0)
    for (let i = 0; i < bytes_read; i++) {
      if (buf[i] === 0) return true
    }
    return false
  } catch {
    return false
  } finally {
    if (fd !== null) {
      try { require("node:fs").closeSync(fd) } catch {}
    }
  }
}

//
// Skip patterns for directory traversal
//
const SKIP_DIRS = new Set([
  ".git", ".brane", "node_modules", ".next", "__pycache__",
  ".venv", "vendor", "dist", "build", ".cache", "coverage",
])

const SKIP_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg",
  ".woff", ".woff2", ".ttf", ".eot",
  ".zip", ".tar", ".gz", ".bz2",
  ".exe", ".dll", ".so", ".dylib",
  ".db", ".sqlite", ".sqlite3",
  ".safetensors", ".bin", ".onnx",
  ".lock",
])

//
// Load from URL via curl
//
async function load_url(url: string): Promise<LoadedSource | null> {
  // SSRF check
  try {
    const parsed = new URL(url)
    if (BLOCKED_HOSTS.includes(parsed.hostname)) {
      throw new Error(`blocked host: ${parsed.hostname}`)
    }
    // Block private IP ranges
    if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(parsed.hostname)) {
      throw new Error(`blocked private IP: ${parsed.hostname}`)
    }
  } catch (e: any) {
    if (e.message?.startsWith("blocked")) throw e
    throw new Error(`invalid URL: ${url}`)
  }

  return new Promise((resolve) => {
    const proc = spawn("curl", [
      "-sL",
      "--proto", "=http,https",
      "--max-time", String(CURL_TIMEOUT),
      "--max-filesize", String(MAX_URL_BYTES),
      "-H", "User-Agent: brane/1.0",
      url,
    ], { stdio: ["ignore", "pipe", "pipe"] })

    let stdout = ""
    let stderr = ""

    proc.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString()
      if (Buffer.byteLength(stdout, "utf-8") > MAX_URL_BYTES) {
        proc.kill()
      }
    })
    proc.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString() })

    proc.on("close", (code: number | null) => {
      if (code !== 0 || !stdout.trim()) {
        resolve(null)
        return
      }
      const content = stdout.trim()
      resolve({
        content,
        label: url,
        hash: sha256(content),
      })
    })

    proc.on("error", () => resolve(null))
  })
}

//
// Load a single file
//
function load_file(path: string): LoadedSource | null {
  const abs = resolve(path)
  if (!existsSync(abs)) return null

  const stat = statSync(abs)
  if (!stat.isFile()) return null
  if (stat.size > MAX_FILE_BYTES) return null
  if (is_binary(abs)) return null

  const ext = abs.substring(abs.lastIndexOf(".")).toLowerCase()
  if (SKIP_EXTENSIONS.has(ext)) return null

  try {
    const content = readFileSync(abs, "utf-8").trim()
    if (!content) return null
    return {
      content,
      label: relative(process.cwd(), abs) || abs,
      hash: sha256(content),
    }
  } catch {
    return null
  }
}

//
// Load a directory recursively
//
function load_directory(dir_path: string): LoadedSource[] {
  const abs = resolve(dir_path)
  const sources: LoadedSource[] = []
  let total_bytes = 0

  function walk(current: string, depth: number) {
    if (depth > 10) return
    if (total_bytes >= MAX_DIR_BYTES) return

    let entries: string[]
    try {
      entries = readdirSync(current)
    } catch {
      return
    }

    for (const entry of entries.sort()) {
      if (entry.startsWith(".")) continue
      if (SKIP_DIRS.has(entry)) continue

      const full = join(current, entry)
      let stat
      try {
        const { lstatSync: lstat } = require("node:fs")
        stat = lstat(full)
      } catch {
        continue
      }

      // Skip symlinks to prevent circular traversal
      if (stat.isSymbolicLink()) continue

      if (stat.isDirectory()) {
        walk(full, depth + 1)
      } else if (stat.isFile()) {
        const source = load_file(full)
        if (source) {
          total_bytes += Buffer.byteLength(source.content, "utf-8")
          if (total_bytes <= MAX_DIR_BYTES) {
            sources.push(source)
          }
        }
      }
    }
  }

  walk(abs, 0)
  return sources
}

//
// Load from stdin
//
async function load_stdin(): Promise<LoadedSource | null> {
  return new Promise((resolve) => {
    let data = ""
    const stdin = process.stdin
    stdin.setEncoding("utf-8")

    const timeout = setTimeout(() => {
      stdin.destroy()
      resolve(null)
    }, 5000)

    stdin.on("data", (chunk: string) => {
      data += chunk
      if (Buffer.byteLength(data, "utf-8") > MAX_FILE_BYTES) {
        stdin.destroy()
      }
    })
    stdin.on("end", () => {
      clearTimeout(timeout)
      const content = data.trim()
      if (!content) {
        resolve(null)
        return
      }
      resolve({
        content,
        label: "stdin",
        hash: sha256(content),
      })
    })
    stdin.on("error", () => {
      clearTimeout(timeout)
      resolve(null)
    })

    // If stdin is a TTY (no pipe), don't wait
    if (stdin.isTTY) {
      clearTimeout(timeout)
      resolve(null)
    }

    stdin.resume()
  })
}

//
// Public API: load source(s) from any supported input
//
export async function load_source(source: string): Promise<LoadedSource[]> {
  // stdin
  if (source === "-") {
    const result = await load_stdin()
    return result ? [result] : []
  }

  // URL
  if (is_url(source)) {
    const result = await load_url(source)
    return result ? [result] : []
  }

  // File or directory
  const abs = resolve(source)
  if (!existsSync(abs)) return []

  const stat = statSync(abs)
  if (stat.isDirectory()) {
    return load_directory(abs)
  }

  const result = load_file(abs)
  return result ? [result] : []
}
