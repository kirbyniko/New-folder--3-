# PostgreSQL Integration - Quick Start

## 1. Install PostgreSQL

If you don't have PostgreSQL installed:
- **Download**: https://www.postgresql.org/download/windows/
- **Install**: Use default settings (port 5432)
- **Remember**: The password you set for the `postgres` user

## 2. Create Database

Open PowerShell and run:

```powershell
# Open PostgreSQL shell
psql -U postgres

# Inside psql, create database:
CREATE DATABASE civitron;
\c civitron
\i database/schema.sql
\q
```

## 3. Configure Environment

Create/update `.env` file:

```env
# Your existing API keys...
VITE_CONGRESS_API_KEY=your_key_here
VITE_OPENSTATES_API_KEY=your_key_here

# PostgreSQL Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=civitron
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_postgres_password_here

# Enable PostgreSQL (set to 'true' when ready)
USE_POSTGRESQL=false
```

## 4. Install Dependencies

```powershell
npm install
```

The `pg` package should be installed automatically. If not:

```powershell
npm install pg @types/pg
```

## 5. Test Connection

```powershell
npx ts-node test-postgres.ts
```

Expected output:
```
🧪 Testing PostgreSQL Integration

1️⃣ Testing database connection...
✅ Connection successful

2️⃣ Inserting test event...
✅ Event inserted with ID: <uuid>

3️⃣ Inserting test bills...
✅ Bills inserted and linked to event

4️⃣ Inserting test tags...
✅ Tags inserted

5️⃣ Querying events for CA...
✅ Found 1 event(s) for California

📄 Sample Event:
   Name: Test Committee Hearing on Budget
   Date: 2025-01-15
   Location: State Capitol, Room 201
   Bills: 2
   Tags: budget, finance, public-hearing

✅ All tests passed!
```

## 6. Populate with Real Data

Run a scraper to test dual-write:

```powershell
# Set USE_POSTGRESQL=true in .env first
netlify dev

# In another terminal, trigger a scraper
curl http://localhost:8888/.netlify/functions/trigger-scrape?state=CA
```

Or manually run the scheduled scraper:

```powershell
npx ts-node -e "require('./netlify/functions/scheduled-scraper').scheduledScraper()"
```

## 7. Verify Data

Check PostgreSQL:

```powershell
psql -U postgres -d civitron

# See event count by state
SELECT state_code, COUNT(*) FROM events GROUP BY state_code;

# See events with bills
SELECT e.name, e.date, COUNT(eb.bill_id) as bill_count
FROM events e
LEFT JOIN event_bills eb ON e.id = eb.event_id
GROUP BY e.id
LIMIT 10;

# Exit psql
\q
```

## 8. Enable PostgreSQL Reads (When Ready)

In `.env`:
```env
USE_POSTGRESQL=true
```

Restart your dev server. API endpoints will now:
1. Try PostgreSQL first
2. Fall back to Netlify Blobs on error
3. Add `X-Data-Source: postgresql` header

## Troubleshooting

### "pg: command not found"
PostgreSQL not in PATH. Use full path:
```powershell
& "C:\Program Files\PostgreSQL\14\bin\psql.exe" -U postgres
```

### "psql: error: connection refused"
PostgreSQL service not running:
```powershell
net start postgresql-x64-14
```

### "permission denied"
Wrong password. Reset in `.env` and try again.

### "cannot import module 'pg'"
```powershell
npm install pg @types/pg
```

### Test script fails to compile
```powershell
npm install -D ts-node typescript
```

## Current Status

✅ **Dual-Write Mode**: Data writes to both Blobs and PostgreSQL
⏸️ **Read from Blobs**: Frontend still uses Netlify Blobs (safe)
🔄 **PostgreSQL Populating**: Database filling up in background

Set `USE_POSTGRESQL=true` when you're ready to switch reads to database.
