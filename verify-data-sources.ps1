# Verify Data Sources are working for all states
Write-Host "Verifying Data Sources API..."
Write-Host ""

$testStates = @('AL', 'CA', 'TX', 'FL', 'NY', 'PA', 'ND', 'RI', 'VT', 'SD')
$successCount = 0
$failCount = 0

foreach ($state in $testStates) {
    try {
        $response = Invoke-WebRequest -Uri "https://civitracker.pages.dev/api/state-events?state=$state" -Method GET -UseBasicParsing
        
        if ($response.Headers['X-Calendar-Sources']) {
            $sources = $response.Headers['X-Calendar-Sources'] | ConvertFrom-Json
            Write-Host "Success $state - $($sources.Count) source(s)"
            $sources | ForEach-Object {
                Write-Host "     $($_.name)"
                Write-Host "        $($_.url)"
            }
            $successCount++
        } else {
            Write-Host "Warning $state - No sources header"
            $failCount++
        }
    } catch {
        Write-Host "Error $state - $($_.Exception.Message)"
        $failCount++
    }
    Write-Host ""
}

Write-Host ""
Write-Host "Summary:"
Write-Host "   Success: $successCount"
Write-Host "   Failed: $failCount"

if ($failCount -eq 0) {
    Write-Host ""
    Write-Host "All states working perfectly!"
} else {
    Write-Host ""
    Write-Host "Some states need attention"
}
