# Get DATABASE_URL from user and test it
Write-Host "🔗 Database URL Configuration" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n"

Write-Host "Please get your DATABASE_URL from one of these sources:" -ForegroundColor Yellow
Write-Host "`n1. Neon Dashboard (https://console.neon.tech):" -ForegroundColor White
Write-Host "   - Click on your project" -ForegroundColor Gray
Write-Host "   - Look for 'Connection string' on the dashboard" -ForegroundColor Gray
Write-Host "   - It should look like: postgresql://user:password@host/db?sslmode=require" -ForegroundColor Gray

Write-Host "`n2. Cloudflare Dashboard (https://dash.cloudflare.com):" -ForegroundColor White
Write-Host "   - Go to: Workers `& Pages -> civitracker -> Settings -> Variables" -ForegroundColor Gray
Write-Host "   - Click 'Edit' on DATABASE_URL to reveal the value" -ForegroundColor Gray

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan

$databaseUrl = Read-Host "Paste your DATABASE_URL here"

if (-not $databaseUrl) {
    Write-Host "❌ No URL provided" -ForegroundColor Red
    exit 1
}

# Test the connection
Write-Host "`n🧪 Testing connection..." -ForegroundColor Yellow

$testScript = @"
import { neon } from '@neondatabase/serverless';

async function test() {
  try {
    const sql = neon('$databaseUrl');
    const result = await sql\`SELECT COUNT(*) as count FROM events\`;
    console.log('✅ Connection successful!');
    console.log('📊 Events in database:', result[0].count);
    
    const bills = await sql\`SELECT COUNT(*) as count FROM bills\`;
    console.log('📋 Bills in database:', bills[0].count);
    
    // Check for summary columns
    const columns = await sql\`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'bills' 
      AND column_name IN ('summary', 'content_hash', 'last_summarized_at')
      ORDER BY column_name
    \`;
    
    console.log('\n📝 Summary columns:');
    if (columns.length === 0) {
      console.log('  ❌ Not found (migration needed)');
      process.exit(2);
    } else {
      columns.forEach(col => console.log('  ✅', col.column_name));
    }
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  }
}

test();
"@

$testScript | Out-File -FilePath "temp-test.mjs" -Encoding UTF8

node temp-test.mjs

$testResult = $LASTEXITCODE

Remove-Item "temp-test.mjs" -ErrorAction SilentlyContinue

if ($testResult -eq 0) {
    Write-Host "`n✅ Database connection works and migration is already applied!" -ForegroundColor Green
    
    $update = Read-Host "`nUpdate .env file with this DATABASE_URL? (Y/N)"
    if ($update -eq 'Y' -or $update -eq 'y') {
        # Update .env file
        $envContent = Get-Content .env -Raw
        $envContent = $envContent -replace 'DATABASE_URL=.*', "DATABASE_URL=$databaseUrl"
        $envContent | Set-Content .env -NoNewline
        Write-Host "✅ .env updated!" -ForegroundColor Green
    }
    
} elseif ($testResult -eq 2) {
    Write-Host "`n⚠️  Database connection works but migration is needed" -ForegroundColor Yellow
    
    $update = Read-Host "`nUpdate .env file with this DATABASE_URL? (Y/N)"
    if ($update -eq 'Y' -or $update -eq 'y') {
        # Update .env file
        $envContent = Get-Content .env -Raw
        $envContent = $envContent -replace 'DATABASE_URL=.*', "DATABASE_URL=$databaseUrl"
        $envContent | Set-Content .env -NoNewline
        Write-Host "✅ .env updated!" -ForegroundColor Green
        
        Write-Host "`nNext step: Run migration" -ForegroundColor Yellow
        Write-Host "npx tsx scripts/migrate-bill-summaries.ts" -ForegroundColor White
    }
    
} else {
    Write-Host "`n❌ Connection failed. Please check the URL and try again." -ForegroundColor Red
}
