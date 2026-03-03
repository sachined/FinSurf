# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — Build the Vite frontend
#
# VITE_APP_SECRET is passed as a build-arg so it is baked into the JS bundle.
# The Express auth middleware reads the same value from the runtime env var
# APP_SECRET and rejects any request that does not supply a matching
# Authorization: Bearer <APP_SECRET> header.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS frontend-builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_APP_SECRET
ENV VITE_APP_SECRET=$VITE_APP_SECRET

RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — Runtime image (Node.js + Python in a single container)
#
# Both runtimes live together so the existing child_process architecture works
# without any inter-container networking changes.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS runtime

WORKDIR /app

# ── System dependencies ───────────────────────────────────────────────────────
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      python3 \
      python3-pip \
      python3-venv \
 && rm -rf /var/lib/apt/lists/*

# ── Python virtual environment ────────────────────────────────────────────────
# Using a venv avoids PEP 668 "externally-managed" pip errors on Debian 12+.
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# ── Node.js production dependencies ──────────────────────────────────────────
COPY package*.json ./
RUN npm ci

# ── Application source ────────────────────────────────────────────────────────
COPY server.ts      ./
COPY tsconfig.json  ./
COPY backend/       ./backend/

# ── Pre-built frontend from Stage 1 ──────────────────────────────────────────
COPY --from=frontend-builder /app/dist ./dist

# ── Persistent data directory (overridden by a Docker volume in production) ──
RUN mkdir -p /app/data

# ── Copy entrypoint script and make it executable (before USER switch) ────────
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# ── Drop root privileges ──────────────────────────────────────────────────────
# The node:bookworm-slim base image ships a non-root "node" user (uid 1000).
# Running as a non-root user limits the blast radius of any container escape:
# the process cannot modify system files, install packages, or bind ports < 1024.
RUN chown -R node:node /app/data
USER node

# ─────────────────────────────────────────────────────────────────────────────
# Runtime configuration
# ─────────────────────────────────────────────────────────────────────────────
EXPOSE 3000

ENV NODE_ENV=production
ENV TELEMETRY_DB=/app/data/finsurf_telemetry.db

# Docker HEALTHCHECK — hits the unauthenticated /health endpoint every 30 s.
# The container is marked unhealthy after 3 consecutive failures (90 s).
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Use entrypoint to ensure SIGTERM signals reach the Node.js process
ENTRYPOINT ["/app/docker-entrypoint.sh"]
