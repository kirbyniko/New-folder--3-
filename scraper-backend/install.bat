@echo off
echo Installing Scraper Backend Dependencies...
cd /d %~dp0
call npm install
echo.
echo ✅ Installation complete!
echo.
echo Next steps:
echo 1. Copy .env.example to .env
echo 2. Configure your cloud PostgreSQL connection in .env
echo 3. Run: npm test (to test database connection)
echo 4. Run: npm start (to start the scraper service)
pause
