# ─────────────────────────────────────────────────────────────────────────────
# FinSurf CI/CD Deployment Checklist
# ─────────────────────────────────────────────────────────────────────────────

## Prerequisites

- [ ] You have a GitHub repository set up (https://github.com/YOUR_USERNAME/FinSurf)
- [ ] You have Docker Hub account (https://hub.docker.com)
- [ ] You have a production server with Docker and docker-compose installed
- [ ] You have SSH access to your production server

## Local Setup (Do This First)

1. **Create secret files locally:**
   ```bash
   mkdir -p secrets
   echo "your-gemini-key-here" > secrets/gemini_api_key.txt
   echo "your-perplexity-key-here" > secrets/perplexity_api_key.txt
   echo "your-openai-key-here" > secrets/openai_api_key.txt
   echo "your-anthropic-key-here" > secrets/anthropic_api_key.txt
   openssl rand -hex 32 > secrets/app_secret.txt
   ```

2. **Test locally with deploy script:**
   ```bash
   # Linux/macOS
   bash deploy.sh dev
   
   # Windows (PowerShell)
   .\deploy.bat dev
   ```

3. **Verify deployment:**
   ```bash
   docker compose ps
   docker compose logs finsurf
   ```

## Production Server Setup

1. **SSH into your server:**
   ```bash
   ssh deploy@your-server
   ```

2. **Create deploy directory:**
   ```bash
   mkdir -p /opt/finsurf
   cd /opt/finsurf
   ```

3. **Clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/FinSurf.git .
   ```

4. **Initialize Docker Swarm:**
   ```bash
   docker swarm init
   ```

5. **Create secret files on server:**
   ```bash
   mkdir -p secrets
   
   # Use your actual API keys
   echo "sk-..." > secrets/gemini_api_key.txt
   echo "pplx-..." > secrets/perplexity_api_key.txt
   echo "sk-..." > secrets/openai_api_key.txt
   echo "sk-..." > secrets/anthropic_api_key.txt
   openssl rand -hex 32 > secrets/app_secret.txt
   ```

6. **Test deployment script:**
   ```bash
   bash deploy.sh prod
   ```

## GitHub Actions Setup

1. **Generate SSH key:**
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/github-actions -N ""
   ```

2. **Add public key to server:**
   ```bash
   cat ~/.ssh/github-actions.pub | ssh deploy@your-server \
     'cat >> ~/.ssh/authorized_keys'
   ```

3. **Test SSH connection:**
   ```bash
   ssh -i ~/.ssh/github-actions deploy@your-server "docker ps"
   ```

4. **Go to GitHub repository → Settings → Secrets and variables → Actions**

5. **Add the following secrets:**

   **Docker Hub:**
   - [ ] `DOCKER_HUB_USERNAME` — Your Docker Hub username
   - [ ] `DOCKER_HUB_PASSWORD` — Your Docker Hub Personal Access Token

   **API Keys:**
   - [ ] `GEMINI_API_KEY` — Your Gemini API key
   - [ ] `PERPLEXITY_API_KEY` — Your Perplexity API key
   - [ ] `OPENAI_API_KEY` — Your OpenAI API key
   - [ ] `ANTHROPIC_API_KEY` — Your Anthropic API key
   - [ ] `APP_SECRET` — Output of: `openssl rand -hex 32`

   **Deployment Configuration:**
   - [ ] `DEPLOYMENT_HOST` — Your server IP (e.g., 192.168.1.100)
   - [ ] `DEPLOYMENT_USER` — SSH username (e.g., deploy)
   - [ ] `DEPLOYMENT_PORT` — SSH port (default: 22)
   - [ ] `DEPLOYMENT_SSH_KEY` — Contents of `~/.ssh/github-actions` (PRIVATE key)
   - [ ] `DOMAIN` — Your production domain (e.g., finsurf.example.com)
   - [ ] `DAILY_BUDGET_USD` — Cost limit (e.g., 10.00)

6. **Commit and push:**
   ```bash
   git add .github/workflows/deploy.yml CI_CD_SETUP.md deploy.sh deploy.bat
   git commit -m "Set up GitHub Actions CI/CD with Docker Secrets"
   git push origin main
   ```

7. **Watch the workflow:**
   - Go to GitHub → Actions tab
   - Select "Build and Deploy FinSurf"
   - Watch the logs

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Permission denied (publickey)" | Run: `ssh -i ~/.ssh/github-actions deploy@your-server "whoami"` |
| "Health check failed" | Run: `ssh deploy@your-server "docker compose logs finsurf"` |
| "Docker image push failed" | Verify `DOCKER_HUB_USERNAME` and `DOCKER_HUB_PASSWORD` in GitHub Secrets |
| "Out of disk space" | Run: `ssh deploy@your-server "docker system prune -a"` |

## Monitoring

**Check deployment status:**
```bash
# From your server
docker compose ps
docker compose logs finsurf
docker secret ls
```

**View GitHub Actions logs:**
- Go to GitHub → Actions tab
- Click the workflow run
- Expand failed step for details

**Monitor application:**
```bash
curl http://localhost:3000/health
docker stats
docker system df
```

## Next Steps

1. **Set up monitoring (optional):**
   - Add Slack notifications to `.github/workflows/deploy.yml`
   - Monitor application uptime with a service like UptimeRobot

2. **Set up backups:**
   - Backup `/opt/finsurf/secrets/` to a secure location
   - Backup Docker volumes: `docker run -v finsurf_finsurf_data:/data -v /backup:/backup alpine tar czf /backup/finsurf-data.tar.gz -C / data`

3. **Set up automatic updates:**
   - Enable GitHub Actions to run on schedule: `schedule: [cron: '0 2 * * 0']`
   - Auto-update dependencies with Dependabot

4. **Security hardening:**
   - Set up firewall rules to limit access to production server
   - Use environment protection rules in GitHub
   - Rotate API keys regularly

---

**Need help?** See:
- `.github/workflows/deploy.yml` — GitHub Actions workflow
- `CI_CD_SETUP.md` — Detailed setup guide
- `SECRETS_SETUP.md` — Docker Secrets configuration
- `deploy.sh` / `deploy.bat` — Local deployment script
