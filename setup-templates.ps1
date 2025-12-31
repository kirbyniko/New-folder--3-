# Apply Scraper Templates Migration
# Run this to add the templates table and starter data to your database

Write-Host "🔧 Setting up Scraper Templates Database..." -ForegroundColor Cyan
Write-Host ""

# Check if wrangler is available
try {
    $wranglerVersion = npx wrangler --version 2>&1
    Write-Host "✅ Wrangler found: $wranglerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Wrangler not found. Please install: npm install -g wrangler" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📊 Applying migration to D1 database..." -ForegroundColor Yellow

# Execute the SQL file
npx wrangler d1 execute DB --file=database/scraper-templates.sql

Write-Host ""
Write-Host "✅ Migration complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Available templates:" -ForegroundColor Cyan
Write-Host "  • News Article (news-article)" -ForegroundColor White
Write-Host "  • E-commerce Product (product-listing)" -ForegroundColor White
Write-Host "  • Job Posting (job-posting)" -ForegroundColor White
Write-Host "  • Real Estate Listing (real-estate)" -ForegroundColor White
Write-Host "  • Event Details (event-listing)" -ForegroundColor White
Write-Host "  • Government Meeting (government-meeting)" -ForegroundColor White
Write-Host "  • Social Media Profile (social-profile)" -ForegroundColor White
Write-Host "  • Restaurant Menu (restaurant-menu)" -ForegroundColor White
Write-Host "  • Blog Post (blog-post)" -ForegroundColor White
Write-Host "  • Academic Paper (academic-paper)" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Templates are now available in your app!" -ForegroundColor Green
Write-Host "   Visit the Templates tab to see them." -ForegroundColor Gray
