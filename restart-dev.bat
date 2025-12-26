@echo off
echo Restarting development server...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM miniflare.exe 2>nul
ping 127.0.0.1 -n 3 >nul
echo Starting Cloudflare Pages local dev (Wrangler + Vite)...
start cmd /k "cd /d %~dp0 & reg add HKCU\Console /v QuickEdit /t REG_DWORD /d 0 /f >nul 2>&1 & wrangler pages dev dist --port 8788 --live-reload"
start cmd /k "cd /d %~dp0 & reg add HKCU\Console /v QuickEdit /t REG_DWORD /d 0 /f >nul 2>&1 & npm run dev"
echo.
echo Waiting for servers to initialize...
:wait_loop
ping 127.0.0.1 -n 2 >nul
powershell -Command "$ErrorActionPreference='SilentlyContinue'; try { $response = Invoke-WebRequest -Uri 'http://localhost:5341' -TimeoutSec 1 -UseBasicParsing; exit 0 } catch { exit 1 }" >nul 2>&1
if errorlevel 1 (
    echo Still waiting for Vite dev server...
    goto wait_loop
)
echo.
echo ✓ Development servers ready!
echo ✓ Frontend (Vite): http://localhost:5341
echo ✓ Backend (Wrangler): http://localhost:8788
echo.
timeout /t 2 /nobreak >nul
start http://localhost:5341
