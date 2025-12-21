# PostgreSQL Database Setup Script for Civitron

Write-Host "Setting up Civitron database..." -ForegroundColor Cyan

# Find PostgreSQL installation
$psqlPath = Get-ChildItem "C:\Program Files\PostgreSQL" -Recurse -Filter "psql.exe" -ErrorAction SilentlyContinue | 
    Select-Object -First 1 -ExpandProperty FullName

if (-not $psqlPath) {
    Write-Host "ERROR: PostgreSQL not found" -ForegroundColor Red
    exit 1
}

Write-Host "Found PostgreSQL at: $psqlPath" -ForegroundColor Green

# Set password
$env:PGPASSWORD = "password"

# Drop existing database
Write-Host "Dropping existing database..." -ForegroundColor Yellow
& $psqlPath -U postgres -c "DROP DATABASE IF EXISTS civitron;" 2>&1 | Out-Null

# Create database
Write-Host "Creating civitron database..." -ForegroundColor Yellow
& $psqlPath -U postgres -c "CREATE DATABASE civitron;"

# Run schema
Write-Host "Running schema.sql..." -ForegroundColor Yellow
$schemaPath = Join-Path $PSScriptRoot "database\schema.sql"
& $psqlPath -U postgres -d civitron -f $schemaPath

# Verify
Write-Host "Verifying database..." -ForegroundColor Yellow
& $psqlPath -U postgres -d civitron -c "SELECT code, name FROM states LIMIT 5;"

Write-Host "Database setup complete!" -ForegroundColor Green
