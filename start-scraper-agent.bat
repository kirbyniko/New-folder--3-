@echo off
title Scraper Agent - Starting All Servers
color 0A

echo ========================================
echo    SCRAPER AGENT - SERVER STARTUP
echo ========================================
echo.

REM Kill existing processes on required ports
echo [1/4] Cleaning up existing processes...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3002') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3003') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do taskkill /F /PID %%a >nul 2>&1
timeout /t 2 /nobreak >nul
echo    Done!
echo.

REM Start Execute Server (port 3002)
echo [2/4] Starting Execute Server (port 3002)...
cd /d "%~dp0scraper-backend"
start "Execute Server" cmd /k "color 0E && title Execute Server (3002) && npm run execute"
timeout /t 3 /nobreak >nul
echo    Done!
echo.

REM Start LangChain Agent Server (port 3003)
echo [3/4] Starting LangChain Agent (port 3003)...
start "LangChain Agent" cmd /k "color 0B && title LangChain Agent (3003) && npm run agent"
timeout /t 5 /nobreak >nul
echo    Done!
echo.

REM Start Vite Dev Server (port 5173)
echo [4/4] Starting Vite Frontend (port 5173)...
cd /d "%~dp0sdk-demo"
start "Vite Frontend" cmd /k "color 0D && title Vite Frontend (5173) && npm run dev"
timeout /t 4 /nobreak >nul
echo    Done!
echo.

REM Verify servers
echo ========================================
echo    VERIFYING SERVERS...
echo ========================================
timeout /t 3 /nobreak >nul

netstat -aon | findstr :3002 >nul
if %errorlevel%==0 (
    echo [OK] Execute Server - Port 3002 ONLINE
) else (
    echo [!!] Execute Server - Port 3002 FAILED
)

netstat -aon | findstr :3003 >nul
if %errorlevel%==0 (
    echo [OK] LangChain Agent - Port 3003 ONLINE
) else (
    echo [!!] LangChain Agent - Port 3003 FAILED
)

netstat -aon | findstr :5173 >nul
if %errorlevel%==0 (
    echo [OK] Vite Frontend - Port 5173 ONLINE
) else (
    echo [!!] Vite Frontend - Port 5173 FAILED
)

netstat -aon | findstr :11434 >nul
if %errorlevel%==0 (
    echo [OK] Ollama - Port 11434 ONLINE
) else (
    echo [!!] Ollama - Port 11434 NOT RUNNING
    echo      Run: ollama serve
)

echo.
echo ========================================
echo    ALL SYSTEMS READY!
echo ========================================
echo.
echo Open: http://localhost:5173
echo.
echo Press any key to open browser...
pause >nul
start http://localhost:5173
