# Running Scrapers on Your PC

## Quick Start

```powershell
# Navigate to project
cd "C:\Users\nikow\New folder (3)"

# Run all state scrapers (42 states)
npx tsx netlify/functions/scheduled-scraper.ts
```

This will:
1. Connect to your Neon PostgreSQL database
2. Scrape events from all 42 states with scrapers
3. Insert events into the database
4. Cloudflare Pages will serve this data instantly

## Run Specific State

```powershell
# Alabama only (with fixed live-stream URLs!)
npx tsx -e "
import { loadEnvFile } from './netlify/functions/utils/env-loader.js';
import { ScraperRegistry, initializeScrapers } from './netlify/functions/utils/scrapers/index.js';
import { insertEvent, insertBills } from './netlify/functions/utils/db/events.js';

loadEnvFile();
await initializeScrapers();

const scraper = ScraperRegistry.get('AL');
const events = await scraper.scrape();

console.log('Found', events.length, 'Alabama events');

for (const event of events) {
  await insertEvent(event);
  if (event.bills && event.bills.length > 0) {
    await insertBills(event.id, event.bills);
  }
}

console.log('✅ Alabama events saved to database!');
"
```

## Available State Scrapers (42 total)

Run any state by changing the code: `ScraperRegistry.get('XX')`

**States with scrapers:**
- AL (Alabama) - ✅ **Fixed with live-stream URLs!**
- CA (California)  
- PA (Pennsylvania)
- NY (New York)
- TX (Texas)
- FL (Florida)
- IL (Illinois)
- OH (Ohio)
- GA (Georgia)
- NC (North Carolina)
- MI (Michigan)
- VA (Virginia)
- WA (Washington)
- AZ (Arizona)
- MA (Massachusetts)
- TN (Tennessee)
- IN (Indiana)
- MO (Missouri)
- MD (Maryland)
- WI (Wisconsin)
- CO (Colorado)
- MN (Minnesota)
- SC (South Carolina)
- AL (Alabama)
- LA (Louisiana)
- KY (Kentucky)
- OR (Oregon)
- OK (Oklahoma)
- CT (Connecticut)
- UT (Utah)
- IA (Iowa)
- NV (Nevada)
- AR (Arkansas)
- MS (Mississippi)
- KS (Kansas)
- NM (New Mexico)
- NE (Nebraska)
- ID (Idaho)
- WV (West Virginia)
- HI (Hawaii)
- NH (New Hampshire)
- ME (Maine)
- RI (Rhode Island)

## Schedule Daily Scraping

### Option 1: Windows Task Scheduler

```powershell
# Create scheduled task
$action = New-ScheduledTaskAction `
  -Execute "npx" `
  -Argument "tsx netlify/functions/scheduled-scraper.ts" `
  -WorkingDirectory "C:\Users\nikow\New folder (3)"

$trigger = New-ScheduledTaskTrigger -Daily -At 3am

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable

Register-ScheduledTask `
  -TaskName "CiviTracker Scraper" `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Description "Scrapes legislative events daily"

# View task
Get-ScheduledTask -TaskName "CiviTracker Scraper"

# Run manually
Start-ScheduledTask -TaskName "CiviTracker Scraper"

# Remove task
Unregister-ScheduledTask -TaskName "CiviTracker Scraper" -Confirm:$false
```

### Option 2: Manual Runs

Just run when you need fresh data:

```powershell
# Quick run
cd "C:\Users\nikow\New folder (3)"
npx tsx netlify/functions/scheduled-scraper.ts
```

## Check Database After Scraping

```powershell
# Test that Alabama events are in database
$r = Invoke-WebRequest "https://68dfa82e.civitracker.pages.dev/api/state-events?state=AL" -UseBasicParsing
$events = $r.Content | ConvertFrom-Json
Write-Host "Alabama events: $($events.Count)"
$events[0] | ConvertTo-Json
```

## Troubleshooting

**Error: "Cannot find module"**
```powershell
npm install
```

**Error: "Database connection failed"**
Check your `.env` file has:
```
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/civitron?sslmode=require
OPENSTATES_API_KEY=your-key-here
```

**Error: "OPENSTATES_API_KEY not found"**
Get API key from: https://open.pluralpolicy.com/accounts/profile/

**Alabama events have wrong URLs**
The fix is embedded! Just run the scraper - it will use the correct live-stream URL pattern.

## Performance

- **Full scrape (42 states):** ~10-15 minutes
- **Single state:** ~10-30 seconds
- **Database insert:** Instant
- **Cloudflare serves data:** Instant worldwide

## What Gets Scraped

For each event:
- Event name & description
- Date & time
- Location (with lat/lng)
- Committee name
- Bills being discussed
- Live-stream URL (for Alabama!)
- Source URL
- Docket/agenda URL

## Alabama Live-Stream URLs

The Alabama scraper now constructs proper URLs like:
```
https://alison.legislature.state.al.us/live-stream?location=Room+617&meeting=%22-95%22
```

Instead of the old generic homepage URL. The meeting ID mappings are embedded in the scraper code!

## Next Steps

1. Run scraper to populate database
2. Check Cloudflare Pages serves the data
3. Set up Task Scheduler for daily runs
4. Your site has unlimited bandwidth worldwide!
