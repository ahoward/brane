#!/usr/bin/env bash
#
# 13-memory.sh — episodic memory: remember, recall, forget
#
# Agents accumulate experience. brane stores it as searchable episodes.
#

set -e
source "$(dirname "$0")/lib/common.sh"
setup_workspace

brane init

# ─────────────────────────────────────────────────────────────────────────────
# remember — store observations with optional context and outcome
# ─────────────────────────────────────────────────────────────────────────────

brane memory remember "JWT tokens expire after 15 minutes" \
  -c "debugging auth failures in staging" \
  -o "added token refresh logic to middleware"

# remembered (id: 1) [debugging, auth]

brane memory remember "The user table has a unique index on email" \
  -c "investigating duplicate registration bug"

# remembered (id: 2) [debugging]

brane memory remember "Rate limiter uses sliding window, 5 req/min per IP" \
  -t "architecture,security"

# remembered (id: 3) [architecture, security]

# ─────────────────────────────────────────────────────────────────────────────
# recall — semantic search over memories
# ─────────────────────────────────────────────────────────────────────────────

brane memory recall "authentication"

# 0.543  #1  JWT tokens expire after 15 minutes [debugging, auth]
# 0.312  #3  Rate limiter uses sliding window, 5 req/min per IP [architecture, security]

brane memory recall "database schema"

# 0.421  #2  The user table has a unique index on email [debugging]

# ─────────────────────────────────────────────────────────────────────────────
# list — show recent memories
# ─────────────────────────────────────────────────────────────────────────────

brane memory list

# #3  2026-03-27  Rate limiter uses sliding window... [architecture, security]
# #2  2026-03-27  The user table has a unique index... [debugging]
# #1  2026-03-27  JWT tokens expire after 15 minutes [debugging, auth]

# ─────────────────────────────────────────────────────────────────────────────
# forget — remove a memory by ID
# ─────────────────────────────────────────────────────────────────────────────

brane memory forget 2

# forgot episode #2

brane memory list

# now only 2 memories remain
