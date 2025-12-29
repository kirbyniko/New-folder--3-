# Scraper Platform Database Setup Script
# Run this to create and initialize the database

$ErrorActionPreference = "Stop"

Write-Host "🔧 Setting up Scraper Platform Database..." -ForegroundColor Cyan

# Set password
$env:PGPASSWORD = "password"

# Common PostgreSQL installation paths
$pgPaths = @(
    "C:\Program Files\PostgreSQL\16\bin",
    "C:\Program Files\PostgreSQL\15\bin",
    "C:\Program Files\PostgreSQL\14\bin",
    "C:\Program Files (x86)\PostgreSQL\16\bin",
    "C:\Program Files (x86)\PostgreSQL\15\bin"
)

$psqlPath = $null
foreach ($path in $pgPaths) {
    if (Test-Path (Join-Path $path "psql.exe")) {
        $psqlPath = Join-Path $path "psql.exe"
        break
    }
}

if (-not $psqlPath) {
    Write-Host "❌ PostgreSQL not found. Please install PostgreSQL or add it to PATH" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Found PostgreSQL at: $psqlPath" -ForegroundColor Green

# Create database
Write-Host "`n📦 Creating database 'scraper_platform'..." -ForegroundColor Yellow
try {
    & $psqlPath -h localhost -U postgres -c "DROP DATABASE IF EXISTS scraper_platform;" 2>$null
    & $psqlPath -h localhost -U postgres -c "CREATE DATABASE scraper_platform;"
    Write-Host "✅ Database created" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Database may already exist, continuing..." -ForegroundColor Yellow
}

# Apply schema
Write-Host "`n📋 Applying schema..." -ForegroundColor Yellow
$schemaPath = Join-Path $PSScriptRoot "schema.sql"
& $psqlPath -h localhost -U postgres -d scraper_platform -f $schemaPath

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Schema applied successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Schema application failed" -ForegroundColor Red
    exit 1
}

# Verify tables
Write-Host "`n🔍 Verifying tables..." -ForegroundColor Yellow
& $psqlPath -h localhost -U postgres -d scraper_platform -c "\dt" | Write-Host

Write-Host "`n✨ Setup complete!" -ForegroundColor Green
Write-Host "📊 Connection string: postgresql://postgres:password@localhost:5432/scraper_platform" -ForegroundColor Cyan
