#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Local deployment script for FinSurf with Docker Secrets
#
# Usage (on your production server):
#   bash deploy.sh [prod|dev]
#
# Example:
#   bash deploy.sh prod  # Deploy with docker-compose.prod.yml
#   bash deploy.sh dev   # Deploy with docker-compose.yml
# ─────────────────────────────────────────────────────────────────────────────

set -e

DEPLOY_ENV="${1:-prod}"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "🚀 Starting FinSurf deployment (environment: $DEPLOY_ENV)..."

# ── Check prerequisites ────────────────────────────────────────────────────────
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed"
    exit 1
fi

# ── Initialize Docker Swarm ────────────────────────────────────────────────────
echo "🔧 Initializing Docker Swarm..."
docker swarm init 2>/dev/null || echo "  (Swarm already initialized)"

# ── Validate secret files exist ────────────────────────────────────────────────
echo "📝 Checking for secret files..."
for secret in gemini_api_key perplexity_api_key openai_api_key anthropic_api_key app_secret; do
    if [ ! -f "$SCRIPT_DIR/../secrets/${secret}.txt" ]; then
        echo "❌ Missing $SCRIPT_DIR/secrets/${secret}.txt"
        echo "   See SECRETS_SETUP.md for setup instructions"
        exit 1
    fi
done

# ── Create Docker Secrets ──────────────────────────────────────────────────────
echo "📋 Creating Docker Secrets..."
for secret in gemini_api_key perplexity_api_key openai_api_key anthropic_api_key app_secret; do
    docker secret rm "$secret" 2>/dev/null || true
    cat "$SCRIPT_DIR/../secrets/${secret}.txt" | docker secret create "$secret" -
    echo "   ✅ Created secret: $secret"
done

# ── Update .env.nonsecret ──────────────────────────────────────────────────────
echo "📋 Updating environment configuration..."
if [ -f "$SCRIPT_DIR/../.env.nonsecret" ]; then
    echo "   Using existing .env.nonsecret"
else
    echo "⚠️  Warning: .env.nonsecret not found, creating default..."
    cat > "$SCRIPT_DIR/../.env.nonsecret" << 'EOF'
PORT=3000
NODE_ENV=production
TELEMETRY_DB=/app/data/finsurf_telemetry.db
TELEMETRY_DISABLED=false
ALLOWED_PROVIDERS=gemini,perplexity,openai,anthropic
EOF
fi

# ── Build and deploy ───────────────────────────────────────────────────────────
echo "🐳 Building and deploying..."
APP_SECRET=$(cat "$SCRIPT_DIR/../secrets/app_secret.txt")

if [ "$DEPLOY_ENV" = "prod" ]; then
    echo "   Deploying with docker-compose.prod.yml (with Caddy)..."
    docker compose -f "$SCRIPT_DIR/docker-compose.prod.yml" down || true
    docker compose -f "$SCRIPT_DIR/docker-compose.prod.yml" build \
        --build-arg VITE_APP_SECRET="$APP_SECRET" \
        --no-cache
    docker compose -f "$SCRIPT_DIR/docker-compose.prod.yml" up -d
else
    echo "   Deploying with docker-compose.yml..."
    docker compose -f "$SCRIPT_DIR/docker-compose.yml" down || true
    docker compose -f "$SCRIPT_DIR/docker-compose.yml" build \
        --build-arg VITE_APP_SECRET="$APP_SECRET" \
        --no-cache
    docker compose -f "$SCRIPT_DIR/docker-compose.yml" up -d
fi

# ── Wait for health check ──────────────────────────────────────────────────────
echo "⏳ Waiting for application to be healthy..."
for i in {1..30}; do
    if docker compose ps | grep -q "healthy"; then
        echo "✅ Application is healthy"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Application failed to become healthy"
        docker compose logs
        exit 1
    fi
    sleep 2
done

# ── Clean up ────────────────────────────────────────────────────────────────
echo "🧹 Cleaning up unused Docker resources..."
docker system prune -f

# ── Show status ─────────────────────────────────────────────────────────────
echo ""
echo "✅ Deployment completed successfully!"
echo ""
echo "📊 Current containers:"
docker compose ps
echo ""
if [ "$DEPLOY_ENV" = "prod" ]; then
    echo "🌐 Application: https://\$DOMAIN"
else
    echo "🌐 Application: http://localhost:3000"
fi
