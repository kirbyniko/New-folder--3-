#!/usr/bin/env pwsh
# DNS Propagation Test for civitron.imodernize.dev

$domain = "civitron.imodernize.dev"
$expectedTarget = "civitracker.pages.dev"

Write-Host ""
Write-Host "Testing $domain..." -ForegroundColor Cyan
Write-Host "================================================"
Write-Host ""

# Test 1: DNS Resolution
Write-Host "1. DNS CNAME Record:" -ForegroundColor Yellow
try {
    $dns = Resolve-DnsName $domain -Type CNAME -ErrorAction Stop
    if ($dns.NameHost -like "*$expectedTarget*") {
        Write-Host "   OK - Configured correctly!" -ForegroundColor Green
        Write-Host "   Points to: $($dns.NameHost)" -ForegroundColor Gray
    } else {
        Write-Host "   WARNING - Points to: $($dns.NameHost)" -ForegroundColor Yellow
        Write-Host "   Expected: $expectedTarget" -ForegroundColor Gray
    }
} catch {
    Write-Host "   NOT CONFIGURED YET" -ForegroundColor Red
    Write-Host "   Add CNAME: $domain -> $expectedTarget" -ForegroundColor Gray
    exit 1
}

Write-Host ""

# Test 2: HTTP Connection
Write-Host "2. HTTP Connection:" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest "https://$domain" -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
    Write-Host "   OK - Site accessible! Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    if ($_.Exception.Message -like "*SSL*" -or $_.Exception.Message -like "*certificate*") {
        Write-Host "   WAITING - DNS working, waiting for SSL certificate..." -ForegroundColor Yellow
        Write-Host "   This can take 1-5 minutes" -ForegroundColor Gray
    } else {
        Write-Host "   WAITING - Cloudflare still provisioning..." -ForegroundColor Yellow
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Gray
    }
}

Write-Host ""

# Test 3: API Endpoint
Write-Host "3. API Endpoint Test:" -ForegroundColor Yellow
try {
    $api = Invoke-RestMethod "https://$domain/api/top-events" -TimeoutSec 10 -ErrorAction Stop
    Write-Host "   OK - API working! Events: $($api.count)" -ForegroundColor Green
} catch {
    Write-Host "   WAITING - Waiting for full setup..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "================================================"
Write-Host "URL: https://$domain" -ForegroundColor Cyan
Write-Host ""
