# Test API headers
$response = Invoke-WebRequest -Uri "https://civitracker.pages.dev/api/state-events?state=ND" -Method GET -UseBasicParsing

Write-Host "Status: $($response.StatusCode)"
Write-Host "`nAll headers:"
$response.Headers.Keys | ForEach-Object {
    Write-Host "  $($_): $($response.Headers[$_])"
}

Write-Host "`nLooking for X-Calendar-Sources..."
if ($response.Headers['X-Calendar-Sources']) {
    Write-Host "✅ Found!"
    $sources = $response.Headers['X-Calendar-Sources'] | ConvertFrom-Json
    Write-Host "Sources: $($sources.Count)"
    $sources | Format-Table name, url
} else {
    Write-Host "⚠️ Not found"
}
