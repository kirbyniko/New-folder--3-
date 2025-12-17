# Virginia Scraper Documentation

## Overview

The Virginia scraper uses **Puppeteer** to render the React SPA-based Virginia Legislature website and extract committee meeting schedules and bills from PDF agendas.

## Why Static Data?

Virginia's scraper requires Puppeteer (headless Chrome) which takes **30-40 seconds** to complete. Netlify Functions have a timeout of:
- **10 seconds** on free tier
- **26 seconds** on paid tier

Since the scraper exceeds these limits, we use **pre-scraped static data** stored in `public/data/virginia-events.json`.

## Updating Virginia Data

### Manual Update (Recommended for Development)

Run the scraper manually to generate fresh data:

```powershell
npx tsx scripts/scrape-virginia.ts
```

This will:
1. Launch Puppeteer browser
2. Navigate to https://lis.virginia.gov/schedule
3. Wait for React SPA to render
4. Extract all committee meetings and dates
5. Download PDF agendas (if available)
6. Parse PDFs for bill numbers (HB, SB, HJ, SJ, HCR, SCR)
7. Save results to `public/data/virginia-events.json`

### Expected Output

- **Events**: 40-50 committee meetings spanning 3-4 months
- **Bills**: 10-15 bills extracted from PDF agendas
- **Runtime**: 30-40 seconds (Puppeteer launch + PDF downloads)
- **File Size**: ~50KB JSON

### Automated Updates (Production)

For production deployments:

1. **Scheduled Function**: Virginia scraper is included in `netlify/functions/scheduled-scraper.ts` which runs daily at 3 AM UTC
2. **Blob Storage**: Results are stored in Netlify Blobs with 24-hour cache
3. **Static Fallback**: The static JSON file serves as a fallback if blob storage is unavailable

## How the API Works

When a request comes to `/.netlify/functions/state-events?state=VA`:

1. Check if state is Virginia
2. Load pre-scraped data from `public/data/virginia-events.json`
3. Return events immediately (no scraping delay)
4. If static file missing, fall back to OpenStates API (no bills, fewer events)

## Bill Extraction

### Supported Bill Types

- **HB** - House Bill
- **SB** - Senate Bill  
- **HJ** - House Joint Resolution
- **SJ** - Senate Joint Resolution
- **HCR** - House Concurrent Resolution
- **SCR** - Senate Concurrent Resolution

### PDF Parsing

Virginia publishes agenda PDFs for most committee meetings. The scraper:

1. Downloads each PDF from `https://lis.blob.core.windows.net/files/*.PDF`
2. Attempts to parse with pdf-parse library
3. Falls back to raw buffer reading if parsing fails
4. Extracts bill IDs using regex: `/(HB|SB|HJ|SJ|HCR|SCR)\s*(\d+)/gi`
5. Generates bill URLs: `https://lis.virginia.gov/cgi-bin/legp604.exe?[session]+sum+[billtype][number]`

### Example Bills

```json
{
  "id": "SJ 7",
  "title": "SJ 7",
  "url": "https://lis.virginia.gov/cgi-bin/legp604.exe?262+sum+SJ7",
  "status": "In Committee",
  "sponsors": []
}
```

## Maintenance Schedule

- **Weekly**: Run manual scraper during active legislative session (Jan-Mar)
- **Monthly**: Run during interim periods
- **As Needed**: Update when major hearings or deadlines occur

## Troubleshooting

### Scraper Returns 0 Events

**Problem**: Transformation errors - events have `title` instead of `name` property

**Solution**: Ensure raw events use `name` field (line 149 in virginia.ts)

```typescript
// ❌ Wrong
const event: RawEvent = {
  title: committeeText,  // Wrong property name
  // ...
};

// ✅ Correct
const event: RawEvent = {
  name: committeeText,  // Correct property name
  // ...
};
```

### PDF Parsing Fails

**Problem**: `pdf-parse` library has ESM/CommonJS issues

**Solution**: Fallback method already implemented - uses `buffer.toString('utf8')` to extract text

### Puppeteer Timeout in Serverless

**Problem**: Function times out after 10-26 seconds

**Solution**: Use pre-scraped static data (current implementation) or switch to scheduled background jobs

## File Structure

```
├── scripts/
│   └── scrape-virginia.ts        # Manual scraper script
├── public/
│   └── data/
│       └── virginia-events.json  # Pre-scraped static data
├── netlify/functions/
│   ├── state-events.ts           # API endpoint (loads static file for VA)
│   ├── scheduled-scraper.ts      # Daily automated scraper
│   └── utils/scrapers/states/
│       └── virginia.ts           # Virginia scraper implementation
```

## Data Schema

### Event Object

```json
{
  "id": "va-2026-01-07-joint-meeting-of-senate-education-and-health-and",
  "name": "Joint Meeting of Senate Education and Health and House Education Committees - 2025",
  "committee": "Senate Education / Health / House Education Committees - 2025",
  "date": "2026-01-07T13:00:00.000Z",
  "time": "8:00 AM",
  "location": "Virginia State Capitol",
  "type": "hearing",
  "level": "state",
  "lat": 37.5407,
  "lng": -77.436,
  "zipCode": null,
  "url": "https://lis.virginia.gov/schedule",
  "agendaUrl": "https://lis.blob.core.windows.net/files/1081842.PDF",
  "bills": [
    {
      "id": "HJ 0",
      "title": "HJ 0",
      "url": "https://lis.virginia.gov/cgi-bin/legp604.exe?262+sum+HJ0",
      "status": "In Committee",
      "sponsors": []
    }
  ]
}
```

## Next Steps

1. **Improve PDF Parsing**: Fix pdf-parse library integration for better text extraction
2. **Add Bill Metadata**: Parse bill titles, sponsors, and status from PDFs
3. **Streaming Updates**: WebSocket connection for real-time legislative updates
4. **Video Integration**: Link to committee meeting livestreams

## Contact

For issues or questions about Virginia scraper, see main project README or check logs with:

```powershell
# Run scraper with verbose logging
npx tsx scripts/scrape-virginia.ts 2>&1 | Select-String "SCRAPER:VA"
```
