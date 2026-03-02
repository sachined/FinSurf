# ─────────────────────────────────────────────────────────────────────────────
# Docker Secrets Setup Guide
# ─────────────────────────────────────────────────────────────────────────────
# 
# FinSurf now uses Docker Secrets for secure secret management instead of
# storing API keys in .env files. Secrets are mounted as read-only files
# inside containers and never appear in environment variables (unless
# explicitly set by the application).
#
# ─────────────────────────────────────────────────────────────────────────────
# STEP 1: Initialize Docker Swarm
# ─────────────────────────────────────────────────────────────────────────────
# (Only needed once per Docker host)
#
#   docker swarm init
#
# This enables Docker Secrets functionality. Even on a single-node cluster,
# Swarm mode is required.
#
# ─────────────────────────────────────────────────────────────────────────────
# STEP 2: Populate Secret Files
# ─────────────────────────────────────────────────────────────────────────────
# 
# Create the following files in the ./secrets/ directory:
#
#   ./secrets/gemini_api_key.txt           — Your Gemini API key
#   ./secrets/perplexity_api_key.txt       — Your Perplexity API key (optional)
#   ./secrets/openai_api_key.txt           — Your OpenAI API key (optional)
#   ./secrets/anthropic_api_key.txt        — Your Anthropic API key (optional)
#   ./secrets/app_secret.txt               — A secure random string (see below)
#
# Generate a secure app_secret:
#
#   openssl rand -hex 32 > ./secrets/app_secret.txt
#
# Or on Windows (PowerShell):
#
#   [System.BitConverter]::ToString([System.Security.Cryptography.RNGCryptoServiceProvider]::new().GetBytes(32)) -replace '-' | Set-Content -NoNewline ./secrets/app_secret.txt
#
# ─────────────────────────────────────────────────────────────────────────────
# STEP 3: Create Docker Secrets
# ─────────────────────────────────────────────────────────────────────────────
#
# Run these commands to register the secrets with Docker Swarm:
#
#   docker secret create gemini_api_key < ./secrets/gemini_api_key.txt
#   docker secret create perplexity_api_key < ./secrets/perplexity_api_key.txt
#   docker secret create openai_api_key < ./secrets/openai_api_key.txt
#   docker secret create anthropic_api_key < ./secrets/anthropic_api_key.txt
#   docker secret create app_secret < ./secrets/app_secret.txt
#
# Verify they were created:
#
#   docker secret ls
#
# ─────────────────────────────────────────────────────────────────────────────
# STEP 4: Build & Deploy with Compose
# ─────────────────────────────────────────────────────────────────────────────
#
# For local development (compose):
#
#   docker compose build --build-arg VITE_APP_SECRET=$(cat ./secrets/app_secret.txt)
#   docker compose up -d
#
# For production with Caddy (compose.prod):
#
#   docker compose -f docker-compose.prod.yml build --build-arg VITE_APP_SECRET=$(cat ./secrets/app_secret.txt)
#   docker compose -f docker-compose.prod.yml up -d
#
# ─────────────────────────────────────────────────────────────────────────────
# How It Works
# ─────────────────────────────────────────────────────────────────────────────
#
# 1. Secrets are stored on disk (in ./secrets/*.txt) and NEVER committed to git
#    (.gitignore prevents this).
#
# 2. When you run `docker secret create`, Docker encrypts and stores the secret
#    in its internal database.
#
# 3. When the container starts, Docker mounts the secret as a read-only file
#    at /run/secrets/<name>. This file is only readable by root and the
#    container's process.
#
# 4. The application reads from the file (via the *_FILE environment variables)
#    instead of reading from the environment.
#
# 5. This ensures secrets never appear in:
#    - docker inspect output
#    - docker logs
#    - child process environment
#    - image layers
#
# ─────────────────────────────────────────────────────────────────────────────
# Updating Secrets
# ─────────────────────────────────────────────────────────────────────────────
#
# To update a secret, you must remove the old one and create a new one:
#
#   docker secret rm gemini_api_key
#   docker secret create gemini_api_key < ./secrets/gemini_api_key.txt
#
# Then restart the services:
#
#   docker compose restart
#
# ─────────────────────────────────────────────────────────────────────────────
# Environment Variable Fallback
# ─────────────────────────────────────────────────────────────────────────────
#
# For backward compatibility and local development, server.ts supports both:
#
# 1. Docker Secrets (recommended for production):
#    - Set GEMINI_API_KEY_FILE=/run/secrets/gemini_api_key
#
# 2. Environment variables (OK for local dev):
#    - Set GEMINI_API_KEY=sk-...
#
# The getSecret() function tries files first, falls back to env vars.
#
# ─────────────────────────────────────────────────────────────────────────────
# Security Best Practices
# ─────────────────────────────────────────────────────────────────────────────
#
# ✅ DO:
#   - Store secrets in separate files outside the repo
#   - Use strong random values for app_secret (openssl rand -hex 32)
#   - Rotate secrets regularly
#   - Limit who has filesystem access to ./secrets/
#   - Use secrets on the same host or trusted network only
#
# ❌ DON'T:
#   - Commit ./secrets/*.txt to version control
#   - Share secret files via email or unencrypted channels
#   - Log secret values to stdout
#   - Embed secrets in docker-compose.yml or Dockerfile
#   - Use the same app_secret across multiple deployments
#
# ─────────────────────────────────────────────────────────────────────────────
