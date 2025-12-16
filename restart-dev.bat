@echo off
echo ========================================
echo Civitron Dev Server Restart
echo ========================================
echo.

echo [1/4] Stopping all Node processes...
taskkill /F /IM node.exe 2>nul
if %errorlevel% equ 0 (
    echo    ✓ Node processes stopped
) else (
    echo    ℹ No Node processes found
)
timeout /t 3 /nobreak >nul

echo.
echo [2/4] Checking for stuck ports...
netstat -ano | findstr ":5341 :5342 :5343 :5344" >nul
if %errorlevel% equ 0 (
    echo    ⚠ Ports still in use, waiting...
    timeout /t 3 /nobreak >nul
)

echo.
echo [3/4] Starting Netlify Dev server...
echo    Starting server, please wait...
echo.

netlify dev
