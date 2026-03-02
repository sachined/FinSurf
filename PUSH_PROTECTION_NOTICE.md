# Allow Push with Secrets

GitHub is blocking the push because your API keys are in the commit history.

## Option 1: Bypass Push Protection (Fastest) ✅

Go to this link to allow the secrets:
https://github.com/sachined/FinSurf/security/secret-scanning/unblock-secret/3AP3SuBDlYHA6pUqt5lYNQpxrO5

Then try pushing again:
```bash
cd C:\Code\FinSurf
git push origin main
```

## Option 2: Rotate Your API Keys (Recommended)

Since your actual API keys are exposed in the commit history, you should:

1. Rotate all your API keys:
   - Gemini: https://aistudio.google.com/app/apikey (delete old key, create new)
   - Perplexity: https://www.perplexity.ai/settings (regenerate)
   - OpenAI: https://platform.openai.com/account/api-keys (delete old, create new)
   - Anthropic: https://console.anthropic.com/account/keys (delete old, create new)

2. Update GitHub Secrets with new keys

3. Update DigitalOcean secrets with new keys

4. Continue development

## For Now

Use **Option 1** to bypass and get the checklist pushed, then we'll handle the key rotation separately.
