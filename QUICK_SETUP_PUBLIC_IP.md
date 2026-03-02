# 🚀 Quick Start with Public IP: 138.68.240.127

## Your Droplet

```
Public IP:  138.68.240.127
SSH User:   root
SSH Key:    sachmuelbeck
```

---

## Test SSH Connection (Do This First!)

**PowerShell:**
```powershell
ssh -i $env:USERPROFILE\.ssh\sachmuelbeck root@138.68.240.127
```

If it works, you'll see a Linux prompt. Type `exit` to disconnect.

**Expected output:**
```
root@finsurf:~#
```

---

## If SSH Doesn't Work

**Check 1: Is SSH installed?**
```powershell
ssh -V
```

If not found, install it (run as Administrator):
```powershell
Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0
```

**Check 2: Does the key file exist?**
```powershell
Test-Path $env:USERPROFILE\.ssh\sachmuelbeck
```

**Check 3: Try verbose SSH**
```powershell
ssh -v -i $env:USERPROFILE\.ssh\sachmuelbeck root@138.68.240.127
```

---

## Once SSH Works

### Step 1: Update GitHub Secrets

Go to: https://github.com/sachined/FinSurf/settings/secrets/actions

Update these:
- `DEPLOYMENT_HOST` = `138.68.240.127`
- `DOMAIN` = `http://138.68.240.127:3000`
- `DEPLOYMENT_SSH_KEY` = (Your private key from `~/.ssh/sachmuelbeck`)

### Step 2: Run Setup Commands on Droplet

SSH into droplet:
```powershell
ssh -i $env:USERPROFILE\.ssh\sachmuelbeck root@138.68.240.127
```

Then run these commands:

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
useradd -m -s /bin/bash deploy
usermod -aG docker deploy
mkdir -p /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chown -R deploy:deploy /home/deploy/.ssh
```

### Step 4: Generate SSH Key for GitHub Actions (Local Machine)

**PowerShell:**
```powershell
ssh-keygen -t ed25519 -f $env:USERPROFILE\.ssh\github-actions-finsurf -N ""
Get-Content $env:USERPROFILE\.ssh\github-actions-finsurf.pub
```

Copy the output (starts with `ssh-ed25519`).

### Step 5: Add SSH Key to Deploy User (On Droplet)

```bash
su - deploy
cat >> ~/.ssh/authorized_keys << 'EOF'
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5... (PASTE YOUR PUBLIC KEY HERE)
EOF
chmod 600 ~/.ssh/authorized_keys
exit
```

### Step 6: Set Up FinSurf Directory

```bash
mkdir -p /opt/finsurf
chown deploy:deploy /opt/finsurf

su - deploy
cd /opt/finsurf
git clone https://github.com/sachined/FinSurf.git .
exit
```

### Step 7: Initialize Docker Swarm

```bash
docker swarm init
```

### Step 8: Create Docker Secrets

```bash
# Gemini
echo "YOUR_GEMINI_KEY" | docker secret create gemini_api_key -

# Perplexity
echo "YOUR_PERPLEXITY_KEY" | docker secret create perplexity_api_key -

# OpenAI
echo "YOUR_OPENAI_KEY" | docker secret create openai_api_key -

# Anthropic
echo "YOUR_ANTHROPIC_KEY" | docker secret create anthropic_api_key -

# APP Secret
echo "ae42ae37e6ac56499d924bca5528ee5850d1866d2e7993b8f3080b909309e53c" | docker secret create app_secret -

# Verify
docker secret ls
```

### Step 9: Update .env.nonsecret

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
CORS_ORIGIN=http://138.68.240.127:3000
EOF

exit
```

---

## Test Deployment

```bash
ssh -i $env:USERPROFILE\.ssh\github-actions-finsurf deploy@138.68.240.127

cd /opt/finsurf

docker compose build --build-arg VITE_APP_SECRET=ae42ae37e6ac56499d924bca5528ee5850d1866d2e7993b8f3080b909309e53c

docker compose up -d

sleep 5

docker compose ps

curl http://localhost:3000/health
```

---

## Push Code to Trigger GitHub Actions

```powershell
cd C:\Code\FinSurf

git add .
git commit -m "chore: Configure deployment for public IP 138.68.240.127"
git push origin main
```

Watch at: https://github.com/sachined/FinSurf/actions

---

## Access Your App

Once deployed:
```
http://138.68.240.127:3000
```

---

## Summary

✅ Public IP: `138.68.240.127`
✅ SSH: `ssh -i $env:USERPROFILE\.ssh\sachmuelbeck root@138.68.240.127`
✅ App URL: `http://138.68.240.127:3000`
✅ GitHub Actions: Automatic deployments on every push

---

**Start with Step 1: Test SSH Connection**

Let me know if you can connect! 🚀
