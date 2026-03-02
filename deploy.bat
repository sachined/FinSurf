@echo off
REM ──────────────────────────────────────────────────────────────────────────────
REM Local deployment script for FinSurf with Docker Secrets (Windows)
REM
REM Usage:
REM   deploy.bat prod  - Deploy with docker-compose.prod.yml
REM   deploy.bat dev   - Deploy with docker-compose.yml (default)
REM ──────────────────────────────────────────────────────────────────────────────

setlocal enabledelayedexpansion

set DEPLOY_ENV=%1
if "%DEPLOY_ENV%"=="" set DEPLOY_ENV=dev

echo.
echo 🚀 Starting FinSurf deployment (environment: %DEPLOY_ENV%)...
echo.

REM ── Check prerequisites
where docker >nul 2>nul
if errorlevel 1 (
    echo ❌ Docker is not installed or not in PATH
    exit /b 1
)

REM ── Initialize Docker Swarm
echo 🔧 Initializing Docker Swarm...
docker swarm init >nul 2>&1
if errorlevel 1 (
    echo   (Swarm already initialized)
) else (
    echo   ✅ Docker Swarm initialized
)

REM ── Validate secret files
echo 📝 Checking for secret files...
for %%S in (gemini_api_key perplexity_api_key openai_api_key anthropic_api_key app_secret) do (
    if not exist "secrets\%%S.txt" (
        echo ❌ Missing secrets\%%S.txt
        echo    See SECRETS_SETUP.md for setup instructions
        exit /b 1
    )
)

REM ── Create Docker Secrets
echo 📋 Creating Docker Secrets...
for %%S in (gemini_api_key perplexity_api_key openai_api_key anthropic_api_key app_secret) do (
    docker secret rm %%S >nul 2>&1
    for /f "delims=" %%L in (secrets\%%S.txt) do (
        echo %%L | docker secret create %%S -
    )
    echo    ✅ Created secret: %%S
)

REM ── Read APP_SECRET for build arg
for /f "delims=" %%A in (secrets\app_secret.txt) do set APP_SECRET=%%A

REM ── Build and deploy
echo 🐳 Building and deploying...
if "%DEPLOY_ENV%"=="prod" (
    echo    Deploying with docker-compose.prod.yml (with Caddy)...
    docker compose -f docker-compose.prod.yml down >nul 2>&1
    docker compose -f docker-compose.prod.yml build --build-arg VITE_APP_SECRET=!APP_SECRET! --no-cache
    docker compose -f docker-compose.prod.yml up -d
) else (
    echo    Deploying with docker-compose.yml...
    docker compose down >nul 2>&1
    docker compose build --build-arg VITE_APP_SECRET=!APP_SECRET! --no-cache
    docker compose up -d
)

REM ── Wait for health check
echo ⏳ Waiting for application to be healthy...
setlocal enabledelayedexpansion
for /l %%I in (1,1,30) do (
    docker compose ps | findstr "healthy" >nul 2>&1
    if errorlevel 0 (
        echo ✅ Application is healthy
        goto :healthy
    )
    timeout /t 2 /nobreak >nul
)
echo ❌ Application failed to become healthy
docker compose logs
exit /b 1

:healthy
REM ── Clean up
echo 🧹 Cleaning up unused Docker resources...
docker system prune -f >nul 2>&1

REM ── Show status
echo.
echo ✅ Deployment completed successfully!
echo.
echo 📊 Current containers:
docker compose ps
echo.
if "%DEPLOY_ENV%"=="prod" (
    echo 🌐 Application: https://^(check your DOMAIN env var^)
) else (
    echo 🌐 Application: http://localhost:3000
)
echo.
