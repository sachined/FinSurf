$USER = "root"
$IP   = "144.126.215.49"

Write-Host "--- Syncing Production Tracking Data ---" -ForegroundColor Cyan

# Step 1: Export from Container
ssh "${USER}@${IP}" "docker exec \$(docker ps -q -f name=finsurf) cat /app/data/finsurf_telemetry.db > /tmp/telemetry.db"

# Step 2: Download
scp "${USER}@${IP}:/tmp/telemetry.db" "./finsurf_telemetry_prod.db"

# Step 3: View
Write-Host "--- Viewing Synced History ---" -ForegroundColor Green
$env:TELEMETRY_DB = "./finsurf_telemetry_prod.db"
npm run view-tracking