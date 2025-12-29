# 🕷️ Generalized Scraper Platform

A powerful, flexible web scraper platform that lets you build and manage scrapers for ANY website through a visual interface or JSON configuration.

## 🎯 Features

- **Universal Scraping**: Handle any multi-page website with complex interactions
- **Visual Builder**: Chrome extension for point-and-click scraper creation
- **JSON Import/Export**: Share and version control your scraper configurations
- **Multi-Step Captures**: Handle modals, nested content, and complex UI interactions
- **PostgreSQL Storage**: Robust database schema for scraper configs and scraped data
- **Field Transformations**: Built-in data cleaning and transformation
- **Conditional Logic**: Handle dynamic page structures
- **Puppeteer Support**: Option for JavaScript-heavy sites
- **Execution History**: Track all scraper runs and results

## 📦 Setup

### 1. Install Dependencies

```powershell
cd scraper-platform
npm install
```

### 2. Setup Database

```powershell
npm run setup-db
```

This creates a PostgreSQL database named `scraper_platform` with the following tables:
- `scrapers` - Main scraper configurations
- `navigation_steps` - Sequential navigation actions
- `page_structures` - List/detail page definitions
- `scraper_fields` - Field extraction rules
- `field_selector_steps` - Multi-step field captures
- `scraper_conditions` - Conditional logic
- `scraper_runs` - Execution history
- `scraped_data` - Actual scraped data (JSONB)

### 3. Environment Variables (Optional)

Create `.env` file:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=scraper_platform
DB_USER=postgres
DB_PASSWORD=password
```

## 🚀 Quick Start

### Import Example Scraper

```powershell
npm run import ./examples/honolulu-calendar.json
```

### List All Scrapers

```powershell
npm run export  # Shows available scrapers
```

### Export a Scraper

```powershell
# By ID
npm run export 1 ./my-scraper.json

# By name
npm run export "Honolulu City Council Calendar" ./honolulu.json
```

## 📝 JSON Configuration Format

### Basic Structure

```json
{
  "name": "My Scraper",
  "description": "Scrapes data from...",
  "baseUrl": "https://example.com",
  "startUrl": "https://example.com/data",
  "requiresPuppeteer": false,
  "pageStructures": [
    {
      "pageType": "list",
      "pageName": "Main List",
      "containerSelector": ".items",
      "itemSelector": ".item",
      "fields": [
        {
          "fieldName": "title",
          "fieldType": "text",
          "isRequired": true,
          "selectorSteps": [
            {
              "stepOrder": 1,
              "actionType": "extract",
              "selector": "h2.title"
            }
          ]
        }
      ]
    }
  ]
}
```

### Field Types

- `text` - Plain text content
- `date` - Date values (with `parse_date` transformation)
- `url` - Links (extract href attributes)
- `html` - Full HTML content
- `attribute` - Custom attributes
- `number` - Numeric values

### Action Types

- `click` - Click an element
- `hover` - Hover over element
- `wait` - Wait for element/time
- `extract` - Extract data (final step)

### Transformations

- `trim` - Remove whitespace
- `lowercase` / `uppercase` - Case conversion
- `parse_date` - Convert to date
- `extract_number` - Extract numeric value

## 🎨 Visual Builder (Chrome Extension)

The platform includes a Chrome extension for building scrapers visually:

1. Open the extension on any webpage
2. Click capture buttons to select elements
3. Add multiple steps for complex interactions
4. Export JSON configuration
5. Import into the platform

### Multi-Step Capture Example

For a modal interaction:
1. Click "Event Name" capture button
2. Click the event card on the page (Step 1)
3. Click the title in the opened modal (Step 2)
4. Done! Both steps are captured

## 🗄️ Database Schema Highlights

### Flexible JSON Storage

All scraped data is stored in JSONB format:

```sql
SELECT data->>'title', data->>'date'
FROM scraped_data
WHERE scraper_id = 1;
```

### Deduplication

Built-in fingerprinting prevents duplicate records:

```sql
fingerprint VARCHAR(64) UNIQUE  -- SHA-256 hash of data
```

### Full-Text Search

GIN index on JSONB for fast queries:

```sql
SELECT * FROM scraped_data
WHERE data @> '{"committee": "Finance"}';
```

## 📊 Example Queries

### Get All Data from a Scraper

```sql
SELECT data FROM scraped_data
WHERE scraper_id = 1
ORDER BY scraped_at DESC;
```

### Find Specific Fields

```sql
SELECT 
  data->>'eventName' as name,
  data->>'eventDate' as date,
  data->>'eventUrl' as url
FROM scraped_data
WHERE scraper_id = 1
  AND data->>'eventDate' > CURRENT_DATE::text;
```

### Scraper Performance Stats

```sql
SELECT * FROM scraper_summary;
```

## 🔧 Advanced Features

### Navigation Steps

Handle pagination, date selection, filters:

```json
"navigationSteps": [
  {
    "stepOrder": 1,
    "stepType": "click",
    "selector": ".next-button",
    "waitForSelector": ".items-loaded"
  }
]
```

### Conditional Logic

Handle dynamic page structures:

```json
"conditions": [
  {
    "conditionName": "Check for modal",
    "conditionType": "element_exists",
    "selector": ".modal",
    "actionOnTrue": "use_alternative",
    "alternativeSelector": ".inline-content"
  }
]
```

### Multiple Page Types

Define different structures for list vs detail pages:

```json
"pageStructures": [
  {
    "pageType": "list",
    "pageName": "Event List",
    "fields": [/* list fields */]
  },
  {
    "pageType": "detail",
    "pageName": "Event Details",
    "fields": [/* detail fields */]
  }
]
```

## 🎯 Use Cases

- **Legislative Tracking**: City councils, state legislatures, Congress
- **Real Estate**: Property listings, rental sites
- **Job Boards**: Indeed, LinkedIn, specialized job sites
- **E-commerce**: Product catalogs, price monitoring
- **News Aggregation**: Multiple news sources
- **Research Data**: Academic databases, research portals
- **Event Calendars**: Community events, conferences
- **Government Data**: Public records, permits, inspections

## 📚 API (Coming Soon)

REST API for programmatic access:

- `GET /api/scrapers` - List all scrapers
- `POST /api/scrapers` - Create new scraper
- `GET /api/scrapers/:id` - Get scraper config
- `PUT /api/scrapers/:id` - Update scraper
- `DELETE /api/scrapers/:id` - Delete scraper
- `POST /api/scrapers/:id/run` - Execute scraper
- `GET /api/scrapers/:id/data` - Get scraped data
- `GET /api/runs/:id` - Get run details

## 🤝 Contributing

This is a generalized platform built from our legislative calendar scraper. The schema is designed to handle:

- ✅ Simple list pages
- ✅ Complex multi-page workflows
- ✅ Modal/popup interactions
- ✅ Infinite scroll
- ✅ Dynamic content loading
- ✅ Conditional page structures
- ✅ Multi-step data extraction

## 📖 Examples

See `/examples` directory for:
- `honolulu-calendar.json` - Legislative calendar
- `job-board.json` - Job listings scraper (TODO)
- `real-estate.json` - Property listings (TODO)

## 🔒 Security

- SQL injection protection (parameterized queries)
- Input validation with JSON Schema
- Rate limiting (TODO)
- User authentication (TODO)

## 📄 License

MIT

## 🙋 Support

For questions or issues, please file a GitHub issue.

---

**Built with ❤️ to make web scraping accessible to everyone**
