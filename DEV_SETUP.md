# CiviTracker Development Setup

## Quick Start

### Option 1: Use the Environment Switcher (Easiest)
```bash
.\switch-env.bat
```
Then select:
- **1** = Local Cloudflare (Wrangler + Vite)
- **2** = Local Netlify (legacy)
- **3** = View live production site

### Option 2: Manual Commands

#### Local Development (Cloudflare - Recommended)
```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend
npm run wrangler:dev
```
- Frontend: http://localhost:5341
- Backend: http://localhost:8788

#### Quick Restart
```bash
.\restart-dev.bat
```

#### Local Development (Netlify - Legacy)
```bash
netlify dev
```
- Serves both frontend and backend
- Access via: http://localhost:8888

## Environment Overview

| Environment | Frontend | Backend | Database | Use Case |
|-------------|----------|---------|----------|----------|
| **Local (CF)** | localhost:5341 | localhost:8788 | Neon (live) | Active development |
| **Local (NF)** | localhost:8888 | localhost:8888 | Neon (live) | Legacy testing |
| **Production** | civitracker.pages.dev | civitracker.pages.dev/api/* | Neon (live) | Live site |

## Database

All environments use **Neon PostgreSQL** (same database):
- Host: `ep-frosty-dream-adlutkdw-pooler.c-2.us-east-1.aws.neon.tech`
- Any data you add locally **appears live immediately**
- Run scrapers locally to populate production data

## Key Scripts

```bash
# Development
npm run dev                    # Start Vite dev server (frontend only)
npm run wrangler:dev          # Start Wrangler Pages dev (backend only)
npm run cf:local              # Build + run Cloudflare local setup

# Legacy
npm run netlify:dev           # Start Netlify Dev (all-in-one)

# Building
npm run build                 # Build for production

# Scrapers
npx tsx scripts/run-all-scrapers.ts           # Run all 50 state scrapers
npx tsx scripts/test-ri-vt-db.ts              # Test specific states
npx tsx scripts/fix-fingerprint-constraint.ts # Fix DB constraints
```

## Deployment

### Automatic (Recommended)
```bash
git add .
git commit -m "Your changes"
git push origin main
```
Cloudflare Pages auto-deploys from main branch.

### Manual
```bash
wrangler pages deploy dist
```

## Switching Environments

The database is **shared across all environments**, so:

✅ **Do this**: Run scrapers locally to test and populate live data
✅ **Do this**: Test frontend changes locally before pushing
⚠️ **Be careful**: Any DB changes affect production immediately

## Troubleshooting

### Port conflicts
```bash
# Kill all Node processes
taskkill /F /IM node.exe

# Or use the restart script
.\restart-dev.bat
```

### Wrangler not found
```bash
npm install -g wrangler
```

### Build errors
```bash
# Clean and rebuild
Remove-Item -Recurse -Force dist, node_modules
npm install
npm run build
```

## File Structure

```
/functions/              # Cloudflare Functions (API routes)
/netlify/functions/      # Netlify Functions (legacy, shared utils)
/scripts/                # Scraper and utility scripts
/src/                    # Frontend React code
/database/               # SQL schema and migrations
wrangler.toml           # Cloudflare Pages config
netlify.toml            # Netlify config (legacy)
```

## Current Status

- ✅ 50/50 states have scrapers
- ✅ Rhode Island: 2 events in DB
- ✅ Vermont: Ready (in recess)
- ✅ North Dakota: Ready (interim)
- ✅ South Dakota: Ready (interim)
- ✅ All scrapers registered and working
