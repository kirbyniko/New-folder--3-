@echo off
echo ======================================
echo Starting Scraper Platform API Server
echo ======================================
echo.
echo This server provides:
echo  - Script execution (port 3002)
echo  - Database storage (port 3001)
echo  - RAG memory persistence
echo.
echo Make sure PostgreSQL is running!
echo.
cd scraper-backend
npm run api
