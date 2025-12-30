@echo off
echo.
echo ======================================
echo   Script Execution Server
echo ======================================
echo.
echo Starting server on port 3002...
echo.

cd /d "%~dp0"
call npm run execute

pause
