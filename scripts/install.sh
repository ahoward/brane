#!/usr/bin/env bash
#
# Brane installer
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/ahoward/brane/main/scripts/install.sh | bash
#
# Options (via env vars):
#   BRANE_VERSION=0.1.0   Install a specific version (default: latest)
#   BRANE_INSTALL_DIR=/usr/local/bin  Install directory (default: ~/.local/bin)
#
set -euo pipefail

REPO="ahoward/brane"
INSTALL_DIR="${BRANE_INSTALL_DIR:-$HOME/.local/bin}"

# Detect platform
detect_platform() {
  local os arch

  case "$(uname -s)" in
    Linux*)  os="linux" ;;
    Darwin*) os="darwin" ;;
    *)
      echo "error: unsupported OS: $(uname -s)" >&2
      exit 1
      ;;
  esac

  case "$(uname -m)" in
    x86_64|amd64) arch="x64" ;;
    arm64|aarch64) arch="arm64" ;;
    *)
      echo "error: unsupported architecture: $(uname -m)" >&2
      exit 1
      ;;
  esac

  echo "${os}-${arch}"
}

# Get latest version tag from GitHub (avoids API rate limits)
get_latest_version() {
  # Follow redirect from /releases/latest to get the tag
  local url
  url=$(curl -fsSL -o /dev/null -w "%{url_effective}" "https://github.com/${REPO}/releases/latest" 2>/dev/null || true)

  if [ -n "$url" ]; then
    echo "$url" | grep -o 'v[0-9][0-9.]*' | sed 's/^v//'
  fi
}

main() {
  local platform version artifact url tmpfile

  platform=$(detect_platform)
  echo "Platform: ${platform}"

  # Determine version
  if [ -n "${BRANE_VERSION:-}" ]; then
    version="$BRANE_VERSION"
    echo "Version: ${version} (specified)"
  else
    version=$(get_latest_version)
    if [ -z "$version" ]; then
      echo "error: could not determine latest version. Set BRANE_VERSION manually." >&2
      exit 1
    fi
    echo "Version: ${version} (latest)"
  fi

  artifact="brane-${platform}"
  url="https://github.com/${REPO}/releases/download/v${version}/${artifact}"

  echo "Downloading: ${url}"

  # Create install directory
  mkdir -p "$INSTALL_DIR"

  # Atomic download: write to temp file, then move
  tmpfile=$(mktemp "${INSTALL_DIR}/brane.XXXXXX")
  trap "rm -f '$tmpfile'" EXIT

  if ! curl -fsSL "$url" -o "$tmpfile"; then
    echo "error: download failed. Check that version v${version} exists and has a ${platform} binary." >&2
    exit 1
  fi

  chmod +x "$tmpfile"
  mv "$tmpfile" "${INSTALL_DIR}/brane"
  trap - EXIT  # clear trap on success

  echo ""
  echo "Installed brane to ${INSTALL_DIR}/brane"

  # Check if install dir is on PATH
  if ! echo "$PATH" | tr ':' '\n' | grep -q "^${INSTALL_DIR}$"; then
    echo ""
    echo "Note: ${INSTALL_DIR} is not on your PATH."
    echo "Add it with:"
    echo ""
    echo "  export PATH=\"${INSTALL_DIR}:\$PATH\""
    echo ""
    echo "Or add that line to your ~/.bashrc or ~/.zshrc"
  fi

  echo ""
  echo "Verify with: brane --version"
}

main
