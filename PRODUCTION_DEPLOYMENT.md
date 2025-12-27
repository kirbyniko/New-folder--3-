# Production Deployment Guide

## Architecture Overview

Civitron uses a **split backend architecture** for production:

```
┌──────────────────────────────────────────────────────────────┐
│                         FRONTEND                              │
│                    (Vite + React + Netlify)                   │
│                   https://civitron.netlify.app                │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             │ HTTPS API Requests
                             │
┌────────────────────────────▼─────────────────────────────────┐
│                      API BACKEND                              │
│                   (Netlify Functions)                         │
│                      READ-ONLY                                │
│  • congress-meetings  • local-meetings                        │
│  • state-events       • top-events                            │
│  • admin-events                                               │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             │ PostgreSQL Read Queries
                             │
┌────────────────────────────▼─────────────────────────────────┐
│                    POSTGRESQL DATABASE                        │
│              (Cloud: Supabase/Neon/Railway)                   │
│                  e.g., db.supabase.co:5432                    │
└────────────────────────────▲─────────────────────────────────┘
                             │
                             │ PostgreSQL Write Operations
                             │
┌────────────────────────────┴─────────────────────────────────┐
│                   SCRAPER BACKEND                             │
│                    (Your Local PC)                            │
│              Node.js Service + Cron Scheduler                 │
│                   Runs Every 24 Hours                         │
└──────────────────────────────────────────────────────────────┘
```

## Why This Architecture?

1. **Cost Efficiency**: Scraping runs on your PC (free), not cloud compute
2. **Reliability**: API is always fast (just database reads)
3. **Scalability**: Frontend can handle thousands of users reading cached data
4. **Flexibility**: Change scrapers without redeploying cloud infrastructure

## Component Breakdown

### 1. Scraper Backend (Your PC)

**Location:** `scraper-backend/` directory
**Runs On:** Your local Windows PC
**Schedule:** Every 24 hours (configurable)
**Function:** Scrapes state legislative websites → writes to PostgreSQL

**Deployment Steps:**
1. Navigate to `scraper-backend/`
2. Copy `.env.example` to `.env`
3. Configure cloud PostgreSQL connection
4. Run `npm install`
5. Test: `npm test`
6. Start: `npm start` or `start.bat`
7. Keep terminal running (or setup Windows Service)

**Requirements:**
- Node.js 20+
- Internet connection
- Ability to reach cloud PostgreSQL (port 5432)

### 2. API Backend (Netlify)

**Location:** `lib/functions/` directory
**Runs On:** Netlify's cloud infrastructure
**Function:** Serves data from PostgreSQL to frontend (read-only)

**Deployment Steps:**
1. Push code to GitHub
2. Connect GitHub repo to Netlify
3. Configure environment variables in Netlify dashboard
4. Deploy

**Netlify Environment Variables:**
```env
POSTGRES_HOST=your-cloud-postgres-host.com
POSTGRES_PORT=5432
POSTGRES_DB=civitron
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-secure-password
USE_POSTGRESQL=true
CONGRESS_API_KEY=your-key (optional, for congress-meetings fallback)
OPENSTATES_API_KEY=your-key (optional, for fallback)
```

### 3. PostgreSQL Database (Cloud)

**Recommended Providers (Pay-As-You-Go):**

#### Option A: Neon (🏆 Best Value - Recommended)
- **Pricing:** True pay-as-you-go
  - Free tier: 0.5GB storage
  - Paid: ~$0.10/GB storage + $0.10/hour compute
  - Typical cost: $1-5/month for small projects
- **Pros:** Serverless, auto-scales, instant branching, great DX
- **Setup:**
  1. Sign up at neon.tech with GitHub
  2. Create new project
  3. Copy connection string from dashboard
  4. Connect and run `database/schema.sql`
- **Connection String:** `postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb`

#### Option B: Railway (Good for Startups)
- **Pricing:** Pay-as-you-go
  - $5/month free credit (trial)
  - ~$0.02/hour ($15/month for always-on)
  - Volume pricing for larger deploys
- **Pros:** Simple, includes other services (Redis, etc.)
- **Setup:**
  1. Sign up with GitHub at railway.app
  2. New Project → PostgreSQL
  3. Copy connection details
  4. Connect via psql and run schema

#### Option C: DigitalOcean Managed PostgreSQL
- **Pricing:** Fixed tiers
  - Starter: $15/month (1GB RAM, 10GB storage)
  - Production: $55/month (4GB RAM, 38GB storage)
- **Pros:** Reliable, predictable pricing, good performance
- **Setup:**
  1. Create DigitalOcean account
  2. Create → Databases → PostgreSQL
  3. Get connection string
  4. Run schema

#### Option D: AWS RDS PostgreSQL (Enterprise)
- **Pricing:** Pay-as-you-go
  - db.t4g.micro: ~$15/month (free tier: 750 hours/month for 12 months)
  - Storage: $0.115/GB/month
- **Pros:** Most scalable, AWS ecosystem integration
- **Cons:** Complex setup, requires VPC knowledge
- **Best for:** Large scale production apps

### 4. Frontend (Netlify)

**Location:** `src/` directory
**Runs On:** Netlify CDN
**Function:** React SPA that calls API backend

**Deployment:** Automatic via Netlify (builds from `main` branch)

## Step-by-Step Production Deployment

### Phase 1: Setup Cloud PostgreSQL

1. **Choose Provider** (Supabase recommended)
2. **Create Database Instance**
3. **Run Schema Setup:**
   ```sql
   -- Copy contents of database/schema.sql
   -- Paste in SQL editor and execute
   ```
4. **Note Connection Details:**
   - Host: `db.xxxxx.supabase.co`
   - Port: `5432`
   - Database: `postgres`
   - User: `postgres`
   - Password: (your password)

5. **Configure Firewall:**
   - Allow connections from your PC IP (for scraper backend)
   - Allow connections from Netlify IPs (or allow all - PostgreSQL has auth)

### Phase 2: Deploy API Backend to Netlify

1. **Push Code to GitHub:**
   ```bash
   git add .
   git commit -m "Production deployment"
   git push origin main
   ```

2. **Create Netlify Site:**
   - Go to netlify.com
   - "Add new site" → "Import existing project"
   - Connect to GitHub repo
   - Configure build:
     - Build command: `npm run build`
     - Publish directory: `dist`
     - Functions directory: `lib/functions`

3. **Set Environment Variables:**
   - Netlify Dashboard → Site settings → Environment variables
   - Add all PostgreSQL connection variables (see above)

4. **Deploy:**
   - Netlify will auto-deploy from main branch
   - Wait for build to complete
   - Test API: `https://your-site.netlify.app/.lib/functions/state-events?state=CA`

### Phase 3: Setup Scraper Backend on Your PC

1. **Navigate to scraper-backend:**
   ```bash
   cd scraper-backend
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment:**
   - Copy `.env.example` to `.env`
   - Add same PostgreSQL connection details as Netlify
   - Add API keys (CONGRESS_API_KEY, OPENSTATES_API_KEY)

4. **Test Connection:**
   ```bash
   npm test
   ```
   
   Should show:
   ```
   ✅ Database connection successful
   📊 Database Statistics...
   ```

5. **Run Initial Scrape:**
   ```bash
   npm run scrape
   ```
   
   This populates the database with initial data (~5-10 minutes).

6. **Start Scheduler:**
   ```bash
   npm start
   ```
   
   Or double-click `start.bat`
   
   Service will:
   - Run scrapers immediately
   - Schedule them to run daily at 3:00 AM
   - Keep running in background

7. **Keep It Running:**
   - Option A: Keep terminal window open
   - Option B: Setup as Windows Service (see below)

### Phase 4: Verify Everything Works

1. **Check Database Has Data:**
   ```sql
   SELECT state_code, COUNT(*) 
   FROM events 
   GROUP BY state_code;
   ```

2. **Test API Backend:**
   ```bash
   curl https://your-site.netlify.app/.lib/functions/state-events?state=NY
   ```

3. **Test Frontend:**
   - Visit `https://your-site.netlify.app`
   - Select a state
   - Should see legislative events

## Running Scraper Backend 24/7

### Option A: Keep Terminal Running

Simplest but not reliable (stops if you close terminal or PC restarts).

### Option B: Windows Task Scheduler

1. Open Task Scheduler
2. Create Basic Task
3. Name: "Civitron Scraper"
4. Trigger: At startup
5. Action: Start a program
6. Program: `C:\Program Files\nodejs\node.exe`
7. Arguments: `src/index.js`
8. Start in: `C:\path\to\scraper-backend`
9. ✅ Run whether user is logged in or not

### Option C: PM2 (Recommended)

```bash
npm install -g pm2
npm install -g pm2-windows-service

# Setup PM2 as Windows service
pm2-service-install

# Start scraper backend
cd scraper-backend
pm2 start src/index.js --name civitron-scraper

# Save configuration
pm2 save

# Check status
pm2 status

# View logs
pm2 logs civitron-scraper
```

Now the scraper will:
- Auto-start on Windows boot
- Auto-restart on crashes
- Run in background
- Log all activity

## Monitoring & Maintenance

### Scraper Backend Monitoring

**Check if running:**
```bash
pm2 status
```

**View logs:**
```bash
pm2 logs civitron-scraper --lines 100
```

**Restart:**
```bash
pm2 restart civitron-scraper
```

### Database Monitoring

**Event counts by state:**
```sql
SELECT state_code, COUNT(*) as events
FROM events 
WHERE date >= CURRENT_DATE
GROUP BY state_code 
ORDER BY events DESC;
```

**Recent scraper runs:**
```sql
SELECT state_code, success, events_found, scraped_at
FROM scraper_health 
WHERE scraped_at > NOW() - INTERVAL '24 hours'
ORDER BY scraped_at DESC;
```

**Database size:**
```sql
SELECT 
  pg_size_pretty(pg_database_size('civitron')) as size;
```

### API Backend Monitoring

**Netlify Dashboard:**
- Functions tab → View invocation count, errors
- Analytics → Traffic, performance
- Logs → Real-time function logs

## Troubleshooting

### Scraper Backend Issues

**"Cannot connect to PostgreSQL"**
- Check internet connection
- Verify PostgreSQL host is accessible
- Test with: `telnet db.yourhost.com 5432`
- Check firewall allows outbound port 5432

**"No events found for state XX"**
- Normal if state legislature isn't in session
- Check scraper_health table for errors
- Some scrapers may need updates if websites change

**High memory usage**
- Reduce batch size in `src/scraper.ts`
- Increase delay between batches
- Restart service: `pm2 restart civitron-scraper`

### API Backend Issues

**"Database connection timeout"**
- Netlify can't reach PostgreSQL
- Check PostgreSQL allows connections from all IPs
- Verify Netlify environment variables are correct

**Slow API responses**
- Add database indexes (see `database/migrations/`)
- Consider PostgreSQL connection pooling
- Check Netlify function logs for slow queries

### Database Issues

**Out of space (Supabase free tier)**
- Run cleanup: `DELETE FROM events WHERE date < CURRENT_DATE - INTERVAL '30 days'`
- Upgrade to paid plan ($25/month for 8GB)
- Or migrate to Neon (3GB free)

## Costs

### Free Tier (Hobby Project)
- **Scraper Backend:** $0 (your PC)
- **PostgreSQL:** $0 (Supabase/Neon free tier)
- **API Backend:** $0 (Netlify free tier)
- **Frontend:** $0 (Netlify free tier)
- **Total:** $0/month

### Production Scale (100K+ users)
- **Scraper Backend:** $0 (your PC)
- **PostgreSQL:** $20/month (upgraded tier)
- **API Backend:** $0-50/month (depends on traffic)
- **Frontend:** $0 (Netlify free tier handles lots of traffic)
- **Total:** ~$20-70/month

## Security Considerations

1. **PostgreSQL Password:** Use strong, unique password
2. **Environment Variables:** Never commit `.env` files
3. **API Keys:** Rotate periodically
4. **PostgreSQL SSL:** Enable in production (Supabase/Neon do this by default)
5. **Rate Limiting:** Already configured in API functions
6. **CORS:** Already configured to allow frontend domain

## Backup Strategy

### Database Backups

**Automatic (Supabase/Neon):**
- Daily backups included in free tier
- Point-in-time recovery available

**Manual Backup:**
```bash
pg_dump -h db.yourhost.com -U postgres -d civitron > backup.sql
```

**Restore:**
```bash
psql -h db.yourhost.com -U postgres -d civitron < backup.sql
```

## Updating Production

### Update API Backend:
```bash
git push origin main
# Netlify auto-deploys
```

### Update Scraper Backend:
```bash
cd scraper-backend
git pull
npm install
pm2 restart civitron-scraper
```

### Update Database Schema:
```bash
# Create migration file in database/migrations/
# Run it manually via SQL editor or psql
```

## Support

For issues:
1. Check logs (PM2 logs, Netlify logs, PostgreSQL logs)
2. Review scraper_health table for scraper errors
3. Test components individually (connection, scraper, API)
4. Check GitHub issues for similar problems

## Next Steps

After deployment:
- [ ] Setup PM2 for automatic restart
- [ ] Configure backup strategy
- [ ] Setup monitoring/alerting (optional)
- [ ] Document custom domain setup (if needed)
- [ ] Add analytics (Netlify Analytics or Google Analytics)
