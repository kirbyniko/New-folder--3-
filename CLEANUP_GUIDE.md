# Civitron File Organization & Cleanup Guide

## 🎯 ACTUAL DATA FLOW (What's Currently Used)

### Frontend → Backend Flow
```
User clicks state in UI
    ↓
src/App.tsx calls /.lib/functions/state-events?state=XX
    ↓
lib/functions/state-events.ts
    ↓
Checks ScraperRegistry for state
    ↓
Queries PostgreSQL database
    ↓
Returns events JSON to frontend
```

### Scheduled Scraper → Database Flow
```
Daily at 3 AM UTC
    ↓
lib/functions/scheduled-scraper.ts runs
    ↓
For each state:
    - Gets scraper from ScraperRegistry
    - Calls scraper.scrape()
    - Writes to PostgreSQL (utils/db/events.ts)
    - Exports to Netlify Blobs (cache)
    ↓
Database populated with fresh events
```

### Local Meetings Flow
```
User enters ZIP or clicks state
    ↓
src/App.tsx calls /.lib/functions/local-meetings?lat=X&lng=Y
    ↓
lib/functions/local-meetings.ts
    ↓
Checks nearby Legistar cities + custom scrapers
    ↓
Returns local government events
```

---

## ✅ KEEP - Core Production Files

### Main API Endpoints (PRODUCTION)
- `lib/functions/state-events.ts` - **MAIN STATE ENDPOINT** - serves state legislature events from DB
- `lib/functions/congress-meetings.ts` - Federal events from Congress.gov API
- `lib/functions/local-meetings.ts` - Local government events (Legistar + custom scrapers)
- `lib/functions/scheduled-scraper.ts` - **RUNS DAILY** - scrapes all states, writes to DB
- `lib/functions/top-events.ts` - Homepage "top 100" events endpoint
- `lib/functions/admin-events.ts` - Admin panel for event management

### Database Utilities (PRODUCTION)
- `lib/functions/utils/db/connection.ts` - PostgreSQL connection pool
- `lib/functions/utils/db/events.ts` - Insert/query events, bills, tags
- `lib/functions/utils/db/migrations/` - Database schema migrations

### Scrapers (PRODUCTION)
- `lib/functions/utils/scrapers/index.ts` - **SCRAPER REGISTRY** - registers all state scrapers
- `lib/functions/utils/scrapers/base-scraper.ts` - Base class for state scrapers
- `lib/functions/utils/scrapers/states/*.ts` - All state scrapers (50 files)
- `lib/functions/utils/scrapers/local/*.ts` - City scrapers (Montpelier, NYC, etc.)
- `lib/functions/utils/scrapers/puppeteer-helper.ts` - Shared Puppeteer utilities
- `lib/functions/utils/scrapers/scraper-registry.ts` - Registry management

### Supporting Utilities (PRODUCTION)
- `lib/functions/utils/congress-api.ts` - Congress.gov API client
- `lib/functions/utils/openstates-api.ts` - OpenStates API client
- `lib/functions/utils/legistar-cities.ts` - List of Legistar municipalities
- `lib/functions/utils/legistar.ts` - Legistar API client
- `lib/functions/utils/cache-manager.ts` - File-based caching system
- `lib/functions/utils/tagging.ts` - Auto-tag events by keywords
- `lib/functions/utils/security.ts` - XSS sanitization
- `lib/functions/utils/env-loader.ts` - Environment variable loading

---

## 🗑️ DELETE - Test & Development Files

### Test Scripts (DELETE - Only needed during development)
```
check-all-states-db.ts          ❌ DELETE - DB debugging tool
check-wyoming-in-db.ts          ❌ DELETE - DB debugging tool
test-quick-scrape.ts            ❌ DELETE - Dev testing script
test-wyoming-db-write.ts        ❌ DELETE - Dev testing script
test-wyoming-scraper-only.ts    ❌ DELETE - Dev testing script
test-wyoming-scraper.ts         ❌ DELETE - Dev testing script (original)
test-alabama-dataflow.ts        ❌ DELETE - Dev testing script
test-alabama-local.ts           ❌ DELETE - Dev testing script
test-boise-scraper.ts           ❌ DELETE - Dev testing script
test-delaware-scraper.ts        ❌ DELETE - Dev testing script
test-endpoint-simulation.ts     ❌ DELETE - Dev testing script
test-hawaii-scraper.ts          ❌ DELETE - Dev testing script
test-idaho-scraper.ts           ❌ DELETE - Dev testing script
test-illinois-scraper.ts        ❌ DELETE - Dev testing script
test-juneau-scraper.ts          ❌ DELETE - Dev testing script
test-local.ts                   ❌ DELETE - Dev testing script
test-louisiana-scraper.ts       ❌ DELETE - Dev testing script
test-maine-scraper.ts           ❌ DELETE - Dev testing script
test-massachusetts-scraper.ts   ❌ DELETE - Dev testing script
test-nebraska-scraper.ts        ❌ DELETE - Dev testing script
test-nevada-scraper.ts          ❌ DELETE - Dev testing script
test-new-mexico-scraper.ts      ❌ DELETE - Dev testing script
test-nh-bills.ts                ❌ DELETE - Dev testing script
test-nh-docket.ts               ❌ DELETE - Dev testing script
test-nh-scraper.ts              ❌ DELETE - Dev testing script
test-oklahoma-scraper.ts        ❌ DELETE - Dev testing script
test-scheduler.ts               ❌ DELETE - Dev testing script
test-utah-scraper.ts            ❌ DELETE - Dev testing script
test.ts                         ❌ DELETE - Generic test file
simple-test.ts                  ❌ DELETE - Dev testing script
debug-env.ts                    ❌ DELETE - Environment debugging tool
```

### Deprecated/Unused Endpoints (DELETE)
```
congress-cached.ts              ❌ DELETE - Replaced by congress-meetings.ts with caching
state-cached.ts                 ❌ DELETE - Replaced by state-events.ts with DB caching
state-events-stream.ts          ❌ DELETE - Streaming version, not used
regenerate-nevada.ts            ❌ DELETE - One-off script for Nevada data
trigger-scrape.ts               ❌ DELETE - Manual trigger, use scheduled-scraper.ts instead
db-maintenance.ts               ⚠️  REVIEW - May be useful for admin tasks
update-tags.ts                  ⚠️  REVIEW - May be useful for bulk tag updates
```

---

## 🗄️ STATIC JSON FILES - NOW DEPRECATED

Since we removed the static file bypass, these are **NO LONGER USED** by the backend:

```
public/data/alabama-events.json         ❌ DELETE - DB serves this now
public/data/alaska-events.json          ❌ DELETE - DB serves this now
public/data/arizona-events.json         ❌ DELETE - DB serves this now
public/data/arkansas-events.json        ❌ DELETE - DB serves this now
public/data/colorado-events.json        ❌ DELETE - DB serves this now
public/data/connecticut-events.json     ❌ DELETE - DB serves this now
public/data/delaware-events.json        ❌ DELETE - DB serves this now
public/data/hawaii-events.json          ❌ DELETE - DB serves this now
public/data/idaho-events.json           ❌ DELETE - DB serves this now
public/data/illinois-events.json        ❌ DELETE - DB serves this now
public/data/indiana-events.json         ❌ DELETE - DB serves this now
public/data/iowa-events.json            ❌ DELETE - DB serves this now
public/data/kansas-events.json          ❌ DELETE - DB serves this now
public/data/kentucky-events.json        ❌ DELETE - DB serves this now
public/data/louisiana-events.json       ❌ DELETE - DB serves this now
public/data/louisiana-events-new.json   ❌ DELETE - Backup file
public/data/louisiana-events.json.bak   ❌ DELETE - Backup file
public/data/maine-events.json           ❌ DELETE - DB serves this now
public/data/maryland-events.json        ❌ DELETE - DB serves this now
public/data/massachusetts-events.json   ❌ DELETE - DB serves this now
public/data/minnesota-events.json       ❌ DELETE - DB serves this now
public/data/mississippi-events.json     ❌ DELETE - DB serves this now
public/data/missouri-events.json        ❌ DELETE - DB serves this now
public/data/montana-events.json         ❌ DELETE - DB serves this now
public/data/nebraska-events.json        ❌ DELETE - DB serves this now
public/data/nevada-events.json          ❌ DELETE - DB serves this now
public/data/new-hampshire-events.json   ❌ DELETE - DB serves this now
public/data/new-mexico-events.json      ❌ DELETE - DB serves this now
public/data/oklahoma-events.json        ❌ DELETE - DB serves this now
public/data/oregon-events.json          ❌ DELETE - DB serves this now
public/data/southcarolina-events.json   ❌ DELETE - DB serves this now
public/data/tennessee-events.json       ❌ DELETE - DB serves this now
public/data/utah-events.json            ❌ DELETE - DB serves this now
public/data/virginia-events.json        ❌ DELETE - DB serves this now
public/data/wisconsin-events.json       ❌ DELETE - DB serves this now
public/data/wyoming-events.json         ❌ DELETE - DB serves this now
public/data/las-vegas-events.json       ⚠️  KEEP - Used by local meetings endpoint
```

---

## 📊 SUMMARY

### Files to DELETE: ~70+ files
- 30+ test scripts in `lib/functions/`
- 35+ static JSON files in `public/data/`
- 5+ deprecated endpoints

### Files to KEEP: ~100 files
- 3 main API endpoints (state-events, congress-meetings, local-meetings)
- 1 scheduled scraper
- 50+ state scrapers
- 15+ local scrapers
- Database utilities
- Supporting libraries

---

## 🚀 CURRENT ARCHITECTURE (After Cleanup)

```
Production Flow:
┌─────────────────┐
│   Frontend      │
│   (React)       │
└────────┬────────┘
         │
         ├─ GET /state-events?state=XX
         ├─ GET /congress-meetings
         └─ GET /local-meetings?lat=Y&lng=X
         │
         ↓
┌─────────────────────────┐
│  Netlify Functions      │
│  (API Endpoints)        │
└────────┬────────────────┘
         │
         ↓
┌─────────────────────────┐
│  PostgreSQL Database    │
│  (Single Source of      │
│   Truth)                │
└────────┬────────────────┘
         ↑
         │
┌────────┴────────────────┐
│  Scheduled Scraper      │
│  (Runs daily 3 AM UTC)  │
│  - Scrapes all states   │
│  - Writes to DB         │
│  - Exports to Blobs     │
└─────────────────────────┘
```

---

## ✅ ACTION ITEMS

1. **Delete test scripts** - All `test-*.ts` files in `lib/functions/`
2. **Delete static JSONs** - All files in `public/data/` except `las-vegas-events.json`
3. **Delete deprecated endpoints** - Old cached versions and one-off scripts
4. **Run scheduled scraper** - Populate database with fresh data
5. **Verify flow** - Test that frontend loads state events from DB

Would you like me to execute these deletions?
