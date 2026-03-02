# DigitalOcean Droplet Setup for FinSurf CI/CD

## Your Droplet Info

```
IP Address: 10.120.0.2 (Private)
Username: root
Key Fingerprint: SHA256:qTMD5fGJxJjrbWidR+//XkB6Eso8SHeFSeyj9e/kLwI
Key Name: sachmuelbeck
Domain: (None - using private IP)
```

---

## Prerequisites

✅ You have SSH access to the droplet with the key: `sachmuelbeck`
✅ DigitalOcean account with the droplet running
✅ GitHub repository ready with workflow files pushed

---

## Step 1: SSH into Your Droplet

On your local machine:

```bash
ssh -i ~/.ssh/sachmuelbeck root@10.120.0.2
```

If prompted, accept the host key.

---

## Step 2: Update System and Install Docker

Run these commands on the droplet:

```bash
# Update system
apt-get update
apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Verify Docker installed
docker --version
```

---

## Step 3: Install Docker Compose

```bash
# Download Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make it executable
chmod +x /usr/local/bin/docker-compose

# Verify installation
docker-compose --version
```

---

## Step 4: Create Deploy User and Set Up SSH

```bash
# Create deploy user
useradd -m -s /bin/bash deploy

# Add deploy user to docker group
usermod -aG docker deploy

# Create .ssh directory for deploy user
mkdir -p /home/deploy/.ssh
chmod 700 /home/deploy/.ssh

# Set ownership
chown -R deploy:deploy /home/deploy/.ssh
```

---

## Step 5: Generate SSH Key for GitHub Actions

On your **local machine**:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/github-actions-finsurf -N ""
```

This creates two files:
- `~/.ssh/github-actions-finsurf` (private key)
- `~/.ssh/github-actions-finsurf.pub` (public key)

---

## Step 6: Add Public Key to Deploy User

Copy your public key to the server.

**On your local machine, get the public key:**

```bash
cat ~/.ssh/github-actions-finsurf.pub
```

Copy the output (starts with `ssh-ed25519`).

**On the droplet (as root), add it to authorized_keys:**

```bash
# Switch to deploy user
su - deploy

# Add public key
cat >> ~/.ssh/authorized_keys << 'EOF'
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5... (paste your full public key here)
EOF

# Set correct permissions
chmod 600 ~/.ssh/authorized_keys

# Exit back to root
exit
```

**Verify it works from your local machine:**

```bash
ssh -i ~/.ssh/github-actions-finsurf deploy@10.120.0.2 "whoami"
```

Should output: `deploy`

---

## Step 7: Set Up FinSurf Deployment Directory

On the droplet (as root):

```bash
# Create deployment directory
mkdir -p /opt/finsurf
chown deploy:deploy /opt/finsurf

# Switch to deploy user
su - deploy
cd /opt/finsurf

# Clone the repository
git clone https://github.com/sachined/FinSurf.git .

# Exit back to root
exit
```

---

## Step 8: Initialize Docker Swarm

On the droplet (as root):

```bash
docker swarm init
```

This enables Docker Secrets functionality.

---

## Step 9: Create Docker Secrets Locally (on Server)

On the droplet (as root), create the secret files:

```bash
# Create secrets directory on server
mkdir -p /tmp/finsurf-secrets

# Add your secrets (replace with your actual values):
cat > /tmp/finsurf-secrets/gemini_api_key.txt << 'EOF'
your-gemini-api-key-here
EOF

cat > /tmp/finsurf-secrets/perplexity_api_key.txt << 'EOF'
your-perplexity-api-key-here
EOF

cat > /tmp/finsurf-secrets/openai_api_key.txt << 'EOF'
your-openai-api-key-here
EOF

cat > /tmp/finsurf-secrets/anthropic_api_key.txt << 'EOF'
your-anthropic-api-key-here
EOF

cat > /tmp/finsurf-secrets/app_secret.txt << 'EOF'
ae42ae37e6ac56499d924bca5528ee5850d1866d2e7993b8f3080b909309e53c
EOF

# Create Docker Secrets from files
cat /tmp/finsurf-secrets/gemini_api_key.txt | docker secret create gemini_api_key -
cat /tmp/finsurf-secrets/perplexity_api_key.txt | docker secret create perplexity_api_key -
cat /tmp/finsurf-secrets/openai_api_key.txt | docker secret create openai_api_key -
cat /tmp/finsurf-secrets/anthropic_api_key.txt | docker secret create anthropic_api_key -
cat /tmp/finsurf-secrets/app_secret.txt | docker secret create app_secret -

# Verify secrets were created
docker secret ls

# Clean up temporary files
rm -rf /tmp/finsurf-secrets
```

---

## Step 10: Update .env.nonsecret on Server

On the droplet (as deploy user):

```bash
# Switch to deploy user
su - deploy
cd /opt/finsurf

# Update .env.nonsecret
cat > .env.nonsecret << 'EOF'
PORT=3000
NODE_ENV=production
TELEMETRY_DB=/app/data/finsurf_telemetry.db
TELEMETRY_DISABLED=false
DAILY_BUDGET_USD=10.00
ALLOWED_PROVIDERS=gemini,perplexity,openai,anthropic
CORS_ORIGIN=http://10.120.0.2:3000
EOF

# Exit back to root
exit
```

---

## Step 11: Test Deployment (Optional)

On the droplet (as deploy user):

```bash
su - deploy
cd /opt/finsurf

# Build the image
APP_SECRET=$(cat /opt/finsurf/.env.nonsecret | grep APP_SECRET) docker compose build --build-arg VITE_APP_SECRET=ae42ae37e6ac56499d924bca5528ee5850d1866d2e7993b8f3080b909309e53c

# Start containers
docker compose up -d

# Wait 10 seconds for startup
sleep 10

# Check status
docker compose ps

# View logs
docker compose logs finsurf

# Test health endpoint
curl http://localhost:3000/health
```

---

## Step 12: Add GitHub Secrets for Deployment

Go to: https://github.com/sachined/FinSurf/settings/secrets/actions

Update these secrets:

```
Name: DEPLOYMENT_HOST
Value: 10.120.0.2

Name: DEPLOYMENT_USER
Value: deploy

Name: DEPLOYMENT_PORT
Value: 22

Name: DEPLOYMENT_SSH_KEY
Value: (Contents of ~/.ssh/github-actions-finsurf - the PRIVATE key)

Name: DOMAIN
Value: http://10.120.0.2:3000

Name: DAILY_BUDGET_USD
Value: 10.00
```

---

## Step 13: Test GitHub Actions Deployment

1. Make a small change to your code (e.g., edit README.md)
2. Push to GitHub:
   ```bash
   git add .
   git commit -m "test: trigger GitHub Actions deployment"
   git push origin main
   ```

3. Go to: https://github.com/sachined/FinSurf/actions
4. Watch the workflow run
5. SSH to droplet to verify: `ssh -i ~/.ssh/github-actions-finsurf deploy@10.120.0.2 "docker compose ps"`

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Permission denied" on SSH | Check key permissions: `chmod 600 ~/.ssh/github-actions-finsurf` |
| "Docker command not found" | Run: `apt-get install -y docker.io` |
| "Docker daemon is not running" | Run: `systemctl start docker` |
| "Swarm not initialized" | Run: `docker swarm init` |
| "Health check failed" | Check logs: `docker compose logs finsurf` |
| "Cannot connect to 10.120.0.2" | Verify firewall rules and VPN access |

---

## Summary

✅ Docker installed
✅ Deploy user created
✅ SSH key configured for GitHub Actions
✅ Docker Swarm initialized
✅ Docker Secrets created
✅ Repository cloned
✅ Ready for automated deployments!

Next: Add GitHub Secrets and push code to trigger your first automatic deploy!
