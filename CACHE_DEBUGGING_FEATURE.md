# Cache Debugging Feature - Implementation Summary

## Overview
Added comprehensive cache debugging and management tools to the Data Viewer to help diagnose states showing "No Events Found" when scrapers should be finding data.

## Features Added

### 1. Cache Information Display
Each state in the Data Sources view now shows:
- **Cache Badge** in the state summary row showing:
  - Age of cached data (e.g., "2h old")
  - Number of cached events
  - Visual indicator (green = valid, orange = expired, gray = no cache)
  
- **Detailed Cache Stats** when expanded:
  - Age: How long since cache was created
  - Expires in: Time until cache expires (TTL)
  - Events: Number of events in cache
  - Size: File size of cached data

### 2. Cache Management Actions
Two buttons available for each state:

#### 🗑️ Clear Cache
- Deletes the cache file for that state
- Forces a fresh scrape on next API request
- Useful when cache contains stale/incorrect data
- Disabled if no cache exists

#### 🔄 Force Rescrape  
- Immediately runs the scraper for that state
- Bypasses cache completely
- Shows progress indicator during scraping (10-30s)
- Displays results: number of events found and scrape duration
- Useful for debugging scraper issues in real-time

## New API Endpoints

### `/api/cache-info`
**GET** endpoint that returns cache status for all states

**Query params:**
- `state` (optional): Get info for specific state (e.g., `?state=IA`)

**Returns:**
```json
{
  "caches": [
    {
      "state": "CA",
      "exists": true,
      "age": 7200,
      "ageDisplay": "2h",
      "ttl": 79200,
      "ttlDisplay": "22h",
      "eventCount": 17,
      "size": 45678,
      "sizeDisplay": "45KB",
      "isExpired": false
    }
  ],
  "totalCaches": 28,
  "stats": {
    "hits": 150,
    "misses": 23,
    "hitRate": 0.87,
    "totalFiles": 28
  }
}
```

### `/api/invalidate-cache`
**POST** endpoint to delete cache for a specific state

**Query params:**
- `state` (required): State code (e.g., `?state=KY`)

**Returns:**
```json
{
  "success": true,
  "state": "KY",
  "message": "Cache cleared for KY",
  "existed": true
}
```

### `/api/rescrape`
**POST** endpoint to force immediate scraping

**Query params:**
- `state` (required): State code (e.g., `?state=IA`)

**Returns:**
```json
{
  "success": true,
  "state": "IA",
  "eventsFound": 5,
  "duration": 2450,
  "cached": true,
  "hadPreviousCache": true,
  "message": "Successfully scraped 5 events for IA"
}
```

## Files Modified/Created

### Created:
- `functions/api/cache-info.ts` - Cache information endpoint
- `functions/api/invalidate-cache.ts` - Cache deletion endpoint  
- `functions/api/rescrape.ts` - Force rescrape endpoint

### Modified:
- `src/components/DataSourcesView.tsx` - Added cache UI and controls
- `src/components/DataSourcesView.css` - Added cache styling

## Usage Example

### Debugging Iowa (showing 0 events):

1. Open Data Viewer (📊 button)
2. Click "Data Sources" tab
3. Find Iowa in the list
4. Check cache badge:
   - "📦 No cache" → Never been scraped
   - "📦 5h old • 0 events" → Cache exists but empty
   - "📦 2h old • 8 events" → Cache has data (may be display issue)

5. If cache shows 0 events but you expect more:
   - Click **"🔄 Force Rescrape"**
   - Wait 10-30 seconds
   - Check result: "Scraped X events"
   - If still 0, scraper may be broken or legislature is out of session

6. If cache is very old:
   - Click **"🗑️ Clear Cache"**
   - Next user request will trigger fresh scrape

## Troubleshooting Guide

### State shows "No Events Found"

**Step 1:** Check cache info
- No cache → Never scraped, run Force Rescrape
- Cache exists with 0 events → May be out of session
- Cache expired → Clear cache to force refresh

**Step 2:** Force rescrape
- If returns 0 events → Check if legislature is in session
- If returns events → Cache was stale, problem solved
- If error → Check scraper logs

**Step 3:** Check scraper implementation
- Look at `lib/functions/utils/scrapers/states/{state}.ts`
- Iowa: `IowaScraper` - scrapes public hearings table
- Kentucky: `KentuckyScraper` - scrapes legislative calendar
- Verify URL is still valid
- Check if HTML structure changed

### Common Issues

**Iowa/Kentucky showing 0 events:**
- Legislature may be out of session (normal)
- Check dates: Iowa meets Jan-May, Kentucky Jan-Apr
- Verify with Force Rescrape

**Cache shows old data:**
- TTL is 24 hours by default
- Use Clear Cache to force refresh
- Check TTL remaining in cache stats

**Rescrape fails:**
- May be API rate limiting
- Website structure may have changed
- Check browser console for errors
- Look at Network tab in DevTools

## Cache File Locations

Cache files are stored in:
```
public/cache/scraper-{STATE}-events.json
```

Examples:
- `public/cache/scraper-IA-events.json`
- `public/cache/scraper-KY-events.json`

## Future Enhancements

Potential improvements:
1. Auto-refresh cache info every 30s
2. Bulk rescrape all states button
3. Cache hit/miss rate per state
4. Historical scrape success rate
5. Alert if cache expires without refresh
6. Scheduled auto-rescrape for active states
