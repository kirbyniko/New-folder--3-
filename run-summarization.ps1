# Run Bill Summarization with correct DATABASE_URL
Write-Host "🤖 Running Bill Summarization" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n"

# Set DATABASE_URL
$env:DATABASE_URL = "postgresql://neondb_owner:npg_j3RuDlkJep6n@ep-frosty-dream-adlutkdw-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

Write-Host "✅ DATABASE_URL set" -ForegroundColor Green
Write-Host "🤖 Using model: llama3.2:latest" -ForegroundColor Cyan
Write-Host "`nStarting summarization...`n" -ForegroundColor Yellow

# Run summarization
npx tsx scripts/summarize-bills.ts --model=llama3.2:latest

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Summarization complete!" -ForegroundColor Green
    
    # Verify results
    Write-Host "`n🔍 Verifying results..." -ForegroundColor Yellow
    node verify-summaries.mjs
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n🎉 Success! Check the Data Viewer:" -ForegroundColor Green
        Write-Host "https://9ecdec5e.civitracker.pages.dev" -ForegroundColor Cyan
    }
} else {
    Write-Host "❌ Summarization failed" -ForegroundColor Red
    Write-Host "Check the error messages above" -ForegroundColor Yellow
}
