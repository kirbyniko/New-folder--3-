# Civitron Scraper Backend

## Overview

This is the **Scraper Backend** - a standalone Node.js service that runs on your local PC and handles all legislative data scraping operations.

### Architecture

```
┌─────────────────┐
│   Frontend      │
│   (React)       │
└────────┬────────┘
         │
         │ API Requests
         ▼
┌─────────────────┐
│  API Backend    │──────┐
│  (Netlify)      │      │
│  READ-ONLY      │      │ Read
└─────────────────┘      │
                         ▼
                  ┌─────────────────┐
                  │   PostgreSQL    │
                  │   (Cloud)       │
                  └─────────────────┘
                         ▲
                         │ Write
┌─────────────────┐      │
│ Scraper Backend │──────┘
│ (Your PC)       │
│ Runs every 24h  │
└─────────────────┘
```

## Features

- ✅ Scrapes all 50 states + DC legislative websites
- ✅ Runs on a 24-hour schedule (configurable)
- ✅ Writes directly to PostgreSQL database
- ✅ Batch processing with rate limiting
- ✅ Automatic cleanup of old events
- ✅ Health monitoring and error logging
- ✅ Runs immediately on startup, then schedules recurring runs

## Setup

### 1. Install Dependencies

```bash
npm install
# or use the provided batch file:
install.bat
```

### 2. Configure Environment

Copy `.env.example` to `.env` and configure:

```env
# Cloud PostgreSQL Connection
POSTGRES_HOST=your-cloud-postgres.com
POSTGRES_PORT=5432
POSTGRES_DB=civitron
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-password

# API Keys
CONGRESS_API_KEY=your-key
OPENSTATES_API_KEY=your-key

# Optional
SCRAPE_INTERVAL_HOURS=24
```

**Important:** The PostgreSQL database must be:
- Hosted in the cloud (accessible from both your PC and Netlify)
- Using the same schema as defined in `/database/schema.sql`

### 3. Test Connection

```bash
npm test
```

This verifies your PostgreSQL connection is working.

### 4. Run the Scraper Backend

#### Option A: With Scheduler (Recommended)

```bash
npm start
```

This will:
1. Run scrapers immediately
2. Schedule them to run every 24 hours at 3:00 AM
3. Keep running in the background

#### Option B: One-Time Run

```bash
npm run scrape
```

Runs scrapers once and exits.

## Usage

### Starting on Windows

Double-click `start.bat` or run:

```bash
npm start
```

The service will:
- Test database connection
- Run all scrapers immediately
- Schedule recurring runs every 24 hours
- Log all activity to console

### Stopping

Press `Ctrl+C` in the terminal.

### Running as Windows Service

For production, you can run this as a Windows Service using tools like:
- [node-windows](https://www.npmjs.com/package/node-windows)
- Windows Task Scheduler
- PM2 with pm2-windows-service

## Configuration

### Scrape Interval

Default: Every 24 hours at 3:00 AM

Modify in `.env`:
```env
SCRAPE_INTERVAL_HOURS=24
```

Or edit `src/index.ts` cron schedule directly.

### Batch Size

Default: 5 states at a time

Modify in `src/scraper.ts`:
```typescript
const batchSize = 5;
```

## Database

### Required Tables

The scraper backend requires these PostgreSQL tables:
- `events` - Stores legislative events
- `bills` - Stores bills associated with events
- `scraper_health` - Logs scraper run status

See `/database/schema.sql` for full schema.

### Data Flow

1. Scraper backend scrapes websites → PostgreSQL
2. API backend (Netlify) reads from PostgreSQL → Frontend
3. Old events (>24h) automatically cleaned up on each run

## Monitoring

### Console Logs

All scraper activity is logged:
```
🚀 SCRAPER RUN STARTED: 2025-12-24T03:00:00.000Z
🧹 Cleaning up old events...
📦 Batch 1/10: AL, AK, AZ, AR, CA
🔄 CA: Scraping...
✅ CA: 19 events inserted (2341ms)
...
✅ SCRAPER RUN COMPLETED
   Duration: 45.2s
   Total Events Inserted: 234
```

### Database Health Logs

Check `scraper_health` table:
```sql
SELECT * FROM scraper_health 
WHERE scraped_at > NOW() - INTERVAL '24 hours'
ORDER BY scraped_at DESC;
```

## Troubleshooting

### Connection Refused

- Check PostgreSQL host is accessible from your PC
- Verify firewall rules allow outbound connection
- Ensure PostgreSQL accepts remote connections

### Scraper Failures

- Individual state failures won't stop the entire run
- Check `scraper_health` table for error details
- Some states may not have active sessions (expected)

### Memory Issues

If scraping all states causes memory issues:
- Reduce `batchSize` in `src/scraper.ts`
- Increase delay between batches

## Production Deployment

### Your Local PC

1. Install Node.js 20+
2. Clone this directory
3. Configure `.env` with cloud PostgreSQL
4. Run `npm install`
5. Run `npm start`
6. Keep the terminal running (or use Windows Service)

### Cloud PostgreSQL

You need a cloud-hosted PostgreSQL that accepts connections from:
- Your local PC (scraper backend)
- Netlify (API backend)

Recommended Options (Pay-As-You-Go):
- **Neon** (🏆 Best: ~$0.10/GB/month, free 0.5GB tier) - Recommended
- **Railway** (~$15/month for always-on, $5 trial credit)
- **DigitalOcean** ($15/month fixed for 1GB/10GB storage)
- **AWS RDS** (db.t4g.micro ~$15/month, complex setup)

### Security

- Keep `.env` file private (it's in `.gitignore`)
- Use strong PostgreSQL password
- Consider VPN for scraper backend connection
- Enable SSL for PostgreSQL connections in production

## API Backend Configuration

The API backend (Netlify Functions) needs:

```env
# In Netlify environment variables
POSTGRES_HOST=same-cloud-host.com
POSTGRES_PORT=5432
POSTGRES_DB=civitron
POSTGRES_USER=postgres
POSTGRES_PASSWORD=same-password
USE_POSTGRESQL=true
```

The API backend will **only read** from the database - no scraping.

## Cost Estimate

### Scraper Backend (Your PC)
- **Cost:** $0 (runs on your hardware)
- **Runtime:** ~5-10 minutes per day
- **Network:** Minimal (scraping HTML pages)

### Cloud PostgreSQL
- **Free tier (Supabase/Neon):** Good for 1000s of events
- **Paid tier:** ~$10-20/month for production scale

### API Backend (Netlify)
- **Free tier:** 125K function invocations/month
- **Bandwidth:** 100GB/month free
- **Typical usage:** Should stay within free tier

## License

Same as main Civitron project.
