@echo off
echo ========================================
echo Starting SDK Demo Servers
echo ========================================
echo.

REM Kill any existing processes on ports 5173 and 8788
echo [1/4] Cleaning up existing processes...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do (
    echo Killing process on port 5173 (PID: %%a)
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8788" ^| findstr "LISTENING"') do (
    echo Killing process on port 8788 (PID: %%a)
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 2 /nobreak >nul

echo.
echo [2/4] Starting Wrangler Pages Dev (API - Port 8788)...
cd /d "%~dp0.."
start "Wrangler API Server" cmd /k "npx wrangler pages dev public --port 8788 --binding D1=DB --d1 DB"
timeout /t 5 /nobreak >nul

echo.
echo [3/4] Starting Vite Dev Server (Frontend - Port 5173)...
cd /d "%~dp0"
start "Vite Dev Server" cmd /k "npm run dev"
timeout /t 3 /nobreak >nul

echo.
echo [4/4] Servers started!
echo ========================================
echo.
echo Frontend:  http://localhost:5173
echo API:       http://localhost:8788
echo.
echo Press any key to open browser...
pause >nul
start http://localhost:5173
echo.
echo Both servers are running in separate windows.
echo Close those windows to stop the servers.
echo.
pause
