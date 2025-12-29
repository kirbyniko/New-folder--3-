@echo off
echo Starting Scraper Platform...
echo.

:: Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    echo.
)

:: Start the server
echo Starting server on http://localhost:3001
echo Press Ctrl+C to stop
echo.
npm run dev
