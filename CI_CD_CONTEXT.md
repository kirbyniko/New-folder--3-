# CI/CD Context - NEVER FORGET THIS

## Platform: Cloudflare Pages (NOT Netlify!)

**We migrated from Netlify to Cloudflare Pages.** Netlify directories were deleted. Any reference to Netlify is OLD and WRONG.

## Deployment Architecture

### 1. Frontend Deployment
- **Platform**: Cloudflare Pages
- **Trigger**: Automatic on push to `main` branch
- **No GitHub Action needed** - Cloudflare watches the repo directly
- **Build command**: `npm run build`
- **Output directory**: `dist/`
- **Config file**: `wrangler.toml`

### 2. Backend/Functions
- **Platform**: Cloudflare Pages Functions
- **Location**: `functions/` directory (NOT `netlify/functions/`)
- **API routes**: `/api/*` (e.g., `/api/state-events`, `/api/congress-meetings`)
- **Database**: Cloudflare D1 (SQLite) bound via `wrangler.toml`
- **Bindings**:
  - `DB` → D1 database (ID: 964e58ca-0add-41f2-8c31-84fb379b4ce2)
  - `SCRAPER_CACHE` → KV namespace (ID: abdeb4d15d6e4cb99ad7d3fe664169e9)

### 3. Data Source Sync
- **Platform**: GitHub Actions
- **Workflow**: `.github/workflows/sync-data-sources.yml`
- **Trigger**: Push to `main` branch when these files change:
  - `lib/functions/utils/scrapers/states/**`
  - `lib/functions/utils/scrapers/index.ts`
  - `functions/utils/scrapers/states/**`
  - `functions/utils/scrapers/index.ts`
- **What it does**:
  1. Runs `scripts/sync-data-sources.ts` to generate SQL
  2. Executes SQL against D1 database via `wrangler d1 execute`
  3. Updates `data_sources` table with scraper metadata
- **Manual trigger**: GitHub Actions UI → "Sync Data Sources" → Run workflow

## GitHub Workflows (1 total)

### sync-data-sources.yml
- **Purpose**: Sync scraper metadata to D1 data_sources table
- **Trigger**: Scraper file changes only
- **Runtime**: ~35 seconds
- **Secrets required**:
  - `CLOUDFLARE_API_TOKEN`
  - `CLOUDFLARE_ACCOUNT_ID`
- **Output**: Uploads `temp-sync-sources.sql` artifact
- **Why it exists**: Keeps frontend data viewer in sync with actual scrapers

## Why No Other Workflows?

1. **Cloudflare Pages handles builds** - No need for a build/deploy workflow
2. **D1 migrations are manual** - Run `wrangler d1 execute` locally when needed
3. **Scrapers run on-demand** - Via API calls or manual scripts, not CI/CD
4. **Tests?** - None configured (should add later)

## Key Facts

- ✅ Cloudflare Pages auto-deploys from `main` - **NO MANUAL WRANGLER DEPLOY NEEDED**
- ✅ Only 1 GitHub workflow: `sync-data-sources.yml`
- ❌ No Netlify (deleted all remnants on 2024-12-27)
- ❌ No build/deploy workflow (Cloudflare handles it)
- ❌ No test workflows (should add later)

## Debugging Deployments

### Frontend not updating?
1. Check Cloudflare Pages dashboard: `https://dash.cloudflare.com/`
2. Go to "Workers & Pages" → "civitracker"
3. Check latest deployment status
4. Look for build errors
5. Check build logs

### Data sources not syncing?
1. Check GitHub Actions: `https://github.com/kirbyniko/New-folder--3-/actions`
2. Look for "Sync Data Sources" runs
3. Check if workflow triggered (only runs on scraper file changes!)
4. If needed, manually trigger: Actions → Sync Data Sources → Run workflow
5. Or run locally: `npx tsx scripts/sync-data-sources.ts`

### API functions not working?
1. Functions deploy with Pages automatically
2. Check `functions/` directory has correct file structure
3. Verify D1 bindings in `wrangler.toml`
4. Check Cloudflare dashboard for function errors
5. Test: `curl https://civitracker.pages.dev/api/test`

## Common Mistakes (AVOID!)

- ❌ Looking for Netlify workflows - **THEY DON'T EXIST**
- ❌ Expecting workflow to run on every commit - **Only on scraper changes**
- ❌ Manually running `wrangler pages deploy` - **Cloudflare does it automatically**
- ❌ Checking for build workflows - **Cloudflare handles builds, not GitHub**
- ❌ Thinking sync-data-sources deploys frontend - **It only updates D1 database**

## What Triggers What?

| Change Type | Triggers | What Happens |
|-------------|----------|--------------|
| Push to `main` (any file) | Cloudflare Pages | Frontend rebuild + deploy |
| Scraper file change | GitHub Actions | D1 data_sources table updated |
| `functions/` change | Cloudflare Pages | API functions redeploy |
| `wrangler.toml` change | Cloudflare Pages | Bindings/config update |
| D1 database change | Nothing | Manual intervention only |

## Manual Operations

### Deploy frontend manually (not needed usually)
```powershell
npm run build
wrangler pages deploy dist
```

### Sync data sources manually
```powershell
npx tsx scripts/sync-data-sources.ts
```

### Update D1 database
```powershell
wrangler d1 execute civitracker-db --remote --command "YOUR SQL HERE"
```

### View D1 data
```powershell
wrangler d1 execute civitracker-db --remote --command "SELECT * FROM events LIMIT 10;"
```

## CI/CD Philosophy

**Keep it simple:**
- Cloudflare handles most deployment automatically
- GitHub Actions only for specialized tasks (data sync)
- Manual operations for database changes (safer)
- No over-engineering with complex workflows

**If you add workflows, ask:**
1. Can Cloudflare do this automatically? (probably yes)
2. Does this need to run on every commit? (probably no)
3. Is manual operation better? (for DB changes: yes)
