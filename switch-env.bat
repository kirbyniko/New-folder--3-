@echo off
REM Quick switch between local dev and live setup

echo.
echo CiviTracker Environment Switcher
echo ================================
echo.
echo [1] Local Development (Cloudflare Pages + Wrangler)
echo [2] Local Testing (Netlify Dev - legacy)
echo [3] Live Production (civitracker.pages.dev)
echo.
set /p choice="Select environment (1-3): "

if "%choice%"=="1" goto cloudflare_local
if "%choice%"=="2" goto netlify_local
if "%choice%"=="3" goto production
goto invalid

:cloudflare_local
echo.
echo Setting up LOCAL CLOUDFLARE environment...
echo.
echo Killing existing processes...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM miniflare.exe 2>nul
ping 127.0.0.1 -n 2 >nul

echo Building for Pages...
call npm run build

echo.
echo Starting Wrangler Pages (port 8788) and Vite (port 5341)...
start "Wrangler Pages" cmd /k "wrangler pages dev dist --port 8788 --live-reload"
start "Vite Dev" cmd /k "npm run dev"

echo.
echo ✓ Local Cloudflare setup starting...
echo.
echo   Frontend: http://localhost:5341
echo   Backend:  http://localhost:8788
echo   Database: Neon PostgreSQL (live)
echo.
timeout /t 3 /nobreak >nul
start http://localhost:5341
goto end

:netlify_local
echo.
echo Setting up LOCAL NETLIFY environment...
echo.
echo Killing existing processes...
taskkill /F /IM node.exe 2>nul
ping 127.0.0.1 -n 2 >nul

echo.
echo Starting Netlify Dev...
start "Netlify Dev" cmd /k "netlify dev"

echo.
echo ✓ Local Netlify setup starting...
echo.
echo   Frontend: http://localhost:5341
echo   Backend:  http://localhost:8888
echo   Database: Neon PostgreSQL (live)
echo.
timeout /t 5 /nobreak >nul
start http://localhost:8888
goto end

:production
echo.
echo Production setup info:
echo.
echo   Frontend: https://civitracker.pages.dev
echo   Backend:  https://civitracker.pages.dev/api/*
echo   Database: Neon PostgreSQL
echo.
echo To deploy: git push origin main
echo.
echo Opening live site...
timeout /t 2 /nobreak >nul
start https://civitracker.pages.dev
goto end

:invalid
echo.
echo Invalid choice. Please run the script again.
goto end

:end
echo.
pause
