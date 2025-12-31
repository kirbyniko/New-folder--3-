@echo off
echo ===================================
echo Starting BOTH Backend Servers
echo ===================================
echo.
echo This will start:
echo  - API Server (port 3001) - Database storage
echo  - Execute Server (port 3002) - Script execution
echo.

cd scraper-backend

echo Starting API Server (port 3001)...
start "API Server (port 3001)" cmd /k "npm run api"

timeout /t 2 /nobreak >nul

echo Starting Execute Server (port 3002)...
start "Execute Server (port 3002)" cmd /k "npm run execute"

echo.
echo ===================================
echo Both servers started!
echo ===================================
echo  - API Server: http://localhost:3001
echo  - Execute Server: http://localhost:3002
echo.
echo Close this window or press any key to exit...
pause >nul
