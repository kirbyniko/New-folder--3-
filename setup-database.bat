@echo off
REM PostgreSQL Database Setup Script for Civitron

echo Setting up Civitron database...

REM Find PostgreSQL installation
set PSQL_PATH=
for /d %%G in ("C:\Program Files\PostgreSQL\*") do (
    if exist "%%G\bin\psql.exe" set PSQL_PATH=%%G\bin\psql.exe
)

if "%PSQL_PATH%"=="" (
    echo ERROR: PostgreSQL not found in C:\Program Files\PostgreSQL\
    echo Please ensure PostgreSQL is installed
    pause
    exit /b 1
)

echo Found PostgreSQL at: %PSQL_PATH%

REM Set password from environment
set PGPASSWORD=password

REM Drop existing database
echo Dropping existing database...
"%PSQL_PATH%" -U postgres -c "DROP DATABASE IF EXISTS civitron;"

REM Create database
echo Creating civitron database...
"%PSQL_PATH%" -U postgres -c "CREATE DATABASE civitron;"

REM Run schema
echo Running schema.sql...
"%PSQL_PATH%" -U postgres -d civitron -f database\schema.sql

REM Verify
echo.
echo Verifying database...
"%PSQL_PATH%" -U postgres -d civitron -c "SELECT code, name FROM states LIMIT 5;"

echo.
echo ✓ Database setup complete!
echo.
pause
