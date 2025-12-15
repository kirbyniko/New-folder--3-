# Test NH Bill Scraping
Write-Host "Testing New Hampshire Bill Scraping..." -ForegroundColor Cyan
Write-Host ""

# Find the server port
Write-Host "Looking for Netlify server..." -ForegroundColor Yellow
$port = $null
$testPorts = @(8888, 15336, 15402) + (16000..16100)

foreach ($testPort in $testPorts) {
    try {
        $result = Invoke-WebRequest -Uri "http://localhost:$testPort" -UseBasicParsing -TimeoutSec 1 -ErrorAction Stop
        $port = $testPort
        Write-Host "Found server on port $port" -ForegroundColor Green
        break
    }
    catch {
        # Port not responding, continue
    }
}

if (-not $port) {
    Write-Host "No Netlify server found!" -ForegroundColor Red
    Write-Host "Please start the server first with: npm run netlify:dev" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Fetching NH events from port $port..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "http://localhost:$port/.netlify/functions/state-events?state=NH" -TimeoutSec 180
    
    Write-Host ""
    Write-Host "Results:" -ForegroundColor Green
    Write-Host "  Total events: $($response.Count)"
    
    $withBills = @($response | Where-Object { $_.bills -and $_.bills.Count -gt 0 })
    Write-Host "  Events with bills: $($withBills.Count)" -ForegroundColor $(if ($withBills.Count -gt 0) { 'Green' } else { 'Red' })
    
    if ($withBills.Count -gt 0) {
        Write-Host ""
        Write-Host "SUCCESS! Bills were extracted" -ForegroundColor Green
        Write-Host ""
        Write-Host "First 3 events with bills:" -ForegroundColor Cyan
        
        $count = 0
        foreach ($event in $withBills) {
            if ($count -ge 3) { break }
            
            Write-Host ""
            Write-Host "  Event: $($event.name)" -ForegroundColor Yellow
            Write-Host "  Committee: $($event.committee)"
            Write-Host "  Docket URL: $($event.docketUrl)"
            Write-Host "  Bills: $($event.bills.Count) found"
            
            foreach ($bill in $event.bills) {
                Write-Host "    - $($bill.id): $($bill.title)" -ForegroundColor Cyan
            }
            
            $count++
        }
    }
    else {
        Write-Host ""
        Write-Host "No bills found. Checking first event..." -ForegroundColor Yellow
        
        if ($response.Count -gt 0) {
            $first = $response[0]
            Write-Host ""
            Write-Host "  Name: $($first.name)"
            Write-Host "  Committee: $($first.committee)"
            Write-Host "  Details URL: $($first.detailsUrl)"
            Write-Host "  Docket URL: $($first.docketUrl)"
            Write-Host "  Bills: $($first.bills)"
        }
    }
}
catch {
    Write-Host ""
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Stack trace:" -ForegroundColor Yellow
    Write-Host $_.ScriptStackTrace
}
