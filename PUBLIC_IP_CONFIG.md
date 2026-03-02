# Updated Configuration with Public IP

## Your DigitalOcean Droplet Details

```
Public IP:         138.68.240.127
Private IP:        10.120.0.2
SSH User:          root
SSH Key Name:      sachmuelbeck
SSH Key Location:  ~/.ssh/sachmuelbeck
```

---

## SSH Connection (Test This First)

**PowerShell:**
```powershell
ssh -i $env:USERPROFILE\.ssh\sachmuelbeck root@138.68.240.127
```

**Linux/macOS:**
```bash
ssh -i ~/.ssh/sachmuelbeck root@138.68.240.127
```

---

## GitHub Secrets to Update

Go to: https://github.com/sachined/FinSurf/settings/secrets/actions

Update/Add these secrets:

| Secret Name | Value |
|---|---|
| `DOCKER_HUB_USERNAME` | `sleepykiwi91` |
| `DOCKER_HUB_PASSWORD` | `dckr_pat_OqLNe7S64qpMRFIMFGevCzgnSj0` |
| `GEMINI_API_KEY` | (Your Gemini key) |
| `PERPLEXITY_API_KEY` | (Your Perplexity key) |
| `OPENAI_API_KEY` | (Your OpenAI key) |
| `ANTHROPIC_API_KEY` | (Your Anthropic key) |
| `APP_SECRET` | `ae42ae37e6ac56499d924bca5528ee5850d1866d2e7993b8f3080b909309e53c` |
| **`DEPLOYMENT_HOST`** | **`138.68.240.127`** ⬅️ UPDATE THIS |
| **`DEPLOYMENT_USER`** | **`deploy`** |
| **`DEPLOYMENT_PORT`** | **`22`** |
| **`DEPLOYMENT_SSH_KEY`** | **`(Your private SSH key)`** |
| **`DOMAIN`** | **`http://138.68.240.127:3000`** ⬅️ UPDATE THIS |
| **`DAILY_BUDGET_USD`** | **`10.00`** |

---

## Step 1: Test SSH Connection

Run this command in PowerShell:

```powershell
ssh -i $env:USERPROFILE\.ssh\sachmuelbeck root@138.68.240.127
```

Expected output: You should be logged into the droplet as root.

To exit: `exit`

---

## Step 2: Update GitHub Secrets

Go to: https://github.com/sachined/FinSurf/settings/secrets/actions

**Update these 3 secrets:**

1. `DEPLOYMENT_HOST` → Change from `localhost` to `138.68.240.127`
2. `DOMAIN` → Change from `example.com` to `http://138.68.240.127:3000`
3. `DEPLOYMENT_SSH_KEY` → Add your **PRIVATE** SSH key

---

## Step 3: Follow DigitalOcean Checklist

Open: https://github.com/sachined/FinSurf/blob/main/DIGITALOCEAN_CHECKLIST.md

Follow it exactly, but use this IP instead of `10.120.0.2`:
- Replace `10.120.0.2` with `138.68.240.127` wherever you see it

---

## Commands to Remember

**SSH into your droplet:**
```powershell
ssh -i $env:USERPROFILE\.ssh\sachmuelbeck root@138.68.240.127
```

**Check app status (from droplet):**
```bash
docker compose ps
```

**View logs:**
```bash
docker compose logs finsurf
```

**Test health:**
```bash
curl http://localhost:3000/health
```

**Access from your machine (once deployed):**
```
http://138.68.240.127:3000
```

---

## Quick Reference

| Item | Value |
|------|-------|
| IP Address | `138.68.240.127` |
| SSH User | `root` |
| SSH Key | `sachmuelbeck` |
| App Port | `3000` |
| App URL | `http://138.68.240.127:3000` |
| Deployment User | `deploy` |
| Deployment SSH Key | (Your private key) |

---

## Next: Follow These Steps

1. **Test SSH:**
   ```powershell
   ssh -i $env:USERPROFILE\.ssh\sachmuelbeck root@138.68.240.127
   ```

2. **Update GitHub Secrets** with `DEPLOYMENT_HOST = 138.68.240.127`

3. **Follow DIGITALOCEAN_CHECKLIST.md** (replacing IPs as needed)

4. **Push code and watch it deploy!**

---

**Ready? Let me know if SSH works!**
