@echo off
echo Restarting development server...
taskkill /F /IM node.exe 2>nul
ping 127.0.0.1 -n 3 >nul
echo Starting Netlify Dev server (frontend + backend)...
start cmd /k "cd /d %~dp0 & reg add HKCU\Console /v QuickEdit /t REG_DWORD /d 0 /f >nul 2>&1 & npm run netlify:dev"
echo.
echo Waiting for Netlify Dev to initialize (this takes ~10 seconds)...
:wait_loop
ping 127.0.0.1 -n 2 >nul
powershell -Command "$ErrorActionPreference='SilentlyContinue'; try { $response = Invoke-WebRequest -Uri 'http://localhost:8888' -TimeoutSec 1 -UseBasicParsing; exit 0 } catch { exit 1 }" >nul 2>&1
if errorlevel 1 (
    echo Still waiting for Netlify Dev...
    goto wait_loop
)
echo.
echo ✓ Netlify Dev is ready!
echo ✓ Frontend: http://localhost:5341
echo ✓ Backend: http://localhost:8888
echo.
timeout /t 2 /nobreak >nul
start http://localhost:5341
