@echo off
echo ============================================
echo  Civitron Backend - Test Deployment
echo ============================================
echo.

REM Check if PostgreSQL is running
echo [1/4] Checking PostgreSQL...
sc query postgresql-x64-16 | find "RUNNING" >nul
if errorlevel 1 (
    echo PostgreSQL not running, starting...
    net start postgresql-x64-16
) else (
    echo PostgreSQL already running
)

echo.
echo [2/4] Starting Netlify Dev (Backend Functions)...
start "Civitron Backend" cmd /k "npm run netlify:dev"

REM Wait for backend to start
echo Waiting for backend to start...
timeout /t 10 /nobreak >nul

echo.
echo [3/4] Starting Cloudflare Tunnel...
echo.
echo ============================================
echo  COPY THE URL BELOW FOR YOUR GITHUB SECRET
echo ============================================
echo.

cloudflared tunnel --url http://localhost:8888

REM This keeps running until Ctrl+C
echo.
echo Tunnel stopped. Press any key to exit...
pause >nul
