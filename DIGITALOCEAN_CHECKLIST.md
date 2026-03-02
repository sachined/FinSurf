# DigitalOcean Setup Checklist

## Your Droplet Details

```
IP: 10.120.0.2 (Private)
User: root
SSH Key: sachmuelbeck
```

---

## Quick Setup Steps

Follow these in order:

### 1. SSH into Droplet
```bash
ssh -i ~/.ssh/sachmuelbeck root@10.120.0.2
```
✅ Can you connect?

### 2. Update & Install Docker
```bash
apt-get update && apt-get upgrade -y
curl -fsSL https://get.docker.com | sh
docker --version
```
✅ Docker installed?

### 3. Install Docker Compose
```bash
curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
docker-compose --version
```
✅ Docker Compose installed?

### 4. Create Deploy User
```bash
useradd -m -s /bin/bash deploy
usermod -aG docker deploy
mkdir -p /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chown -R deploy:deploy /home/deploy/.ssh
```
✅ Deploy user created?

### 5. Generate SSH Key (LOCAL MACHINE)
```bash
ssh-keygen -t ed25519 -f ~/.ssh/github-actions-finsurf -N ""
cat ~/.ssh/github-actions-finsurf.pub
```
✅ SSH key generated? Save output ↓

**Public Key:** `ssh-ed25519 AAAA...`

### 6. Add Public Key to Server
```bash
su - deploy
cat >> ~/.ssh/authorized_keys << 'EOF'
(PASTE YOUR PUBLIC KEY HERE)
EOF
chmod 600 ~/.ssh/authorized_keys
exit
```
✅ Public key added?

### 7. Verify SSH Works
```bash
ssh -i ~/.ssh/github-actions-finsurf deploy@10.120.0.2 "whoami"
```
✅ Shows `deploy`?

### 8. Set Up FinSurf Directory
```bash
mkdir -p /opt/finsurf
chown deploy:deploy /opt/finsurf
su - deploy
cd /opt/finsurf
git clone https://github.com/sachined/FinSurf.git .
exit
```
✅ Repository cloned?

### 9. Initialize Docker Swarm
```bash
docker swarm init
```
✅ Swarm initialized?

### 10. Create Docker Secrets
```bash
# Create all 5 secrets (use your actual API keys)

# Gemini
echo "YOUR_GEMINI_API_KEY" | docker secret create gemini_api_key -

# Perplexity
echo "YOUR_PERPLEXITY_API_KEY" | docker secret create perplexity_api_key -

# OpenAI
echo "YOUR_OPENAI_API_KEY" | docker secret create openai_api_key -

# Anthropic
echo "YOUR_ANTHROPIC_API_KEY" | docker secret create anthropic_api_key -

# APP Secret
echo "ae42ae37e6ac56499d924bca5528ee5850d1866d2e7993b8f3080b909309e53c" | docker secret create app_secret -

# Verify
docker secret ls
```
✅ All 5 secrets created? (check with `docker secret ls`)

### 11. Add GitHub Secrets
Go to: https://github.com/sachined/FinSurf/settings/secrets/actions

Add/Update these:

```
DEPLOYMENT_HOST = 10.120.0.2
DEPLOYMENT_USER = deploy
DEPLOYMENT_PORT = 22
DEPLOYMENT_SSH_KEY = (PRIVATE key from ~/.ssh/github-actions-finsurf)
DOMAIN = http://10.120.0.2:3000
DAILY_BUDGET_USD = 10.00
```

✅ All 6 secrets added in GitHub?

### 12. Push Code to Trigger Deployment

```bash
cd C:\Code\FinSurf
git add .
git commit -m "chore: Add DigitalOcean deployment configuration"
git push origin main
```

✅ Code pushed?

### 13. Watch Deployment

Go to: https://github.com/sachined/FinSurf/actions

✅ Workflow running?

### 14. Verify on Server

```bash
ssh -i ~/.ssh/github-actions-finsurf deploy@10.120.0.2
docker compose ps
docker compose logs finsurf
curl http://localhost:3000/health
```

✅ App running and healthy?

---

## Access Your App

Once deployed:

```bash
# SSH into server
ssh -i ~/.ssh/github-actions-finsurf deploy@10.120.0.2

# View status
docker compose ps

# View logs
docker compose logs finsurf

# Access app (from server)
curl http://localhost:3000/health
```

---

## Troubleshooting

**Can't SSH?**
- Check: `ssh -i ~/.ssh/sachmuelbeck root@10.120.0.2`
- Verify key permissions: `chmod 600 ~/.ssh/sachmuelbeck`

**Docker not found?**
- Reinstall: `curl -fsSL https://get.docker.com | sh`

**Deploy user can't access?**
- Check SSH key: `ssh -i ~/.ssh/github-actions-finsurf deploy@10.120.0.2 "whoami"`
- Should output: `deploy`

**Secrets not working?**
- Verify: `docker secret ls`
- Should show 5 secrets

**Health check failing?**
- Check logs: `docker compose logs finsurf`
- Check port: `netstat -tlnp | grep 3000`

---

## Done! 🎉

You now have:
✅ Docker & docker-compose installed
✅ Deploy user with SSH key access
✅ FinSurf repository cloned
✅ Docker Swarm initialized
✅ Docker Secrets configured
✅ GitHub Actions secrets added
✅ Automated deployments ready!

Next time you push to `main` or `develop`, GitHub Actions will automatically:
1. Build the Docker image
2. Push to Docker Hub
3. SSH to your server
4. Deploy with docker-compose
5. Health check passes
6. App is live! 🚀
