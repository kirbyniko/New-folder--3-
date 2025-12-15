@echo off
REM Civitron Server Startup
REM Runs on ports: Frontend 5847, Netlify Functions 8947

echo ====================================
echo   Civitron Legislative Events
echo   Starting Development Server...
echo ====================================
echo.
echo Frontend: http://localhost:5847
echo Netlify Functions: http://localhost:8947
echo.

REM Kill any existing node processes
echo Cleaning up any existing node processes...
taskkill /F /IM node.exe 2>nul

echo.
echo Starting server...
echo.

REM Set environment variables for ports
set PORT=5847
set NETLIFY_DEV_PORT=8947

REM Start Netlify Dev with custom ports
npm run netlify:dev -- --port 5847 --functionsPort 8947

pause
