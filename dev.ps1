# ─────────────────────────────────────────────────────────────────────────────
# dev.ps1 — Local development launcher for FinSurf
#
# Loads API keys from .env.development.local (preferred) or secrets/*.txt files.
# Run with:  .\dev.ps1
# ─────────────────────────────────────────────────────────────────────────────

# ── Load API keys from .env.development.local (if it exists) ──────────────────
$envDevPath = "$PSScriptRoot\.env.development.local"
$geminiKey = $null
$groqKey = $null
$perplexityKey = $null
$appSecret = $null
$langchainKey = $null
$alphaVantageKey = $null
$finnhubKey = $null

if (Test-Path $envDevPath) {
    Write-Host "Loading API keys from .env.development.local..." -ForegroundColor Cyan
    Get-Content $envDevPath | ForEach-Object {
        if ($_ -match '^\s*GEMINI_API_KEY\s*=\s*(.+)$') { $geminiKey = $matches[1].Trim() }
        if ($_ -match '^\s*GROQ_API_KEY\s*=\s*(.+)$') { $groqKey = $matches[1].Trim() }
        if ($_ -match '^\s*PERPLEXITY_API_KEY\s*=\s*(.+)$') { $perplexityKey = $matches[1].Trim() }
        if ($_ -match '^\s*VITE_APP_SECRET\s*=\s*(.+)$') { $appSecret = $matches[1].Trim() }
        if ($_ -match '^\s*LANGCHAIN_API_KEY\s*=\s*(.+)$') { $langchainKey = $matches[1].Trim() }
        if ($_ -match '^\s*ALPHA_VANTAGE_API_KEY\s*=\s*(.+)$') { $alphaVantageKey = $matches[1].Trim() }
        if ($_ -match '^\s*FINNHUB_API_KEY\s*=\s*(.+)$') { $finnhubKey = $matches[1].Trim() }
    }
}

# ── Fallback: Read from secrets/*.txt files (Docker Secrets parity) ───────────
if (-not $geminiKey -and (Test-Path "$PSScriptRoot\secrets\gemini_api_key.txt")) {
    $geminiKey = (Get-Content "$PSScriptRoot\secrets\gemini_api_key.txt" -Raw).Trim()
}
if (-not $groqKey -and (Test-Path "$PSScriptRoot\secrets\groq_api_key.txt")) {
    $groqKey = (Get-Content "$PSScriptRoot\secrets\groq_api_key.txt" -Raw).Trim()
}
if (-not $perplexityKey -and (Test-Path "$PSScriptRoot\secrets\perplexity_api_key.txt")) {
    $perplexityKey = (Get-Content "$PSScriptRoot\secrets\perplexity_api_key.txt" -Raw).Trim()
}
if (-not $appSecret -and (Test-Path "$PSScriptRoot\secrets\app_secret.txt")) {
    $appSecret = (Get-Content "$PSScriptRoot\secrets\app_secret.txt" -Raw).Trim()
}
if (-not $langchainKey -and (Test-Path "$PSScriptRoot\secrets\langchain_api_key.txt")) {
    $langchainKey = (Get-Content "$PSScriptRoot\secrets\langchain_api_key.txt" -Raw).Trim()
}
if (-not $alphaVantageKey -and (Test-Path "$PSScriptRoot\secrets\alpha_vantage_api_key.txt")) {
    $alphaVantageKey = (Get-Content "$PSScriptRoot\secrets\alpha_vantage_api_key.txt" -Raw).Trim()
}
if (-not $finnhubKey -and (Test-Path "$PSScriptRoot\secrets\finnhub_api_key.txt")) {
    $finnhubKey = (Get-Content "$PSScriptRoot\secrets\finnhub_api_key.txt" -Raw).Trim()
}

# ── Set environment variables for Node.js server ──────────────────────────────
if ($geminiKey) { $env:GEMINI_API_KEY = $geminiKey }
if ($groqKey) { $env:GROQ_API_KEY = $groqKey }
if ($perplexityKey) { $env:PERPLEXITY_API_KEY = $perplexityKey }
if ($langchainKey) { $env:LANGCHAIN_API_KEY = $langchainKey }
if ($alphaVantageKey) { $env:ALPHA_VANTAGE_API_KEY = $alphaVantageKey }
if ($finnhubKey) { $env:FINNHUB_API_KEY = $finnhubKey }

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

# ── Write temporary .env file for Python's validation script ─────────────────
# The backend/validate_env.py script uses python-dotenv which reads .env
# We create it temporarily with the loaded keys, then clean up on exit.
$envPath = "$PSScriptRoot\.env"
$envLocalPath = "$PSScriptRoot\.env.local"

$envContent = @()
if ($geminiKey) { $envContent += "GEMINI_API_KEY=$geminiKey" }
if ($groqKey) { $envContent += "GROQ_API_KEY=$groqKey" }
if ($perplexityKey) { $envContent += "PERPLEXITY_API_KEY=$perplexityKey" }
if ($langchainKey) { $envContent += "LANGCHAIN_API_KEY=$langchainKey" }
if ($alphaVantageKey) { $envContent += "ALPHA_VANTAGE_API_KEY=$alphaVantageKey" }
if ($finnhubKey) { $envContent += "FINNHUB_API_KEY=$finnhubKey" }

if ($envContent.Count -gt 0) {
    [System.IO.File]::WriteAllText($envPath, ($envContent -join "`n"))
    Write-Host "Created temporary .env for backend validation" -ForegroundColor Green
}

# Write VITE_APP_SECRET to .env.local so Vite's dev server picks it up
if ($appSecret) {
    [System.IO.File]::WriteAllText($envLocalPath, "VITE_APP_SECRET=$appSecret")
}

try {
    npm run dev
} finally {
    # Clean up temporary files
    Remove-Item $envPath -Force -ErrorAction SilentlyContinue
    Remove-Item $envLocalPath -Force -ErrorAction SilentlyContinue
    Write-Host "Cleaned up temporary .env files" -ForegroundColor Yellow
}
