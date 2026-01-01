# Scraper Agent - Start All Servers
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   SCRAPER AGENT - SERVER STARTUP" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

# Step 1: Kill existing processes
Write-Host "[1/4] Cleaning up existing processes..." -ForegroundColor Yellow
Get-Process | Where-Object { 
  (Get-NetTCPConnection -OwningProcess $_.Id -ErrorAction SilentlyContinue).LocalPort -in @(3002, 3003, 5173) 
} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "   ✅ Done!`n" -ForegroundColor Green

# Step 2: Start Execute Server
Write-Host "[2/4] Starting Execute Server (port 3002)..." -ForegroundColor Yellow
$executePath = Join-Path $PSScriptRoot "scraper-backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$executePath' ; `$host.ui.RawUI.WindowTitle='Execute Server (3002)' ; npm run execute"
Start-Sleep -Seconds 3
Write-Host "   ✅ Done!`n" -ForegroundColor Green

# Step 3: Start LangChain Agent
Write-Host "[3/4] Starting LangChain Agent (port 3003)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$executePath' ; `$host.ui.RawUI.WindowTitle='LangChain Agent (3003)' ; npm run agent"
Start-Sleep -Seconds 5
Write-Host "   ✅ Done!`n" -ForegroundColor Green

# Step 4: Start Vite Frontend
Write-Host "[4/4] Starting Vite Frontend (port 5173)..." -ForegroundColor Yellow
$vitePath = Join-Path $PSScriptRoot "sdk-demo"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$vitePath' ; `$host.ui.RawUI.WindowTitle='Vite Frontend (5173)' ; npm run dev"
Start-Sleep -Seconds 4
Write-Host "   ✅ Done!`n" -ForegroundColor Green

# Verify servers
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   VERIFYING SERVERS..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Start-Sleep -Seconds 3

$ports = @(
    @{Port=3002; Name="Execute Server"},
    @{Port=3003; Name="LangChain Agent"},
    @{Port=5173; Name="Vite Frontend"},
    @{Port=11434; Name="Ollama"}
)

foreach ($service in $ports) {
    $conn = Get-NetTCPConnection -LocalPort $service.Port -State Listen -ErrorAction SilentlyContinue
    if ($conn) {
        Write-Host "[✅] $($service.Name) - Port $($service.Port) ONLINE" -ForegroundColor Green
    } else {
        Write-Host "[❌] $($service.Name) - Port $($service.Port) OFFLINE" -ForegroundColor Red
        if ($service.Port -eq 11434) {
            Write-Host "     Run: ollama serve" -ForegroundColor Yellow
        }
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   ALL SYSTEMS READY!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan
Write-Host "🚀 Open: http://localhost:5173`n" -ForegroundColor Cyan

# Open browser
Start-Sleep -Seconds 2
Start-Process "http://localhost:5173"
