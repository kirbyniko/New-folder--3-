# Before vs After: Architecture Comparison

## BEFORE (Single Backend - Development Only)

```
┌────────────┐
│  Frontend  │
│  (React)   │
└─────┬──────┘
      │
      │ HTTP
      ▼
┌─────────────────────┐
│   Netlify Dev       │
│   Port 8888         │
│                     │
│ Functions:          │
│ • state-events      │◀─── SCRAPES LIVE (slow!)
│ • congress-meetings │◀─── SCRAPES LIVE (slow!)
│ • local-meetings    │◀─── SCRAPES LIVE (slow!)
│                     │
│ Optional:           │
│ PostgreSQL          │
│ (localhost)         │
└─────────────────────┘

❌ Problems:
• Every API call triggers scraping (30+ seconds!)
• Rate limits hit frequently
• Expensive if deployed to cloud
• Single point of failure
```

## AFTER (Split Backend - Production Ready)

```
┌────────────┐
│  Frontend  │
│  (React)   │
└─────┬──────┘
      │
      │ HTTP (fast!)
      ▼
┌─────────────────────┐         ┌──────────────────┐
│   API Backend       │────────▶│   PostgreSQL     │
│   (Netlify)         │  READ   │   (Cloud)        │
│                     │         │                  │
│ Functions:          │         │  Events cached   │
│ • state-events      │◀────────│  Updated daily   │
│ • congress-meetings │         │                  │
│ • local-meetings    │         └────────▲─────────┘
│                     │                  │
│ READ-ONLY           │                  │ WRITE
│ (sub-100ms)         │                  │ (daily)
└─────────────────────┘                  │
                              ┌──────────┴─────────┐
                              │ Scraper Backend    │
                              │ (Your PC)          │
                              │                    │
                              │ Runs every 24h     │
                              │ Scrapes all states │
                              └────────────────────┘

✅ Benefits:
• API responses < 100ms (just database reads)
• No rate limiting issues
• $0 hosting cost (scraping on your PC)
• Scalable to millions of users
• Reliable and maintainable
```

---

## Feature Comparison Table

| Feature | BEFORE (Dev Only) | AFTER (Production) |
|---------|-------------------|-------------------|
| **API Response Time** | 30+ seconds (scraping) | < 100ms (database) |
| **Cost (cloud hosting)** | $100-500/month | $0-20/month |
| **Scraping Frequency** | On every request | Every 24 hours |
| **Rate Limiting Issues** | Frequent | None |
| **Scalability** | Poor (scraping bottleneck) | Excellent (cached data) |
| **User Experience** | Slow, timeouts | Fast, reliable |
| **Data Freshness** | Real-time (but slow) | 24-hour cache |
| **Maintenance** | Complex (one codebase) | Simple (separated concerns) |
| **Development** | Easy (netlify dev) | Same! Still works locally |

---

## Code Location Changes

### BEFORE
```
netlify/functions/
├─ state-events.ts          ◀── Scrapes AND serves
├─ congress-meetings.ts     ◀── Scrapes AND serves
├─ local-meetings.ts        ◀── Scrapes AND serves
└─ scheduled-scraper.ts     ◀── Optional background job
```

### AFTER
```
netlify/functions/          ◀── API Backend (Cloud)
├─ state-events.ts             ✅ Reads from DB only
├─ congress-meetings.ts        ✅ Reads from DB only  
├─ local-meetings.ts           ✅ Reads from DB only
└─ [scheduled-scraper removed] ❌ Not needed in cloud

scraper-backend/            ◀── Scraper Backend (Your PC)
├─ src/
│  ├─ index.ts                 ✅ Cron scheduler
│  ├─ scraper.ts               ✅ Runs all scrapers
│  └─ db/
│     ├─ connection.ts         ✅ PostgreSQL pool
│     ├─ events.ts             ✅ Insert events
│     └─ maintenance.ts        ✅ Cleanup old data
└─ package.json
```

---

## Environment Variables

### BEFORE (Local Dev)
```bash
# .env (root directory)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=civitron
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
USE_POSTGRESQL=true
```

### AFTER (Production)

**Netlify (API Backend):**
```bash
# Netlify Dashboard → Environment Variables
POSTGRES_HOST=db.supabase.co          # Cloud database
POSTGRES_PORT=5432
POSTGRES_DB=civitron
POSTGRES_USER=postgres
POSTGRES_PASSWORD=secure-cloud-pass
USE_POSTGRESQL=true
CONGRESS_API_KEY=xxx
OPENSTATES_API_KEY=xxx
```

**Scraper Backend (Your PC):**
```bash
# scraper-backend/.env
POSTGRES_HOST=db.supabase.co          # Same cloud database
POSTGRES_PORT=5432
POSTGRES_DB=civitron
POSTGRES_USER=postgres
POSTGRES_PASSWORD=secure-cloud-pass
CONGRESS_API_KEY=xxx
OPENSTATES_API_KEY=xxx
SCRAPE_INTERVAL_HOURS=24
```

---

## Daily Operation

### BEFORE
```
User visits site
    ↓
Clicks "New Hampshire"
    ↓
API function triggered
    ↓
Scrapes NH website (30+ seconds)
    ↓
User gets timeout or waits forever
    ↓
😞 Bad experience
```

### AFTER
```
[3:00 AM - Automatic]
Scraper Backend wakes up
    ↓
Scrapes all 50 states (10 minutes)
    ↓
Writes to PostgreSQL
    ↓
Goes back to sleep

[Anytime - User request]
User visits site
    ↓
Clicks "New Hampshire"
    ↓
API reads from database (50ms)
    ↓
Returns cached events
    ↓
😊 Great experience!
```

---

## Migration Path

### Option 1: Keep Both (Recommended)

✅ **Local Development**: Use existing setup
- `npm run netlify:dev`
- Scrapers run live (slow but accurate)
- Uses localhost PostgreSQL

✅ **Production**: Use new split architecture
- Deploy API backend to Netlify
- Run scraper backend on your PC
- Uses cloud PostgreSQL

### Option 2: Production Only

If you don't need local development:
1. Deploy to production (cloud PostgreSQL + Netlify)
2. Run scraper backend on your PC
3. Use cloud URLs for testing

---

## What Stays the Same

✅ All scraper code (reused from netlify/functions/utils/scrapers/)
✅ Database schema (same tables, same structure)
✅ Frontend code (no changes needed)
✅ API endpoints (same URLs, same responses)
✅ Local development workflow (netlify dev still works)

## What Changes

🔄 Production deployment (now two backends instead of one)
🔄 Scraping schedule (daily instead of on-demand)
🔄 Database location (cloud instead of localhost)
🔄 Cost structure (free instead of expensive)

---

## Key Files to Review

1. **`QUICK_START_PRODUCTION.md`** - Quick overview (read this first!)
2. **`PRODUCTION_DEPLOYMENT.md`** - Complete setup guide
3. **`scraper-backend/README.md`** - Scraper backend docs
4. **`ARCHITECTURE.txt`** - Visual architecture diagram
5. **`database/schema.sql`** - Database structure

---

## Summary

**The main idea:** Split heavy scraping work (runs on your PC daily) from lightweight API work (runs in cloud 24/7).

**Result:** Fast, reliable, free hosting! 🚀
