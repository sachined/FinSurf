#!/bin/sh
# ─────────────────────────────────────────────────────────────────────────────
# Docker entrypoint for FinSurf
# 
# Runs tsx directly from node_modules to ensure SIGTERM signals are delivered
# to Node.js. The server.ts already has graceful shutdown handlers.
# ─────────────────────────────────────────────────────────────────────────────

set -e

# Execute tsx from node_modules with the shell replaced
exec /app/node_modules/.bin/tsx server.ts
