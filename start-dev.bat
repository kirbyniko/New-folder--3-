@echo off
REM Disable QuickEdit mode to prevent terminal pausing
reg add HKCU\Console /v QuickEdit /t REG_DWORD /d 0 /f >nul 2>&1
echo QuickEdit mode disabled - terminal won't pause on click anymore
echo.
echo Starting Netlify Dev server (frontend + backend)...
echo.
npm run netlify:dev
