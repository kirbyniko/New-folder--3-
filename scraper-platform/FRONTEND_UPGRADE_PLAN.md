# Frontend Upgrade Plan

## Current Issues
1. ❌ Real-time logs only visible in execution panel (hard to read)
2. ❌ No way to view generated LLM scripts
3. ❌ No way to view scraped data
4. ❌ No script management (edit, delete cached scripts)
5. ❌ No data export functionality
6. ❌ Can't see what the scraper actually found

## Required New Features

### 1. Tab Navigation
- **Scrapers Tab**: Current scraper cards (exists)
- **Scripts Tab**: View all cached LLM-generated scripts
- **Data Tab**: View scraped data from database
- **Logs Tab**: Better log viewer with filtering

### 2. Scripts Management
- List all cached scripts with metadata
- View script code (syntax highlighted)
- See success/failure rates
- Delete or regenerate scripts
- Test script on demand

### 3. Data Viewer
- Table view of scraped data
- Filter by scraper, date, jurisdiction
- Export to JSON/CSV
- Pagination for large datasets
- Click to view full event details

### 4. Enhanced Execution Monitor
- Show current scraper progress
- Display generated script in real-time
- Show scraped items as they're found
- Better error visualization

## New API Endpoints Needed

```
GET  /api/scripts           - List all cached scripts
GET  /api/scripts/:id       - Get specific script details
DELETE /api/scripts/:id     - Delete cached script
POST /api/scripts/:id/test  - Test a cached script

GET  /api/data              - Get scraped data (paginated)
GET  /api/data/:scraperId   - Get data for specific scraper
GET  /api/data/export       - Export data as JSON/CSV
```

## Implementation Priority
1. Add new API endpoints for scripts and data
2. Create tab navigation UI
3. Build Scripts tab with code viewer
4. Build Data tab with table view
5. Enhance execution monitor to show more details
