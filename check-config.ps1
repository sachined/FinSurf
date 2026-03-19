# ─────────────────────────────────────────────────────────────────────────────
# check-config.ps1 — Validate FinSurf environment configuration
#
# Checks both development and production setups for common misconfigurations.
# Run before deploying to catch issues early.
# ─────────────────────────────────────────────────────────────────────────────

$ErrorCount = 0

function Test-FileExists {
    param([string]$Path, [string]$Description)
    if (Test-Path $Path) {
        Write-Host "✅ $Description exists: $Path" -ForegroundColor Green
        return $true
    } else {
        Write-Host "❌ $Description missing: $Path" -ForegroundColor Red
        $script:ErrorCount++
        return $false
    }
}

function Test-FileNotEmpty {
    param([string]$Path, [string]$Description)
    if ((Test-Path $Path) -and ((Get-Content $Path -Raw).Trim().Length -gt 0)) {
        Write-Host "✅ $Description is populated" -ForegroundColor Green
        return $true
    } else {
        Write-Host "❌ $Description is empty or missing: $Path" -ForegroundColor Red
        $script:ErrorCount++
        return $false
    }
}

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "FinSurf Configuration Validator" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan

# ── 1. Check required secrets ────────────────────────────────────────────────
Write-Host "📁 Checking secrets directory..." -ForegroundColor Yellow
$secretsDir = "$PSScriptRoot\secrets"

if (Test-FileExists $secretsDir "Secrets directory") {
    Test-FileNotEmpty "$secretsDir\gemini_api_key.txt" "GEMINI_API_KEY"
    Test-FileNotEmpty "$secretsDir\app_secret.txt" "APP_SECRET"

    # Optional keys
    if (Test-Path "$secretsDir\perplexity_api_key.txt") {
        Test-FileNotEmpty "$secretsDir\perplexity_api_key.txt" "PERPLEXITY_API_KEY (optional)"
    }
    if (Test-Path "$secretsDir\groq_api_key.txt") {
        Test-FileNotEmpty "$secretsDir\groq_api_key.txt" "GROQ_API_KEY (optional)"
    }
    if (Test-Path "$secretsDir\langchain_api_key.txt") {
        Test-FileNotEmpty "$secretsDir\langchain_api_key.txt" "LANGCHAIN_API_KEY (optional)"
    }
}

# ── 2. Check configuration files ──────────────────────────────────────────────
Write-Host "`n📋 Checking configuration files..." -ForegroundColor Yellow
Test-FileExists "$PSScriptRoot\.env.example" ".env.example template"
Test-FileExists "$PSScriptRoot\.env.nonsecret" ".env.nonsecret (production config)"
Test-FileExists "$PSScriptRoot\deploy\Dockerfile" "Dockerfile"
Test-FileExists "$PSScriptRoot\deploy\docker-compose.yml" "docker-compose.yml (dev)"
Test-FileExists "$PSScriptRoot\deploy\docker-compose.prod.yml" "docker-compose.prod.yml (production)"

# ── 3. Check Node.js and Python dependencies ──────────────────────────────────
Write-Host "`n📦 Checking dependencies..." -ForegroundColor Yellow

if (Test-Path "$PSScriptRoot\node_modules") {
    Write-Host "✅ node_modules exists" -ForegroundColor Green
} else {
    Write-Host "⚠️  node_modules missing — run: npm install" -ForegroundColor Yellow
    $ErrorCount++
}

if (Test-Path "$PSScriptRoot\requirements.txt") {
    Write-Host "✅ requirements.txt exists" -ForegroundColor Green
} else {
    Write-Host "❌ requirements.txt missing" -ForegroundColor Red
    $ErrorCount++
}

# ── 4. Check .env.nonsecret has required fields ───────────────────────────────
Write-Host "`n🔧 Validating .env.nonsecret..." -ForegroundColor Yellow
if (Test-Path "$PSScriptRoot\.env.nonsecret") {
    $envContent = Get-Content "$PSScriptRoot\.env.nonsecret" -Raw

    if ($envContent -match 'PORT=') {
        Write-Host "✅ PORT is set" -ForegroundColor Green
    } else {
        Write-Host "❌ PORT is missing in .env.nonsecret" -ForegroundColor Red
        $ErrorCount++
    }

    if ($envContent -match 'NODE_ENV=') {
        Write-Host "✅ NODE_ENV is set" -ForegroundColor Green
    } else {
        Write-Host "❌ NODE_ENV is missing in .env.nonsecret" -ForegroundColor Red
        $ErrorCount++
    }

    if ($envContent -match 'DOMAIN=(.+)') {
        $domain = $Matches[1].Trim()
        if ($domain) {
            Write-Host "✅ DOMAIN is set: $domain" -ForegroundColor Green
        } else {
            Write-Host "⚠️  DOMAIN is empty in .env.nonsecret (required for production)" -ForegroundColor Yellow
        }
    }
}

# ── 5. Check Docker Compose secret paths ──────────────────────────────────────
Write-Host "`n🐳 Validating Docker Compose configs..." -ForegroundColor Yellow

$composeContent = Get-Content "$PSScriptRoot\deploy\docker-compose.yml" -Raw
if ($composeContent -match 'GEMINI_API_KEY_FILE:\s*/run/secrets/') {
    Write-Host "✅ docker-compose.yml uses correct secret paths (/run/secrets/)" -ForegroundColor Green
} else {
    Write-Host "❌ docker-compose.yml has incorrect secret paths (should be /run/secrets/...)" -ForegroundColor Red
    $ErrorCount++
}

$composeProdContent = Get-Content "$PSScriptRoot\deploy\docker-compose.prod.yml" -Raw
if ($composeProdContent -match 'GEMINI_API_KEY_FILE:\s*/run/secrets/') {
    Write-Host "✅ docker-compose.prod.yml uses correct secret paths" -ForegroundColor Green
} else {
    Write-Host "❌ docker-compose.prod.yml has incorrect secret paths" -ForegroundColor Red
    $ErrorCount++
}

# ── 6. Summary ────────────────────────────────────────────────────────────────
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

if ($ErrorCount -eq 0) {
    Write-Host "✅ All checks passed! Configuration is valid." -ForegroundColor Green
    Write-Host "`nYou can now run:" -ForegroundColor Cyan
    Write-Host "  Development:  .\dev.ps1" -ForegroundColor White
    Write-Host "  Docker (dev): cd deploy; docker compose up" -ForegroundColor White
    Write-Host "  Production:   cd deploy; docker compose -f docker-compose.prod.yml up -d" -ForegroundColor White
    exit 0
} else {
    Write-Host "❌ Found $ErrorCount configuration issue(s). Please fix them before deploying." -ForegroundColor Red
    Write-Host "`nCommon fixes:" -ForegroundColor Yellow
    Write-Host "  - Create secrets/*.txt files with your API keys" -ForegroundColor White
    Write-Host "  - Run: npm install" -ForegroundColor White
    Write-Host "  - Copy .env.example to .env.nonsecret and fill in DOMAIN" -ForegroundColor White
    exit 1
}
