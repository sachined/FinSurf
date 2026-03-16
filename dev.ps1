# ─────────────────────────────────────────────────────────────────────────────
# dev.ps1 — Local development launcher for FinSurf
#
# Reads API keys from secrets/*.txt (mirrors what Docker Compose does in prod).
# Run with:  .\dev.ps1
# ─────────────────────────────────────────────────────────────────────────────

# ── Secrets (read from files, same as Docker Secrets in prod) ─────────────────
$env:GEMINI_API_KEY_FILE     = "$PSScriptRoot\secrets\gemini_api_key.txt"
$env:PERPLEXITY_API_KEY_FILE = "$PSScriptRoot\secrets\perplexity_api_key.txt"
$env:GROQ_API_KEY_FILE       = "$PSScriptRoot\secrets\groq_api_key.txt"
$env:APP_SECRET_FILE         = "$PSScriptRoot\secrets\app_secret.txt"
$env:LANGCHAIN_API_KEY_FILE   = "$PSScriptRoot\secrets\langchain_api_key.txt"

# ── Non-secret config (mirrors .env.nonsecret) ────────────────────────────────
$env:PORT                    = "3000"
$env:NODE_ENV                = "development"
$env:TELEMETRY_DB            = "$PSScriptRoot\finsurf_telemetry.db"
$env:TELEMETRY_DISABLED      = "false"   # keeps dev writes separate from prod DB
$env:ALLOWED_PROVIDERS       = "gemini,perplexity,groq"

# ── LangSmith (from .env.nonsecret if available, otherwise defaults) ─────────
$env:LANGCHAIN_TRACING_V2    = "true"
$env:LANGCHAIN_PROJECT       = "FinSurf"
$env:LANGCHAIN_ENDPOINT      = "https://api.smith.langchain.com"

# ── Groq (free cloud LLM — primary for Tax, Dividend, Guardrail) ───────────────
# Sign up free at https://console.groq.com — no GPU or local install needed.
# If GROQ_API_KEY is missing or invalid, agents automatically fall back to Gemini.
$env:GROQ_MODEL              = "llama-3.3-70b-versatile"
# ── Ollama (optional local LLM — uncomment if running locally) ─────────────
# $env:OLLAMA_BASE_URL       = "http://localhost:11434"
# $env:OLLAMA_MODEL          = "qwen2.5:7b"
$env:DAILY_BUDGET_USD        = ""       # no spend cap in dev

# ── Write VITE_APP_SECRET to .env.local so Vite's dev server picks it up ──────
# Vite only injects VITE_* vars into import.meta.env from .env files, not from
# shell env vars. .env.local is already gitignored (.env* rule in .gitignore).
$appSecret     = (Get-Content "$PSScriptRoot\secrets\app_secret.txt" -Raw).Trim()
$envLocalPath  = "$PSScriptRoot\.env.local"
[System.IO.File]::WriteAllText($envLocalPath, "VITE_APP_SECRET=$appSecret")

try {
    npm run dev
} finally {
    Remove-Item $envLocalPath -Force -ErrorAction SilentlyContinue
}
