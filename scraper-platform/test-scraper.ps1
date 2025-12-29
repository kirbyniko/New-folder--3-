try {
    Start-Sleep 3
    $response = Invoke-RestMethod `
        -Uri "http://localhost:3001/api/scrapers/1/run" `
        -Method Post `
        -ContentType "application/json" `
        -Body '{"hybrid":true}' `
        -TimeoutSec 120
    
    $response | ConvertTo-Json -Depth 10 | Out-File "test-result.json"
    "SUCCESS" | Out-File "test-status.txt"
} catch {
    $_.Exception.Message | Out-File "test-error.txt"
    "FAILED" | Out-File "test-status.txt"
}
