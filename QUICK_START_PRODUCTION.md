# Quick Start Guide - Production Architecture

## What Changed?

Civitron now has **two separate backends** for production:

### 1. Scraper Backend (Your PC) 
📁 Location: `scraper-backend/`
- Runs scrapers every 24 hours
- Writes data to PostgreSQL
- Runs on your local PC

### 2. API Backend (Netlify Cloud)
📁 Location: `netlify/functions/`
- Serves data to frontend
- Reads from PostgreSQL
- Lives in the cloud

## Why?

- **Cost:** Scraping on your PC = free
- **Speed:** API just reads cached data = fast
- **Reliability:** Frontend doesn't depend on scraping

## Setup Steps

### 1. Setup Cloud PostgreSQL Database

Pick one (Supabase recommended for beginners):

**Neon (neon.tech) - Recommended:**
- Pay-as-you-go: ~$0.10/GB/month
- Free tier: 0.5GB storage
- Create project → get connection string
- Connect and run `database/schema.sql`

**Railway (railway.app):**
- Pay-as-you-go: ~$15/month for always-on
- $5 trial credit
- New Project → PostgreSQL → import schema

**DigitalOcean (digitalocean.com):**
- Fixed pricing: $15/month starter
- Create → Databases → PostgreSQL
- Reliable and predictable costs

### 2. Deploy API Backend to Netlify

```bash
# Push to GitHub
git push origin main

# In Netlify dashboard:
# - Connect repo
# - Set environment variables:
#   POSTGRES_HOST=your-db-host.com
#   POSTGRES_PORT=5432
#   POSTGRES_DB=civitron
#   POSTGRES_USER=postgres
#   POSTGRES_PASSWORD=your-password
#   USE_POSTGRESQL=true
# - Deploy
```

### 3. Setup Scraper Backend on Your PC

```bash
cd scraper-backend
npm install
cp .env.example .env

# Edit .env with your PostgreSQL connection
# Then:
npm test        # Test connection
npm run scrape  # Initial data population
npm start       # Start 24-hour scheduler
```

Keep the terminal running, or setup PM2:

```bash
npm install -g pm2 pm2-windows-service
pm2-service-install
pm2 start src/index.js --name civitron-scraper
pm2 save
```

## Architecture Diagram

```
Your PC                  Cloud
┌────────────┐          ┌──────────────┐
│  Scraper   │─────────▶│  PostgreSQL  │
│  Backend   │  Write   │   Database   │
└────────────┘          └───────┬──────┘
                                │ Read
                        ┌───────▼──────┐
                        │     API      │
                        │   Backend    │
                        │  (Netlify)   │
                        └───────┬──────┘
                                │
                        ┌───────▼──────┐
                        │   Frontend   │
                        │   (React)    │
                        └──────────────┘
```

## Daily Operation

1. **Scraper backend runs at 3 AM** (your PC must be on)
2. **Scrapes all 50 states** (~5-10 minutes)
3. **Writes to PostgreSQL** in the cloud
4. **API backend serves data** to users 24/7
5. **Repeat next day**

## Files to Note

- `scraper-backend/README.md` - Detailed scraper docs
- `PRODUCTION_DEPLOYMENT.md` - Complete deployment guide
- `database/schema.sql` - PostgreSQL schema

## Current Status

Both backends work right now:
- **Local dev:** Uses localhost PostgreSQL
- **Production:** Needs cloud PostgreSQL setup

Your existing local development environment still works exactly the same!

## Questions?

See `PRODUCTION_DEPLOYMENT.md` for complete setup guide.
