@echo off
echo ========================================
echo  RESTARTING LOCAL BACKEND
echo ========================================
echo.

REM Kill any running Netlify Dev processes
echo Stopping existing backend processes...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM netlify.exe 2>nul
timeout /t 2 /nobreak >nul

REM Check if PostgreSQL is running
echo Checking PostgreSQL...
pg_isready -h localhost -p 5432 >nul 2>&1
if %errorlevel% neq 0 (
    echo PostgreSQL not running. Starting...
    net start postgresql-x64-16
    timeout /t 3 /nobreak >nul
)

echo.
echo ========================================
echo  STARTING BACKEND
echo ========================================
echo.

REM Start Netlify Dev
start "Civitron Backend" cmd /k "npm run netlify:dev"

echo.
echo Backend starting in new window...
echo Wait 10 seconds before making requests.
echo.
pause
