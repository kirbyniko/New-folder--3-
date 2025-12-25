# Setup and Run Bill Summarization
# This script handles the complete workflow:
# 1. Checks Ollama
# 2. Applies migration (if needed)
# 3. Runs summarization
# 4. Verifies results

Write-Host "🤖 Bill Summarization Setup" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n"

# Step 1: Check Ollama
Write-Host "📋 Step 1: Checking Ollama..." -ForegroundColor Yellow
try {
    $ollamaResponse = Invoke-WebRequest "http://localhost:11434/api/tags" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    $ollamaData = $ollamaResponse.Content | ConvertFrom-Json
    $models = $ollamaData.models
    
    Write-Host "✅ Ollama is running" -ForegroundColor Green
    Write-Host "📦 Available models:" -ForegroundColor Cyan
    foreach ($model in $models) {
        Write-Host "  - $($model.name)" -ForegroundColor White
    }
    
    if ($models.Count -eq 0) {
        Write-Host "`n⚠️  No models found. Install one with:" -ForegroundColor Yellow
        Write-Host "ollama pull llama2" -ForegroundColor White
        Write-Host "`nOr visit: https://ollama.ai" -ForegroundColor Gray
        exit 1
    }
} catch {
    Write-Host "❌ Ollama is not running" -ForegroundColor Red
    Write-Host "`n📥 To install Ollama:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://ollama.ai" -ForegroundColor White
    Write-Host "2. Run: ollama pull llama2" -ForegroundColor White
    Write-Host "3. Ollama will start automatically" -ForegroundColor White
    exit 1
}

# Step 2: Apply Migration via Cloudflare Wrangler
Write-Host "`n📋 Step 2: Applying database migration..." -ForegroundColor Yellow
Write-Host "⚠️  Note: Migration requires correct DATABASE_URL in Cloudflare secrets" -ForegroundColor Gray

$migrationAttempt = Read-Host "`nWould you like to try applying the migration? (Y/N)"
if ($migrationAttempt -eq 'Y' -or $migrationAttempt -eq 'y') {
    Write-Host "`nRunning migration..." -ForegroundColor Cyan
    npx tsx scripts/migrate-bill-summaries.ts
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`n⚠️  Migration failed. You can:" -ForegroundColor Yellow
        Write-Host "1. Apply migration manually via Neon dashboard" -ForegroundColor White
        Write-Host "2. Or continue - the summarization script will fail gracefully" -ForegroundColor White
        
        $continue = Read-Host "`nContinue anyway? (Y/N)"
        if ($continue -ne 'Y' -and $continue -ne 'y') {
            exit 1
        }
    } else {
        Write-Host "✅ Migration successful" -ForegroundColor Green
    }
} else {
    Write-Host "⏭️  Skipping migration (run 'npx tsx scripts/migrate-bill-summaries.ts' later)" -ForegroundColor Gray
}

# Step 3: Run Summarization
Write-Host "`n📋 Step 3: Generating bill summaries..." -ForegroundColor Yellow

$stateFilter = Read-Host "Filter by state? (e.g., CA, PA, or leave empty for all)"
$modelChoice = Read-Host "Choose model? (e.g., llama2, llama3, or leave empty for llama2)"

$command = "npx tsx scripts/summarize-bills.ts"
if ($stateFilter) {
    $command += " --state=$stateFilter"
}
if ($modelChoice) {
    $command += " --model=$modelChoice"
}

Write-Host "`nRunning: $command" -ForegroundColor Cyan
Invoke-Expression $command

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Summarization failed" -ForegroundColor Red
    Write-Host "Check the error message above for details" -ForegroundColor Yellow
    exit 1
}

# Step 4: Verify Results
Write-Host "`n📋 Step 4: Verifying results..." -ForegroundColor Yellow

try {
    $apiUrl = "https://9ecdec5e.civitracker.pages.dev/api/admin-events?limit=10"
    Write-Host "Testing: $apiUrl" -ForegroundColor Gray
    
    $response = Invoke-RestMethod $apiUrl -TimeoutSec 30
    
    Write-Host "✅ Data Viewer API working!" -ForegroundColor Green
    Write-Host "  - Total events: $($response.pagination.total)" -ForegroundColor White
    Write-Host "  - Events with bills: $($response.stats.withBills)" -ForegroundColor White
    
    # Check if any bills have summaries
    $eventsWithSummaries = 0
    foreach ($event in $response.events) {
        if ($event.bills -and $event.bills.Count -gt 0) {
            foreach ($bill in $event.bills) {
                if ($bill.summary) {
                    $eventsWithSummaries++
                    break
                }
            }
        }
    }
    
    if ($eventsWithSummaries -gt 0) {
        Write-Host "  - Events with summarized bills: $eventsWithSummaries" -ForegroundColor Green
        Write-Host "`n✅ SUCCESS! Bill summaries are now visible in the Data Viewer!" -ForegroundColor Green
    } else {
        Write-Host "  - Events with summarized bills: 0" -ForegroundColor Yellow
        Write-Host "`n⚠️  No summaries found yet. This might be because:" -ForegroundColor Yellow
        Write-Host "  1. The bills haven't been scraped yet (run populate-db.ts)" -ForegroundColor White
        Write-Host "  2. The migration didn't apply" -ForegroundColor White
        Write-Host "  3. The state you chose doesn't have bills" -ForegroundColor White
    }
    
} catch {
    Write-Host "❌ Failed to verify: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🎉 Setup complete!" -ForegroundColor Green
Write-Host "`n📖 Next steps:" -ForegroundColor Yellow
Write-Host "  - Open Data Viewer: https://9ecdec5e.civitracker.pages.dev" -ForegroundColor White
Write-Host "  - View events with bills to see summaries" -ForegroundColor White
Write-Host "  - Run again with --force to regenerate all summaries" -ForegroundColor White
