# CI/CD Pipeline Overview

## What Was Created

Your GitHub Actions CI/CD pipeline automatically builds, creates Docker Secrets, and deploys FinSurf to your production server.

### Files Added:

```
.github/workflows/
└── deploy.yml                 GitHub Actions workflow (auto-builds & deploys)

Root directory:
├── CI_CD_SETUP.md            Detailed setup instructions
├── DEPLOYMENT_CHECKLIST.md   Quick-start checklist
├── deploy.sh                 Linux/macOS deployment script
└── deploy.bat                Windows deployment script
```

## How It Works

### 1. **Trigger**
   - Push to `main` branch → Production deployment (with Caddy)
   - Push to `develop` branch → Staging deployment
   - Manual: GitHub → Actions → "Run workflow"

### 2. **Build**
   - Checkout code
   - Build Docker image with `VITE_APP_SECRET` build arg
   - Push to Docker Hub

### 3. **Deploy**
   - SSH into production server
   - Initialize Docker Swarm (if needed)
   - **Create Docker Secrets:**
     ```bash
     echo "$GEMINI_API_KEY" | docker secret create gemini_api_key -
     echo "$PERPLEXITY_API_KEY" | docker secret create perplexity_api_key -
     echo "$OPENAI_API_KEY" | docker secret create openai_api_key -
     echo "$ANTHROPIC_API_KEY" | docker secret create anthropic_api_key -
     echo "$APP_SECRET" | docker secret create app_secret -
     ```
   - Pull latest image
   - Deploy with `docker-compose` or `docker-compose.prod.yml`
   - Wait for health checks to pass
   - Clean up unused resources

### 4. **Verify**
   - Health checks confirm container is running
   - Application is live and healthy

## GitHub Secrets Required

You need to add these to GitHub → Settings → Secrets and variables → Actions:

| Secret | Example | Where to Get |
|--------|---------|---|
| `DOCKER_HUB_USERNAME` | `sleepykiwi91` | https://hub.docker.com/settings/account |
| `DOCKER_HUB_PASSWORD` | `dckr_pat_xxxxx` | Generate Personal Access Token in Docker Hub |
| `GEMINI_API_KEY` | `AIzaSy...` | Google AI Studio |
| `PERPLEXITY_API_KEY` | `pplx-...` | Perplexity.ai |
| `OPENAI_API_KEY` | `sk-...` | OpenAI Platform |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Anthropic Console |
| `APP_SECRET` | (random) | `openssl rand -hex 32` |
| `DEPLOYMENT_HOST` | `192.168.1.100` | Your server IP |
| `DEPLOYMENT_USER` | `deploy` | SSH user on server |
| `DEPLOYMENT_PORT` | `22` | SSH port (usually 22) |
| `DEPLOYMENT_SSH_KEY` | (private key) | Content of `~/.ssh/github-actions` |
| `DOMAIN` | `finsurf.example.com` | Your production domain |
| `DAILY_BUDGET_USD` | `10.00` | Max daily API spend |

## Local Deployment (Without GitHub)

You can also deploy manually from your server using the provided scripts:

```bash
# Linux/macOS
bash deploy.sh prod    # Production with Caddy
bash deploy.sh dev     # Development only

# Windows (PowerShell)
.\deploy.bat prod
.\deploy.bat dev
```

## Workflow Steps Explained

### Step 1: Checkout
```yaml
- uses: actions/checkout@v4
```
Clones your repository code into the CI environment.

### Step 2: Docker Build
```yaml
uses: docker/build-push-action@v5
```
Builds the Docker image and pushes to Docker Hub.

### Step 3: Deploy via SSH
```yaml
uses: appleboy/ssh-action@master
```
Connects to your server and runs the deployment script.

**Key commands:**
- `docker swarm init` — Enable Secrets (safe to run multiple times)
- `docker secret create` — Register secrets with Docker
- `docker compose up -d` — Start containers

### Step 4: Health Check
```bash
docker compose ps | grep "healthy"
```
Waits up to 60 seconds for the application to become healthy.

## Environment-Specific Behavior

### Main Branch (Production)
- Uses `docker-compose.prod.yml` with Caddy
- Sets `CORS_ORIGIN` to your domain
- Enables HTTPS with Let's Encrypt

### Develop Branch (Staging)
- Uses `docker-compose.yml` (no Caddy)
- Available at `http://server-ip:3000`
- Good for testing before production

## Security Features

✅ **SSH key-based authentication** — No password needed
✅ **Docker Secrets** — API keys never in environment
✅ **Secret file protection** — Only readable by the app
✅ **Automated secrets rotation** — New secrets created on each deploy
✅ **HTTPS with Caddy** — Auto-renewing Let's Encrypt certs (production only)
✅ **Health checks** — Deployment fails if app doesn't start
✅ **Graceful shutdown** — SIGTERM handling preserves in-flight requests

## Monitoring & Troubleshooting

**View GitHub Actions logs:**
- GitHub → Actions tab → Click the workflow run → Expand failed step

**Check deployment on server:**
```bash
ssh deploy@your-server
docker compose ps                    # See container status
docker compose logs finsurf          # View application logs
docker secret ls                     # Verify secrets exist
docker inspect finsurf-finsurf-1     # Check Secrets mounted
```

**Common issues:**

| Issue | Fix |
|-------|-----|
| "Permission denied" | SSH key not authorized on server |
| "Health check failed" | API keys invalid or server misconfigured |
| "Docker image push failed" | Docker Hub credentials wrong |
| "Swarm not initialized" | Run `docker swarm init` manually |

## Next Steps

1. ✅ **Set up GitHub Secrets** — Follow `CI_CD_SETUP.md`
2. ✅ **Test locally** — Run `bash deploy.sh dev` or `deploy.bat dev`
3. ✅ **Push to GitHub** — Commit and push to trigger workflow
4. ✅ **Monitor deployment** — Watch Actions tab
5. ✅ **Verify production** — SSH to server and check `docker compose ps`

See `DEPLOYMENT_CHECKLIST.md` for step-by-step instructions.

---

**Questions?**
- `.github/workflows/deploy.yml` — Full workflow definition
- `CI_CD_SETUP.md` — Detailed setup guide with examples
- `SECRETS_SETUP.md` — Docker Secrets reference
- `DEPLOYMENT_CHECKLIST.md` — Quick checklist
