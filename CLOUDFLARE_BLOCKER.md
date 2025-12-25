# Cloudflare Migration - Technical Blocker

## Issue Discovered

Cloudflare Workers (even with `nodejs_compat`) cannot run our scraper code because:

1. **Deep filesystem dependencies**: Scrapers use `cosmiconfig`, `resolve-from`, and other packages that require `fs.statSync`, `fs.readFileSync` at the package level
2. **Node.js-specific APIs**: PostgreSQL client (`pg`), config loaders, file-based caching all expect full Node.js environment
3. **Bundle size**: All 42 state scrapers + utilities = too large for Workers (1MB limit)

## Recommended Solution: Hybrid Deployment

### Option 1: Split Architecture (RECOMMENDED)
**Frontend on Cloudflare, API on Netlify**

✅ **Advantages:**
- Unlimited bandwidth for frontend (Cloudflare)
- Keep existing API working (Netlify)
- No code changes needed
- Deploy immediately

📋 **Steps:**
1. Deploy static frontend to Cloudflare Pages
2. Update `VITE_API_URL` to point to Netlify Functions
3. Keep Netlify project active for API only (minimal bandwidth usage)

**Cost:** $0/month (both free tiers)

### Option 2: Railway/Render for API
**Full stack on alternative platform**

Use Railway or Render (both have better free tiers than Netlify):

**Railway Free Tier:**
- $5 free credit/month
- ~500 hours execution time
- Full Node.js support

**Render Free Tier:**
- 750 hours/month
- Full Node.js support
- Auto-sleep after 15 min inactivity

### Option 3: Rewrite for Cloudflare (Long-term)
**Requires significant refactoring:**
- Use Cloudflare D1 (SQLite) instead of PostgreSQL
- Rewrite scrapers to avoid Node.js-specific packages
- Use Cloudflare KV for caching
- Implement Workers Cron Triggers

**Estimated effort:** 20-30 hours of development

## Immediate Action: Deploy Frontend Only

Since we hit the Netlify credit limit, let's restore service with a hybrid approach:

### Deploy Frontend to Cloudflare Pages

```powershell
# Build frontend
npm run build

# Deploy to Cloudflare Pages (no functions directory)
# We'll use Netlify API temporarily
wrangler pages deploy dist --project-name civitracker
```

### Configure API URL

Add to Cloudflare Pages environment variables:
```
VITE_API_URL=https://civitracker.netlify.app
```

This way:
- ✅ Frontend gets unlimited Cloudflare bandwidth
- ✅ API stays on Netlify (minimal usage)
- ✅ Alabama fixes go live
- ✅ Site restored immediately

## Next Steps

1. Deploy frontend to Cloudflare Pages (no functions)
2. Wait for Netlify credit reset (January 1st)
3. Re-deploy Netlify Functions with Alabama fixes
4. Consider Railway/Render migration for long-term

**Current status:** Site down due to Netlify credit limit. Alabama fixes ready but blocked by deployment issues.
