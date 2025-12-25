@echo off
echo Running one-time scrape (no scheduler)...
cd /d %~dp0
call npm run scrape
pause
