# ─────────────────────────────────────────────────────────────────────────────
# GitHub Actions CI/CD Setup Guide
# ─────────────────────────────────────────────────────────────────────────────
# 
# This guide explains how to set up GitHub Actions to automatically build,
# create Docker Secrets, and deploy FinSurf to your production server.
#
# ─────────────────────────────────────────────────────────────────────────────
# STEP 1: Prepare Your Production Server
# ─────────────────────────────────────────────────────────────────────────────
#
# 1. Create a deploy user on your server (recommended):
#
#    ssh your-server
#    sudo useradd -m -s /bin/bash deploy
#    sudo usermod -aG docker deploy
#    sudo mkdir -p /opt/finsurf
#    sudo chown deploy:deploy /opt/finsurf
#
# 2. Clone the repository on the server:
#
#    sudo -u deploy git clone https://github.com/YOUR_USERNAME/FinSurf.git /opt/finsurf
#    cd /opt/finsurf
#
# 3. Initialize Docker Swarm (required for secrets):
#
#    docker swarm init
#
# ─────────────────────────────────────────────────────────────────────────────
# STEP 2: Generate SSH Key for GitHub Actions
# ─────────────────────────────────────────────────────────────────────────────
#
# 1. Generate an SSH key pair (no passphrase):
#
#    ssh-keygen -t ed25519 -f ~/.ssh/github-actions -N ""
#
# 2. Add the public key to your server's authorized_keys:
#
#    cat ~/.ssh/github-actions.pub | ssh deploy@your-server \
#      'cat >> ~/.ssh/authorized_keys'
#
# 3. Verify the connection works:
#
#    ssh -i ~/.ssh/github-actions deploy@your-server "docker ps"
#
# ─────────────────────────────────────────────────────────────────────────────
# STEP 3: Add GitHub Secrets
# ─────────────────────────────────────────────────────────────────────────────
#
# Go to your GitHub repository → Settings → Secrets and variables → Actions
# Add the following secrets:
#
# DOCKER HUB CREDENTIALS:
# ───────────────────────
#   DOCKER_HUB_USERNAME  — Your Docker Hub username
#   DOCKER_HUB_PASSWORD  — Your Docker Hub Personal Access Token (not password!)
#
#   To create a PAT:
#     1. Log in to hub.docker.com
#     2. Account Settings → Security → New Access Token
#     3. Give it "Read & Write" permissions
#     4. Copy and paste into GitHub Secret
#
# API KEYS (Sensitive):
# ─────────────────────
#   GEMINI_API_KEY           — Your Google Gemini API key
#   PERPLEXITY_API_KEY       — Your Perplexity API key (optional)
#   OPENAI_API_KEY           — Your OpenAI API key (optional)
#   ANTHROPIC_API_KEY        — Your Anthropic API key (optional)
#   APP_SECRET               — A secure random string (e.g., openssl rand -hex 32)
#
# DEPLOYMENT CONFIGURATION:
# ─────────────────────────
#   DEPLOYMENT_HOST          — Your server IP or hostname (e.g., 192.168.1.100)
#   DEPLOYMENT_USER          — SSH username (e.g., deploy)
#   DEPLOYMENT_PORT          — SSH port (default: 22)
#   DEPLOYMENT_SSH_KEY       — Contents of ~/.ssh/github-actions (private key!)
#   DOMAIN                   — Your production domain (e.g., finsurf.example.com)
#   DAILY_BUDGET_USD         — Daily cost limit for API calls (e.g., 10.00)
#
# ─────────────────────────────────────────────────────────────────────────────
# STEP 4: Add GitHub Organization Secret (Optional)
# ─────────────────────────────────────────────────────────────────────────────
#
# If you have multiple repositories, you can create an organization-level
# secret so you don't have to add DEPLOYMENT_SSH_KEY to each repo:
#
#   Settings → Secrets and variables → Actions → Organization secrets
#   Add DEPLOYMENT_SSH_KEY there, then reference it in workflows.
#
# ─────────────────────────────────────────────────────────────────────────────
# STEP 5: Set Environment Protection Rules (Recommended)
# ─────────────────────────────────────────────────────────────────────────────
#
# To prevent accidental deployments to production:
#
#   1. Go to Settings → Environments → Create "production"
#   2. Under "Environment secrets", add sensitive secrets specific to production
#   3. Under "Deployment branches", select "Protected branches only" and
#      add your "main" branch
#   4. Optionally: Require approval from certain users before deployment
#
# ─────────────────────────────────────────────────────────────────────────────
# STEP 6: Test the Workflow
# ─────────────────────────────────────────────────────────────────────────────
#
# 1. Push a commit to main or develop branch:
#
#    git add .
#    git commit -m "Set up GitHub Actions CI/CD"
#    git push origin main
#
# 2. Go to GitHub → Actions tab and watch the workflow run
#
# 3. Check the logs to see:
#    - Docker image building
#    - Docker Secrets being created
#    - docker-compose deployment
#    - Health checks passing
#
# 4. If it fails, check:
#    - SSH key permissions (should be 600)
#    - Server disk space (docker system df)
#    - Docker Swarm status (docker info | grep Swarm)
#    - .env.nonsecret variables (DOMAIN, etc.)
#
# ─────────────────────────────────────────────────────────────────────────────
# Workflow Triggers
# ─────────────────────────────────────────────────────────────────────────────
#
# The workflow runs automatically when:
#   ✅ Push to 'main' branch (production with Caddy)
#   ✅ Push to 'develop' branch (staging)
#   ✅ Manual trigger via "Run workflow" button on GitHub
#
# To trigger a deployment manually:
#   1. Go to GitHub → Actions tab
#   2. Click "Build and Deploy FinSurf"
#   3. Click "Run workflow" → choose your branch
#
# ─────────────────────────────────────────────────────────────────────────────
# How Docker Secrets Are Created
# ─────────────────────────────────────────────────────────────────────────────
#
# During deployment, the workflow:
#
#   1. SSH into your server
#   2. Initializes Docker Swarm (safe to run multiple times)
#   3. For each secret (GEMINI_API_KEY, etc.):
#      - Remove the old secret (if exists): docker secret rm gemini_api_key
#      - Create new secret: echo "${{ secrets.GEMINI_API_KEY }}" | docker secret create gemini_api_key -
#   4. Pulls the latest Docker image
#   5. Runs docker-compose (development) or docker-compose.prod.yml (production)
#   6. Waits for health checks to pass
#   7. Cleans up unused Docker resources
#
# The secrets are now available to the container at /run/secrets/gemini_api_key, etc.
#
# ─────────────────────────────────────────────────────────────────────────────
# Troubleshooting
# ─────────────────────────────────────────────────────────────────────────────
#
# "Permission denied (publickey)"
#   → Check SSH key permissions on server: chmod 600 ~/.ssh/authorized_keys
#   → Test SSH locally: ssh -i ~/.ssh/github-actions deploy@your-server
#   → Verify DEPLOYMENT_SSH_KEY secret contains the PRIVATE key, not public
#
# "Docker Swarm is not initialized"
#   → Run manually: ssh deploy@your-server "docker swarm init"
#   → Or add it to the deployment script
#
# "Health check failed"
#   → SSH to server: docker compose logs finsurf
#   → Check if GEMINI_API_KEY is invalid or expired
#   → Verify DOMAIN is correctly set in .env.nonsecret
#
# "Docker image push failed"
#   → Check DOCKER_HUB_USERNAME and DOCKER_HUB_PASSWORD are correct
#   → Verify the image name matches your Docker Hub repo
#   → Use Personal Access Token instead of password
#
# "Out of disk space"
#   → Run: docker system prune -a (removes all unused images)
#   → Or: docker image prune -a -f (older than 24h)
#
# ─────────────────────────────────────────────────────────────────────────────
# Advanced Configuration
# ─────────────────────────────────────────────────────────────────────────────
#
# Slack notifications (optional):
#   Add this step to .github/workflows/deploy.yml to notify on success/failure:
#
#   - name: Notify Slack on success
#     if: success()
#     uses: slackapi/slack-github-action@v1
#     with:
#       webhook-url: ${{ secrets.SLACK_WEBHOOK }}
#       payload: |
#         {
#           "text": "✅ FinSurf deployed successfully"
#         }
#
# Multi-environment deployments:
#   Split workflow into separate staging/production jobs
#   Use different DEPLOYMENT_HOST secrets for each environment
#
# Automatic rollback:
#   Keep backup of previous docker-compose state
#   On failure, restore backup: git checkout docker-compose.yml
#
# ─────────────────────────────────────────────────────────────────────────────
