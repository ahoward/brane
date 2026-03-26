//
// lock.ts - advisory file lock for per-lens process isolation
//
// Uses PID-based lockfile with stale lock detection.
// The lock file contains the PID of the owning process.
// On acquisition: if lock file exists and PID is alive → fail.
// On acquisition: if lock file exists and PID is dead → take over (stale lock).
// On release: remove lock file if owned by this process.
//

import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from "node:fs"
import { dirname } from "node:path"

export interface LockResult {
  acquired: boolean
  lock_path: string
  error?: string
}

//
// Check if a process with the given PID is alive.
//
function is_process_alive(pid: number): boolean {
  try {
    process.kill(pid, 0)  // Signal 0 = existence check, doesn't send signal
    return true
  } catch {
    return false
  }
}

//
// Acquire an advisory lock on the given path.
// Returns { acquired: true } on success, { acquired: false, error } on failure.
//
export function acquire_lock(lock_path: string): LockResult {
  const my_pid = process.pid

  // Ensure parent directory exists
  const dir = dirname(lock_path)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  // Check for existing lock
  if (existsSync(lock_path)) {
    try {
      const content = readFileSync(lock_path, "utf8").trim()
      const old_pid = parseInt(content, 10)

      if (!isNaN(old_pid) && is_process_alive(old_pid)) {
        return {
          acquired: false,
          lock_path,
          error: `Another brane process (PID ${old_pid}) is using this lens. Lock: ${lock_path}`,
        }
      }

      // Stale lock — previous process died. Take over.
    } catch {
      // Corrupted lock file — take over
    }
  }

  // Write our PID
  try {
    writeFileSync(lock_path, String(my_pid))
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      acquired: false,
      lock_path,
      error: `Failed to write lock file: ${msg}`,
    }
  }

  return { acquired: true, lock_path }
}

//
// Release an advisory lock. Only removes the file if it contains our PID.
//
export function release_lock(lock_path: string): void {
  try {
    if (!existsSync(lock_path)) return

    const content = readFileSync(lock_path, "utf8").trim()
    const file_pid = parseInt(content, 10)

    if (file_pid === process.pid) {
      unlinkSync(lock_path)
    }
  } catch {
    // Best-effort cleanup
  }
}

//
// Register process exit handler to auto-release a lock.
//
export function auto_release_on_exit(lock_path: string): void {
  const cleanup = () => release_lock(lock_path)

  process.on("exit", cleanup)
  process.on("SIGINT", () => { cleanup(); process.exit(130) })
  process.on("SIGTERM", () => { cleanup(); process.exit(143) })
}
