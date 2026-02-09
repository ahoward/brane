#!/bin/bash
#
# Build Brane binaries for all platforms
#
# This script:
# 1. Downloads platform-specific CozoDB native binaries
# 2. Cross-compiles Brane for each platform using Bun
#
# Usage: ./scripts/build-release.sh [version]
#

set -e

VERSION="${1:-dev}"
COZO_VERSION="0.7.6"
NAPI_VERSION="6"
COZO_RELEASE_URL="https://github.com/cozodb/cozo-lib-nodejs/releases/download/${COZO_VERSION}"

# Platforms: cozo-platform -> bun-target
declare -A PLATFORMS=(
    ["linux-x64"]="bun-linux-x64"
    ["linux-arm64"]="bun-linux-arm64"
    ["darwin-x64"]="bun-darwin-x64"
    ["darwin-arm64"]="bun-darwin-arm64"
    ["win32-x64"]="bun-windows-x64"
)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="${PROJECT_DIR}/dist"
NATIVE_DIR="${PROJECT_DIR}/node_modules/cozo-node/cozo-lib-nodejs/native/${NAPI_VERSION}"

mkdir -p "${BUILD_DIR}"

echo "=== Brane Release Build ==="
echo "Version: ${VERSION}"
echo "CozoDB: ${COZO_VERSION}"
echo ""

for COZO_PLATFORM in "${!PLATFORMS[@]}"; do
    BUN_TARGET="${PLATFORMS[$COZO_PLATFORM]}"

    echo "--- Building for ${COZO_PLATFORM} (${BUN_TARGET}) ---"

    # Download native binary for this platform
    # Archive contains 6/cozo_node_prebuilt.node, so extract to parent dir
    ARCHIVE="${NAPI_VERSION}-${COZO_PLATFORM}.tar.gz"
    NATIVE_PARENT="$(dirname "${NATIVE_DIR}")"
    echo "Downloading ${ARCHIVE}..."
    mkdir -p "${NATIVE_PARENT}"
    curl -fsSL "${COZO_RELEASE_URL}/${ARCHIVE}" | tar -xzf - -C "${NATIVE_PARENT}"

    # Determine output filename
    if [[ "$COZO_PLATFORM" == "win32-x64" ]]; then
        OUTPUT="brane-${VERSION}-${COZO_PLATFORM}.exe"
    else
        OUTPUT="brane-${VERSION}-${COZO_PLATFORM}"
    fi

    # Build
    echo "Compiling ${OUTPUT}..."
    bun build --compile --target="${BUN_TARGET}" \
        --minify \
        "${PROJECT_DIR}/src/cli.ts" \
        --outfile "${BUILD_DIR}/${OUTPUT}"

    echo "Built: ${BUILD_DIR}/${OUTPUT}"
    ls -lh "${BUILD_DIR}/${OUTPUT}"
    echo ""
done

echo "=== Build Complete ==="
ls -lh "${BUILD_DIR}/"
