# Setting Up a Production Server for FinSurf

Since you don't have a server yet, this guide will help you set one up. Here are your options:

## Option 1: DigitalOcean (Recommended - Easy & Affordable)

### 1. Create a DigitalOcean Account
- Go to https://www.digitalocean.com
- Sign up (takes 5 minutes)
- Add a payment method

### 2. Create a Droplet (Virtual Server)
1. Click **"Create"** → **"Droplets"**
2. Choose **Image**: Ubuntu 22.04 LTS
3. Choose **Plan**: Basic ($6/month - 1 CPU, 1GB RAM is enough for start)
4. Choose **Region**: Pick one closest to you
5. **Authentication**: SSH key (recommended) or password
6. **Hostname**: `finsurf` or your domain
7. Click **"Create Droplet"**

### 3. Set Up SSH Access
If you chose password auth:
```bash
ssh root@YOUR_DROPLET_IP
```

If you chose SSH key:
- Download the key from DigitalOcean
- Save it as `~/.ssh/digitalocean`
- Run: `chmod 600 ~/.ssh/digitalocean`
- Connect: `ssh -i ~/.ssh/digitalocean root@YOUR_DROPLET_IP`

## Option 2: AWS EC2

### 1. Create AWS Account
- Go to https://aws.amazon.com
- Sign up for free tier
- Complete account setup

### 2. Launch an EC2 Instance
1. Go to **EC2 Dashboard**
2. Click **"Launch Instances"**
3. Choose **AMI**: Ubuntu Server 22.04 LTS (Free Tier)
4. Choose **Instance Type**: t2.micro (Free Tier eligible)
5. **Key Pair**: Create or import SSH key
6. **Security Group**: Allow ports 22 (SSH), 80 (HTTP), 443 (HTTPS)
7. Click **"Launch"**

### 3. Connect to Instance
```bash
chmod 600 /path/to/your/key.pem
ssh -i /path/to/your/key.pem ubuntu@YOUR_PUBLIC_IP
```

## Option 3: Linode (Similar to DigitalOcean)

- Go to https://www.linode.com
- Create account
- Create a Linode (similar to DigitalOcean Droplet)
- Ubuntu 22.04, 1GB RAM, $5/month

---

## Once You Have a Server

After creating a server, follow these steps:

### 1. **SSH into Your Server**
```bash
ssh -i ~/.ssh/your-key root@YOUR_SERVER_IP
```

### 2. **Update System**
```bash
apt-get update
apt-get upgrade -y
```

### 3. **Install Docker**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

### 4. **Install Docker Compose**
```bash
curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

### 5. **Create Deploy User**
```bash
useradd -m -s /bin/bash deploy
usermod -aG docker deploy
mkdir -p /opt/finsurf
chown deploy:deploy /opt/finsurf
```

### 6. **Set Up SSH Key for GitHub Actions**

On your **local machine**:
```bash
ssh-keygen -t ed25519 -f ~/.ssh/github-actions -N ""
cat ~/.ssh/github-actions.pub
```

On your **server** (as deploy user):
```bash
su - deploy
mkdir -p ~/.ssh
# Paste the public key from above:
cat >> ~/.ssh/authorized_keys << 'EOF'
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIO... (your public key here)
EOF
chmod 600 ~/.ssh/authorized_keys
```

### 7. **Clone FinSurf Repository**
```bash
sudo -u deploy bash
cd /opt/finsurf
git clone https://github.com/sachined/FinSurf.git .
```

### 8. **Initialize Docker Swarm**
```bash
docker swarm init
```

### 9. **Add Deployment Secrets to GitHub**

Now that you have a server, add these GitHub Secrets:

| Secret | Value |
|--------|-------|
| `DEPLOYMENT_HOST` | Your server IP (e.g., 192.168.1.100) |
| `DEPLOYMENT_USER` | `deploy` |
| `DEPLOYMENT_PORT` | `22` |
| `DEPLOYMENT_SSH_KEY` | Contents of `~/.ssh/github-actions` (PRIVATE key) |
| `DOMAIN` | Your domain (e.g., `finsurf.example.com`) |

### 10. **Set Up Domain (Optional but Recommended)**

For HTTPS with Caddy, point your domain to your server:
1. Get your server's IP
2. Go to your domain registrar (Namecheap, GoDaddy, etc.)
3. Create an A record pointing to your server IP
4. Wait 24 hours for DNS to propagate

---

## Testing Your Setup

Once you have a server and added GitHub Secrets:

1. **Commit and push your code:**
   ```bash
   git add .github/workflows/deploy.yml
   git commit -m "Add GitHub Actions workflow"
   git push origin main
   ```

2. **Watch GitHub Actions:**
   - Go to https://github.com/sachined/FinSurf/actions
   - Click the workflow run
   - Watch the logs

3. **SSH to server and verify:**
   ```bash
   ssh -i ~/.ssh/github-actions deploy@YOUR_SERVER_IP
   docker compose ps
   docker compose logs finsurf
   ```

---

## Cost Estimate

| Provider | Plan | Cost/Month |
|----------|------|-----------|
| DigitalOcean | Basic Droplet | $6 |
| AWS | t2.micro (Free tier) | Free (1 year) |
| Linode | 1GB Linode | $5 |

All are more than enough for FinSurf.

---

## Questions?

- **DigitalOcean Help**: https://docs.digitalocean.com/
- **AWS Help**: https://docs.aws.amazon.com/
- **Docker Help**: https://docs.docker.com/

Once you have a server IP, come back and I'll help you finish the GitHub Actions setup!
