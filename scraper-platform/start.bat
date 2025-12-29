@echo off
title Scraper Platform Server
color 0A

echo.
echo ============================================================
echo      SCRAPER PLATFORM - Universal Web Scraping Engine
echo ============================================================
echo.
echo  Dashboard: http://localhost:3001
echo  Status: Starting...
echo.
echo  Features:
echo   - Run scrapers (hybrid: generic engine + LLM fallback)
echo   - View execution details in real-time
echo   - See generated scripts and HTML snapshots
echo   - Export data and logs
echo.
echo ============================================================
echo.

:: Check if node_modules exists
if not exist "node_modules" (
    echo [SETUP] Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo.
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
    echo.
)

:: Kill any existing server on port 3001
echo [CLEANUP] Checking for existing server on port 3001...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001 ^| findstr LISTENING') do (
    echo [CLEANUP] Killing process %%a
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo [SERVER] Starting on http://localhost:3001
echo [INFO] Press Ctrl+C to stop the server
echo.
echo ============================================================
echo [LOGS]
echo.

npx tsx src/server.ts

if errorlevel 1 (
    echo.
    echo ============================================================
    echo ERROR: Server crashed or failed to start
    echo ============================================================
    echo.
)

pause
