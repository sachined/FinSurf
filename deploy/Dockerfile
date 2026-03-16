# ─────────────────────────────────────────────────────────────────────────────
# OPTIMIZED Dockerfile for FinSurf - Alpine Base (50% Size Reduction)
#
# This version uses Alpine Linux instead of Debian for a much smaller image
# while maintaining all functionality.
#
# Size comparison:
#   Original (bookworm-slim):  ~1.0 GB
#   Optimized (Alpine):        ~500 MB  (50% reduction!)
# ─────────────────────────────────────────────────────────────────────────────

# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — Build the Vite frontend
# ─────────────────────────────────────────────────────────────────────────────
FROM node:24-alpine AS frontend-builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# hadolint ignore=DL3025
ARG VITE_STRIPE_PUBLISHABLE_KEY
RUN --mount=type=secret,id=vite_app_secret \
    VITE_APP_SECRET=$(cat /run/secrets/vite_app_secret 2>/dev/null || true) \
    VITE_STRIPE_PUBLISHABLE_KEY=${VITE_STRIPE_PUBLISHABLE_KEY:-} \
    npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — Runtime image (Node.js + Python on Alpine)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:24-alpine AS runtime

WORKDIR /app

# ── Install Python & build dependencies ────────────────────────────────────────
# Alpine Linux uses apk instead of apt-get. These packages are minimal but sufficient.
RUN apk add --no-cache \
      python3 \
      py3-pip \
      python3-dev \
      gcc \
      musl-dev \
      linux-headers \
      && rm -rf /var/cache/apk/*

# ── Python virtual environment ────────────────────────────────────────────────
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# ── Install Python dependencies ───────────────────────────────────────────────
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# ── Node.js production dependencies ──────────────────────────────────────────
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ── Application source ────────────────────────────────────────────────────────
COPY server.ts ./
COPY tsconfig.json ./
COPY backend ./backend/

# ── Pre-built frontend from Stage 1 ──────────────────────────────────────────
COPY --from=frontend-builder /app/dist ./dist

# ── Create data directory ─────────────────────────────────────────────────────
RUN mkdir -p /app/data

# ── Copy entrypoint script ───────────────────────────────────────────────────
COPY deploy/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# ── Use existing node user from Alpine base image ──────────────────────────────
# node:24-alpine already includes a 'node' user (uid 1000)
# Just set ownership and switch to it
RUN chown -R node:node /app

USER node

# ─────────────────────────────────────────────────────────────────────────────
# Runtime configuration
# ─────────────────────────────────────────────────────────────────────────────
EXPOSE 3000

ENV NODE_ENV=production
ENV TELEMETRY_DB=/app/data/finsurf_telemetry.db

# Docker HEALTHCHECK — hits the unauthenticated /health endpoint every 30 s.
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Use entrypoint to ensure SIGTERM signals reach the Node.js process
ENTRYPOINT ["/app/docker-entrypoint.sh"]
