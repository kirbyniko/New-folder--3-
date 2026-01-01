@echo off
echo ========================================
echo    Starting SDK Demo Full Stack
echo ========================================
echo.

REM Kill any existing processes on our ports
echo [1/5] Cleaning up old processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3002') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3003') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173') do taskkill /F /PID %%a >nul 2>&1
timeout /t 1 /nobreak >nul

REM Start Ollama (if not running)
echo [2/5] Starting Ollama LLM...
tasklist /FI "IMAGENAME eq ollama.exe" 2>NUL | find /I /N "ollama.exe">NUL
if "%ERRORLEVEL%"=="1" (
    start "" /B ollama serve
    timeout /t 2 /nobreak >nul
)

REM Start Execute Server
echo [3/5] Starting Execute Server (port 3002)...
start "Execute Server" powershell -NoExit -Command "cd '%~dp0scraper-backend' ; Write-Host '🔧 Execute Server' -ForegroundColor Cyan ; npm run execute"
timeout /t 2 /nobreak >nul

REM Start LangChain Agent Server
echo [4/5] Starting LangChain Agent (port 3003)...
start "LangChain Agent" powershell -NoExit -Command "cd '%~dp0scraper-backend' ; Write-Host '🤖 LangChain Agent' -ForegroundColor Magenta ; npm run agent"
timeout /t 2 /nobreak >nul

REM Start Vite Frontend
echo [5/5] Starting Vite Frontend (port 5173)...
start "Vite Frontend" powershell -NoExit -Command "cd '%~dp0sdk-demo' ; Write-Host '⚡ Vite Frontend' -ForegroundColor Blue ; npm run dev"
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo    All Services Started!
echo ========================================
echo.
echo Frontend:        http://localhost:5173
echo LangChain Agent: http://localhost:3003
echo Execute Server:  http://localhost:3002
echo Ollama LLM:      http://localhost:11434
echo.
echo Press any key to open browser...
pause >nul
start http://localhost:5173
