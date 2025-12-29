# Test the scraper API
Write-Host "Testing scraper execution..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod `
        -Uri "http://localhost:3001/api/scrapers/1/run" `
        -Method Post `
        -ContentType "application/json" `
        -Body '{"hybrid":true}' `
        -TimeoutSec 120
    
    Write-Host "`nResult:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 5
    
    Write-Host "`nTest completed successfully" -ForegroundColor Green
} catch {
    Write-Host "`nError: $($_.Exception.Message)" -ForegroundColor Red
}
