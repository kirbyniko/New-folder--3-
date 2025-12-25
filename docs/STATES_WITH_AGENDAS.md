# States with PDF Agenda Support

## State Legislatures with docketUrl

Based on scraper analysis, the following states have PDF agendas available:

### States with Full PDF Support
1. **Arkansas** (AR) - PDF agendas with bill extraction
2. **Connecticut** (CT) - Direct PDF agenda links
3. **Hawaii** (HI) - Notice URLs with agendas
4. **Montana** (MT) - Event pages with agendas
5. **Nevada** (NV) - Agenda viewer URLs
6. **New Mexico** (NM) - Location URLs with agendas
7. **Utah** (UT) - Agenda URLs
8. **Wyoming** (WY) - Agenda URLs

### Local Governments with Agenda Support
- **Juneau, AK** - Weblink agendas
- **Las Vegas, NV** - Council agendas
- **Montpelier, VT** - PDF agendas
- **Oklahoma City, OK** - Meeting agendas  
- **Santa Fe, NM** - Event detail pages with agendas

## How the System Works

The extraction script **works for ALL states** that have `docket_url` populated:

```bash
# Extract ALL states
npx tsx scripts/extract-agendas.ts

# Extract specific state
npx tsx scripts/extract-agendas.ts --state=AR
npx tsx scripts/extract-agendas.ts --state=NV
npx tsx scripts/extract-agendas.ts --state=CT

# Test with limit
npx tsx scripts/extract-agendas.ts --limit=10
```

## Current Limitation

The D1 database currently has **0 events with docket URLs** because:
1. Scrapers write to Neon PostgreSQL (self-hosted backend)
2. Only 73 events were manually migrated to D1
3. Those events (6 AL, 16 CA, 51 PA) don't have docket_url fields

## Solution Options

### Option 1: Migrate More Data from Neon → D1
```bash
# Export events with docket URLs from Neon
npx tsx scripts/export-neon-data.ts --table=events --filter="docket_url IS NOT NULL"

# Import to D1
wrangler d1 execute civitracker-db --remote --file=exported-events.sql
```

### Option 2: Update Scrapers to Write to D1
- Modify scrapers to use D1 HTTP API or Wrangler
- Dual-write to both Neon and D1 during transition

### Option 3: Run Scrapers and Import Fresh Data
```bash
# 1. Run scrapers for states with PDF support
npm run scrape -- --states AR,CT,HI,MT,NV,NM,UT,WY

# 2. Export from Neon
npx tsx scripts/export-neon-data.ts

# 3. Import to D1
wrangler d1 execute civitracker-db --remote --file=database/d1-data-new.sql
```

## Testing the System

Once events with docket_url are in D1:

```bash
# 1. Extract PDF text
npx tsx scripts/extract-agendas.ts --state=AR --limit=5

# Expected output:
# 📄 Fetching PDF: https://arkansas.gov/agenda.pdf
# ✅ Extracted 2,456 characters from 3 pages
# ✅ Saved agenda (2456 chars)

# 2. Generate summaries
npx tsx scripts/summarize-agendas.ts --state=AR --model=gemma3:4b

# Expected output:
# 📋 Processing: Senate Judiciary Committee (AR)
# ✅ Summary: This meeting will discuss three major bills...
# ✅ Saved summary

# 3. View in frontend
# Navigate to https://civitracker.pages.dev
# Click "Data Viewer" → "📄 Agendas" tab
```

## Verifying State Support

To check which states have agendas in your database:

```bash
# Query D1
wrangler d1 execute civitracker-db --remote --command "
  SELECT state_code, COUNT(*) as events_with_agendas 
  FROM events 
  WHERE docket_url IS NOT NULL AND docket_url != '' 
  GROUP BY state_code 
  ORDER BY events_with_agendas DESC
"
```

## Summary

✅ **The system is multi-state capable** - works for any state with docket_url  
⚠️ **Current blocker**: No events with docket URLs in D1 yet  
🔄 **Next step**: Migrate events from Neon or run scrapers to populate D1
