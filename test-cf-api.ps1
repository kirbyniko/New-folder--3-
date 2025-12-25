Write-Host "Testing API endpoints..." -ForegroundColor Cyan

try {
    $r1 = Invoke-WebRequest "https://civitracker.pages.dev/api/admin-events?limit=3" -UseBasicParsing -TimeoutSec 30
    $json1 = $r1.Content | ConvertFrom-Json
    Write-Host "Success! Events: $($json1.events.Count)" -ForegroundColor Green
} catch {
    Write-Host "admin-events failed" -ForegroundColor Red  
}

try {
    $r2 = Invoke-WebRequest "https://civitracker.pages.dev/api/state-events?state=CA" -UseBasicParsing -TimeoutSec 30
    $json2 = $r2.Content | ConvertFrom-Json
    Write-Host "Success! CA Events: $($json2.events.Count)" -ForegroundColor Green
} catch {
    Write-Host "state-events failed" -ForegroundColor Red
}
