# 🚀 Complete FinSurf CI/CD Setup with DigitalOcean

## Your Setup Summary

```
GitHub Username:      sachined
Docker Hub:          sleepykiwi91
DigitalOcean Droplet: 10.120.0.2 (Private IP)
SSH Key:             sachmuelbeck
Domain:              http://10.120.0.2:3000 (Private)
```

---

## Phase 1: Server Setup (Do This Now) ⚡

### Step 1: SSH into Droplet
```bash
ssh -i ~/.ssh/sachmuelbeck root@10.120.0.2
```

### Step 2: Install Docker & Docker Compose
```bash
# Update system
apt-get update && apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Verify
docker --version
docker-compose --version
```

### Step 3: Create Deploy User
```bash
# Create user
useradd -m -s /bin/bash deploy
usermod -aG docker deploy

# Set up SSH
mkdir -p /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chown -R deploy:deploy /home/deploy/.ssh
```

### Step 4: Generate GitHub Actions SSH Key (Local Machine)
```bash
ssh-keygen -t ed25519 -f ~/.ssh/github-actions-finsurf -N ""
cat ~/.ssh/github-actions-finsurf.pub
```

### Step 5: Add SSH Key to Deploy User (On Droplet)
```bash
# As root, switch to deploy user
su - deploy

# Add your public key
cat >> ~/.ssh/authorized_keys << 'EOF'
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5... (PASTE YOUR PUBLIC KEY)
EOF

# Set permissions
chmod 600 ~/.ssh/authorized_keys
exit
```

### Step 6: Verify SSH Works (Local Machine)
```bash
ssh -i ~/.ssh/github-actions-finsurf deploy@10.120.0.2 "whoami"
# Should output: deploy
```

### Step 7: Set Up FinSurf Directory (On Droplet)
```bash
# As root
mkdir -p /opt/finsurf
chown deploy:deploy /opt/finsurf

# As deploy user
su - deploy
cd /opt/finsurf
git clone https://github.com/sachined/FinSurf.git .
exit
```

### Step 8: Initialize Docker Swarm (On Droplet)
```bash
docker swarm init
```

### Step 9: Create Docker Secrets (On Droplet, as root)
```bash
# Gemini
echo "your-gemini-api-key-here" | docker secret create gemini_api_key -

# Perplexity
echo "your-perplexity-api-key-here" | docker secret create perplexity_api_key -

# OpenAI
echo "your-openai-api-key-here" | docker secret create openai_api_key -

# Anthropic
echo "your-anthropic-api-key-here" | docker secret create anthropic_api_key -

# APP Secret
echo "ae42ae37e6ac56499d924bca5528ee5850d1866d2e7993b8f3080b909309e53c" | docker secret create app_secret -

# Verify
docker secret ls
```

### Step 10: Configure .env.nonsecret (On Droplet, as deploy user)
```bash
su - deploy
cd /opt/finsurf

cat > .env.nonsecret << 'EOF'
PORT=3000
NODE_ENV=production
TELEMETRY_DB=/app/data/finsurf_telemetry.db
TELEMETRY_DISABLED=false
DAILY_BUDGET_USD=10.00
ALLOWED_PROVIDERS=gemini,perplexity,openai,anthropic
CORS_ORIGIN=http://10.120.0.2:3000
EOF

exit
```

✅ **Phase 1 Complete!** (Takes ~15 minutes)

---

## Phase 2: Add GitHub Secrets ⚡

Go to: https://github.com/sachined/FinSurf/settings/secrets/actions

**Add/Update these secrets:**

1. **DEPLOYMENT_HOST**
   ```
   10.120.0.2
   ```

2. **DEPLOYMENT_USER**
   ```
   deploy
   ```

3. **DEPLOYMENT_PORT**
   ```
   22
   ```

4. **DEPLOYMENT_SSH_KEY**
   ```
   (Paste your PRIVATE key from ~/.ssh/github-actions-finsurf)
   ```

5. **DOMAIN**
   ```
   http://10.120.0.2:3000
   ```

6. **DAILY_BUDGET_USD**
   ```
   10.00
   ```

✅ **Phase 2 Complete!** (Takes ~5 minutes)

---

## Phase 3: Test Deployment ⚡

### Test 1: Manual Deployment on Server
```bash
ssh -i ~/.ssh/github-actions-finsurf deploy@10.120.0.2

cd /opt/finsurf

# Build and deploy
docker compose build --build-arg VITE_APP_SECRET=ae42ae37e6ac56499d924bca5528ee5850d1866d2e7993b8f3080b909309e53c

docker compose up -d

# Check status
sleep 5
docker compose ps

# View logs
docker compose logs finsurf

# Test health
curl http://localhost:3000/health
```

### Test 2: GitHub Actions Automatic Deployment
```bash
cd C:\Code\FinSurf

# Make a small change
git add .
git commit -m "chore: Add DigitalOcean deployment"
git push origin main
```

Watch at: https://github.com/sachined/FinSurf/actions

Verify on server:
```bash
ssh -i ~/.ssh/github-actions-finsurf deploy@10.120.0.2 "docker compose ps"
```

✅ **Phase 3 Complete!** (Takes ~5 minutes)

---

## What You Have Now

✅ DigitalOcean droplet with Docker
✅ Deploy user with SSH key auth
✅ FinSurf repository ready
✅ Docker Swarm initialized
✅ Docker Secrets configured
✅ GitHub Actions secrets added
✅ Automated deployments ready

---

## How It Works Now

```
You push code to GitHub
    ↓
GitHub Actions triggers
    ↓
Builds Docker image
    ↓
Pushes to Docker Hub
    ↓
SSHes to deploy@10.120.0.2
    ↓
Creates Docker Secrets
    ↓
Runs: docker compose up -d
    ↓
Health checks pass
    ↓
App is live at http://10.120.0.2:3000 🎉
```

**Every push to `main` or `develop` = automatic deploy!**

---

## Access Your App

From any machine with access to your VPN/network:
```bash
http://10.120.0.2:3000
```

From the server:
```bash
curl http://localhost:3000/health
```

---

## Monitoring

**Check status:**
```bash
ssh -i ~/.ssh/github-actions-finsurf deploy@10.120.0.2 "docker compose ps"
```

**View logs:**
```bash
ssh -i ~/.ssh/github-actions-finsurf deploy@10.120.0.2 "docker compose logs finsurf"
```

**Restart:**
```bash
ssh -i ~/.ssh/github-actions-finsurf deploy@10.120.0.2 "docker compose restart"
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Can't SSH | Check key: `ssh -i ~/.ssh/github-actions-finsurf deploy@10.120.0.2` |
| Docker not installed | Run: `curl -fsSL https://get.docker.com \| sh` |
| Secrets not showing | Run: `docker secret ls` to verify |
| Health check failing | Check logs: `docker compose logs finsurf` |
| App not accessible | Check firewall and VPN access to 10.120.0.2 |

---

## Timeline

✅ Phase 1: Server Setup (15 min) - **DO NOW**
✅ Phase 2: GitHub Secrets (5 min) - **DO NOW**
✅ Phase 3: Test Deployment (5 min) - **DO NOW**

**Total: ~25 minutes to full deployment**

---

## 🎉 Next Steps

1. **Follow Phase 1** on your DigitalOcean droplet
2. **Add GitHub Secrets** from Phase 2
3. **Test Deployment** from Phase 3
4. **Push code** to trigger automatic deployments

Everything is automated after this! Every time you push code, it deploys automatically! 🚀

---

## Documentation

- `DIGITALOCEAN_SETUP.md` — Detailed step-by-step guide
- `DIGITALOCEAN_CHECKLIST.md` — Quick reference checklist
- `.github/workflows/deploy.yml` — GitHub Actions workflow
- `README_CI_CD.md` — Full CI/CD documentation

---

**Ready? Start with Phase 1! 🚀**
