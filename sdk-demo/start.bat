@echo off
echo ========================================
echo   Starting SDK Demo Development Server
echo ========================================
echo.

:: Check if node_modules exists
if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
    echo.
)

:: Kill any existing Vite servers on port 5173
echo Cleaning up existing servers...
powershell -Command "Get-Process | Where-Object { $_.ProcessName -eq 'node' } | Where-Object { (Get-NetTCPConnection -OwningProcess $_.Id -ErrorAction SilentlyContinue).LocalPort -eq 5173 } | Stop-Process -Force -ErrorAction SilentlyContinue"

:: Wait a moment for cleanup
powershell -Command "Start-Sleep -Seconds 1"

echo Starting Vite dev server...
echo.
echo Server will be available at: http://localhost:5173
echo Press Ctrl+C to stop the server
echo.

npm run dev
