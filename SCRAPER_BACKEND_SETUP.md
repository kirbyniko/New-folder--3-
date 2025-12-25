# Scraper Backend Setup Guide

## ✅ What's Done

- [x] Scraper backend tested and working
- [x] Connection to production Neon database verified
- [x] 70 events successfully inserted (CA: 19, PA: 51)
- [x] Scripts created for daily scraping

## 📋 Architecture Summary

```
┌─────────────────────────┐
│  YOUR PC (Windows)      │
│  Scraper Backend        │  Runs daily at 3 AM
│                         │
│  • 42 state scrapers    │
│  • Local city scrapers  │
│  • Connects to Neon DB  │
└───────────┬─────────────┘
            │
            │ SSL Connection
            │ Port 5432
            ▼
  ┌─────────────────────┐
  │   Neon PostgreSQL   │
  │  (Cloud Database)   │  ep-frosty-dream-adlutkdw...
  └──────────┬──────────┘
             │
             │ SQL Queries
             ▼
  ┌─────────────────────┐
  │  Netlify Functions  │
  │   (API Backend)     │  9 serverless functions
  └──────────┬──────────┘
             │
             │ HTTPS Requests
             ▼
  ┌─────────────────────┐
  │   Frontend (CDN)    │
  │ civitracker.        │  Users access
  │ netlify.app         │
  └─────────────────────┘
```

## 🚀 Next Steps: Schedule Daily Scraping

### Option 1: Windows Task Scheduler (Recommended)

1. **Open Task Scheduler**
   - Press `Win + R`
   - Type `taskschd.msc`
   - Press Enter

2. **Create New Task**
   - Click "Create Basic Task" in the right panel
   - Name: `Civitron Daily Scraper`
   - Description: `Scrapes legislative events and updates production database`

3. **Set Trigger**
   - Choose "Daily"
   - Start time: `3:00 AM`
   - Recur every: `1 days`

4. **Set Action**
   - Choose "Start a program"
   - Program/script: `C:\Users\nikow\New folder (3)\run-daily-scraper.bat`
   - Start in: `C:\Users\nikow\New folder (3)`

5. **Configure Settings**
   - ✅ Run whether user is logged on or not
   - ✅ Run with highest privileges
   - ✅ Wake the computer to run this task (optional)

6. **Save and Test**
   - Click "Finish"
   - Right-click the task → "Run" to test immediately

### Option 2: Keep Terminal Open (Simple but requires PC to stay on)

```powershell
# Run this in a PowerShell window and keep it open
cd "C:\Users\nikow\New folder (3)"
while ($true) {
    $now = Get-Date
    $next3AM = Get-Date -Hour 3 -Minute 0 -Second 0
    if ($now -gt $next3AM) {
        $next3AM = $next3AM.AddDays(1)
    }
    
    $waitTime = ($next3AM - $now).TotalSeconds
    Write-Host "Next scrape at $next3AM (in $([math]::Round($waitTime/60)) minutes)"
    
    Start-Sleep -Seconds $waitTime
    Write-Host "Starting daily scrape..."
    npx tsx scripts/populate-db.ts
}
```

### Option 3: Manual Run (For testing)

```powershell
cd "C:\Users\nikow\New folder (3)"
npx tsx scripts/populate-db.ts
```

## 📊 Monitoring

### Check Scraper Logs

The scraper outputs detailed logs:
- ✅ States scraped successfully
- ⚠️ States with no events
- ❌ States that failed

### Check Production Database

```powershell
npx tsx scripts/test-production-connection.ts
```

This shows:
- Total events in database
- Events per state
- Last scrape time for each state

### Check Website

Visit https://civitracker.netlify.app and search for events in:
- California (should have 19+ events)
- Pennsylvania (should have 51+ events)
- Other states (will populate after first full scrape)

## 🔧 Troubleshooting

### Scraper Not Running

1. Check Task Scheduler is enabled
2. Verify batch file path is correct
3. Check Windows Event Viewer for errors

### No New Events

1. Run test script: `npx tsx scripts/quick-scrape.ts`
2. Check if scrapers are finding events
3. Some states may have no upcoming events (legislature not in session)

### Database Connection Fails

1. Check internet connection
2. Verify `.env` file has correct Neon credentials
3. Check firewall allows outbound port 5432

## 📝 Files Created

- `scripts/test-production-connection.ts` - Test database connection
- `scripts/quick-scrape.ts` - Quick test with 5 states
- `scripts/populate-db.ts` - Full scraper (all 42 states)
- `scripts/check-schema.ts` - Verify database schema
- `run-daily-scraper.bat` - Windows batch file for scheduling

## 🎯 What Happens Daily

1. **3:00 AM**: Task Scheduler triggers
2. **Scraper runs**: Connects to Neon database
3. **Scrapes 42 states**: Fetches latest events from state legislature websites
4. **Inserts events**: Updates production database with new/updated events
5. **Cleans old events**: Removes events older than 24 hours
6. **Logs results**: Shows which states succeeded/failed

## ✅ Success Metrics

After first full run, you should have:
- **500-2000 events** in database (varies by legislative session)
- **30-40 states** with active events
- **Fresh data** less than 24 hours old
- **Website** showing events when users search

## 🎉 You're Done!

Your scraper backend is ready! The architecture is:
- **Frontend**: Netlify (free, fast CDN)
- **API**: Netlify Functions (free, serverless)
- **Database**: Neon PostgreSQL (free, managed)
- **Scraper**: Your PC (free, scheduled)

**Total Cost: $0/month** 🎉
