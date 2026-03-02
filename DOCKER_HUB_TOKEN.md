# Generate Docker Hub Personal Access Token

## Steps:

1. Go to https://hub.docker.com/settings/security
2. Click **"New Access Token"**
3. Give it a name (e.g., "GitHub Actions")
4. Select scope: **"Read & Write"**
5. Click **"Generate"**
6. **Copy the token immediately** (you won't see it again)
7. Keep it safe — this is your `DOCKER_HUB_PASSWORD` for GitHub Secrets

## Security Note:
- ❌ DO NOT use your actual Docker Hub password
- ✅ USE the Personal Access Token instead
- 🔒 Treat it like a password — don't share or commit it

---

Once you have the token, provide it and I'll continue with Step 2.
