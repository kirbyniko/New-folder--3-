@echo off
REM Civitron Daily Scraper
REM Runs all state scrapers and populates production database

echo ================================
echo Civitron Daily Scraper
echo %date% %time%
echo ================================
echo.

cd /d "C:\Users\nikow\New folder (3)"

REM Run the scraper
echo Running scrapers...
npx tsx scripts/populate-db.ts

echo.
echo ================================
echo Scrape complete at %time%
echo ================================
