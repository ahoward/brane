//
// progress.ts - progress emitter factory
//
// Returns an Emit function that renders progress events to stderr.
// TTY-aware: live-updating line on TTY, simple lines when piped.
//

import type { Emit } from "./types.ts"

export interface ProgressData {
  phase:    string
  current:  number
  total:    number
  message:  string
}

const is_tty = !!process.stderr.isTTY

function format_elapsed(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

export function create_progress_emitter(opts?: { enabled?: boolean }): Emit {
  const enabled = opts?.enabled ?? true
  if (!enabled) return () => {}

  const start = performance.now()

  return (event: string, data?: unknown) => {
    if (event !== "progress") return

    const d = data as ProgressData
    if (!d || typeof d.current !== "number") return

    const elapsed = format_elapsed(performance.now() - start)
    const line = `[${d.current}/${d.total}] ${d.phase}: ${d.message} (${elapsed})`

    if (is_tty) {
      process.stderr.write(`\r\x1b[K${line}`)
    } else {
      process.stderr.write(`${line}\n`)
    }
  }
}

export function finish_progress(summary: string): void {
  if (is_tty) {
    process.stderr.write(`\r\x1b[K${summary}\n`)
  } else {
    process.stderr.write(`${summary}\n`)
  }
}
