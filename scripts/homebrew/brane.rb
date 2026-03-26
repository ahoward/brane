# typed: false
# frozen_string_literal: true

# Homebrew formula for brane
#
# Install:
#   brew tap ahoward/tap
#   brew install brane
#
# This formula downloads pre-built binaries from GitHub Releases.
# To create a tap, copy this file to homebrew-tap/Formula/brane.rb
# and update the version/sha256 values on each release.
#

class Brane < Formula
  desc "Semantic Nervous System - Knowledge Graph for AI Agents (MCP)"
  homepage "https://github.com/ahoward/brane"
  version "VERSION"  # replaced by release script
  license "MIT"

  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/ahoward/brane/releases/download/v#{version}/brane-darwin-arm64"
      sha256 "SHA256_DARWIN_ARM64"  # replaced by release script
    else
      url "https://github.com/ahoward/brane/releases/download/v#{version}/brane-darwin-x64"
      sha256 "SHA256_DARWIN_X64"  # replaced by release script
    end
  end

  on_linux do
    if Hardware::CPU.arm?
      url "https://github.com/ahoward/brane/releases/download/v#{version}/brane-linux-arm64"
      sha256 "SHA256_LINUX_ARM64"  # replaced by release script
    else
      url "https://github.com/ahoward/brane/releases/download/v#{version}/brane-linux-x64"
      sha256 "SHA256_LINUX_X64"  # replaced by release script
    end
  end

  def install
    binary = Dir.glob("brane-*").first || "brane"
    bin.install binary => "brane"
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/brane --version")
  end
end
