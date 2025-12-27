# PostgreSQL Integration for Civitron

## Setup Instructions

### 1. Install PostgreSQL

**Windows:**
- Download from https://www.postgresql.org/download/windows/
- Use default port 5432
- Remember the password you set for postgres user

**Mac:**
```bash
brew install postgresql
brew services start postgresql
```

**Linux:**
```bash
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2. Create Database

Open psql:
```bash
# Windows: Use SQL Shell (psql) from Start Menu
# Mac/Linux:
psql -U postgres
```

Run setup:
```sql
CREATE DATABASE civitron;
\c civitron
\i database/schema.sql
\q
```

Or use the setup script:
```bash
psql -U postgres -f database/setup.sql
```

### 3. Configure Environment

Copy `.env.example` to `.env` and update:
```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=civitron
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password_here
USE_POSTGRESQL=true
```

### 4. Install Node Dependencies

```bash
npm install pg @types/pg
```

### 5. Test Connection

```bash
node -e "require('./lib/functions/utils/db/connection.js').checkDatabaseConnection()"
```

## Database Schema

### Tables

- **states** - US state reference data
- **events** - Legislative events (federal, state, local)
- **bills** - Bill information
- **event_bills** - Many-to-many relationship
- **committees** - Committee information
- **event_tags** - Event categorization tags
- **scraper_health** - Scraper monitoring

### Key Features

- **Deduplication**: Uses fingerprints to prevent duplicate events
- **Relationships**: Links events to bills and committees
- **Geospatial**: Indexed lat/lng for location queries
- **Time-range**: Indexed date for efficient filtering
- **Health Tracking**: Monitors scraper success/failure rates

## Usage

### Dual-Write Mode (Current)

Data is written to both:
1. **Netlify Blobs** (primary) - Frontend reads from here
2. **PostgreSQL** (background) - Populating for future features

This allows testing without breaking production.

### Enable PostgreSQL Reads

Set in `.env`:
```env
USE_POSTGRESQL=true
```

API endpoints will:
1. Try PostgreSQL first
2. Fall back to Netlify Blobs on error
3. Return `X-Data-Source` header indicating which was used

## Maintenance

### View Data

```sql
-- Event count by state
SELECT state_code, COUNT(*) as events 
FROM events 
GROUP BY state_code 
ORDER BY events DESC;

-- Recent scraper activity
SELECT * FROM scraper_health 
ORDER BY scraped_at DESC 
LIMIT 20;

-- Events with bills
SELECT e.name, e.date, b.bill_number, b.title
FROM events e
JOIN event_bills eb ON e.id = eb.event_id
JOIN bills b ON eb.bill_id = b.id
WHERE e.state_code = 'CA'
LIMIT 10;
```

### Clean Old Data

```sql
-- Delete events older than 90 days
DELETE FROM events WHERE date < CURRENT_DATE - INTERVAL '90 days';

-- Clean up orphaned bills
DELETE FROM bills WHERE id NOT IN (SELECT DISTINCT bill_id FROM event_bills);
```

### Reset Database

```bash
psql -U postgres -c "DROP DATABASE civitron;"
psql -U postgres -c "CREATE DATABASE civitron;"
psql -U postgres -d civitron -f database/schema.sql
```

## Performance

### Current Indexes

- `idx_events_date` - Fast date range queries
- `idx_events_location` - Geographic lookups
- `idx_events_state` - State filtering
- `idx_events_level` - Federal/state/local filtering
- `idx_events_fingerprint` - Deduplication

### Query Optimization

For production, consider:
- **Connection Pooling**: PgBouncer (already configured in code)
- **Read Replicas**: For analytics queries
- **Partitioning**: Split events table by date
- **PostGIS**: For advanced geographic queries

## Troubleshooting

### Connection Errors

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Fix**: Ensure PostgreSQL is running
```bash
# Windows
net start postgresql-x64-14

# Mac
brew services start postgresql

# Linux
sudo systemctl start postgresql
```

### Permission Errors

```
Error: permission denied for table events
```
**Fix**: Grant permissions
```sql
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
```

### Schema Conflicts

```
Error: relation "events" already exists
```
**Fix**: Drop and recreate (loses data!)
```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
\i database/schema.sql
```
