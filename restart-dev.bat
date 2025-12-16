@echo off
echo ========================================
echo Civitron Dev Server Restart
echo ========================================
echo.

echo [1/3] Stopping all Node processes...
powershell -Command "Get-Process | Where-Object { $_.ProcessName -like '*node*' } | Stop-Process -Force -ErrorAction SilentlyContinue"
echo    ✓ Node processes stopped
powershell -Command "Start-Sleep -Seconds 3"

echo.
echo [2/3] Checking for stuck ports...
powershell -Command "$ports = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -in @(5341, 5342, 8888) }; if ($ports) { Write-Host '   ⚠ Ports still in use, waiting...'; Start-Sleep -Seconds 3 } else { Write-Host '   ✓ Ports clear' }"

echo.
echo [3/3] Starting Netlify Dev server...
echo    Server starting in new window...
echo    Wait 60 seconds for Edge Functions to initialize
echo    Then open: http://localhost:8888
echo.

start powershell -NoExit -Command "netlify dev"
