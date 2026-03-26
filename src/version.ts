//
// version.ts - brane version
//
// At build time, BRANE_VERSION env is baked in via --define.
// At dev time, falls back to package.json version + "-dev".
//

declare const BRANE_VERSION: string | undefined

export function get_version(): string {
  // Build-time injected version (from git tag)
  if (typeof BRANE_VERSION !== "undefined" && BRANE_VERSION) {
    return BRANE_VERSION
  }

  // Dev fallback
  return "0.1.0-dev"
}
