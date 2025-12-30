# Script Execution Server

## Why This Exists

Chrome extensions cannot execute dynamically generated code due to **Content Security Policy (CSP)** restrictions. This prevents the extension from running scraper scripts directly in the browser.

**This server solves that problem** by executing scraper scripts in Node.js, where CSP restrictions don't apply.

## Quick Start

### Option 1: Double-click `start-execute.bat`

### Option 2: Command line
```bash
cd scraper-backend
npm run execute
```

The server will start on **http://localhost:3002**

## How It Works

1. **Extension generates scraper code** using AI
2. **User clicks "Test" button** in extension
3. **Extension sends script to this server** via HTTP POST
4. **Server executes script in Node.js** (with real cheerio, axios, etc.)
5. **Server returns results** to extension
6. **Extension displays results** to user

## API

### `POST /execute`

Execute a scraper script.

**Request:**
```json
{
  "scriptCode": "module.exports = async (url) => { ... }",
  "targetUrl": "https://example.com",
  "timeout": 30000
}
```

**Response (success):**
```json
{
  "success": true,
  "data": { /* scraped data */ },
  "logs": ["console output..."],
  "duration": 1234
}
```

**Response (error):**
```json
{
  "success": false,
  "error": "Error message",
  "stack": "Error stack trace",
  "logs": ["console output..."],
  "duration": 123
}
```

## Available Libraries

Scripts can use:
- **cheerio** - HTML parsing and manipulation
- **axios** - HTTP requests
- **analyzeWithAI** - AI-powered content analysis (via Ollama)

## Security

- Runs on localhost only
- No external network access except via axios
- Scripts execute in isolated Node.js context
- 30-second timeout prevents infinite loops

## Troubleshooting

**"Backend Server Not Running" error in extension:**
- Make sure this server is running (`npm run execute`)
- Check http://localhost:3002 is accessible
- Look for firewall/antivirus blocking

**Script execution fails:**
- Check server console for detailed logs
- Verify script syntax (must export function via `module.exports`)
- Ensure target URL is accessible

**Timeout errors:**
- Increase timeout in request body
- Check if target website is slow/down
- Simplify scraper logic

## Development

**Add new libraries:**
1. `npm install <library>` in scraper-backend
2. Add to `require()` function in `execute-server.ts`

**Modify timeout:**
- Default: 30 seconds
- Override per-request in POST body
- Change server default in `execute-server.ts`

## Architecture

```
┌─────────────────┐
│  Chrome Ext     │ (CSP restrictions)
│  - Generates    │
│  - Displays     │
└────────┬────────┘
         │ HTTP POST
         ▼
┌─────────────────┐
│  Execute Server │ (No CSP - can use eval/Function)
│  - Executes     │
│  - Returns data │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Target Website │
│  - Scrapes data │
└─────────────────┘
```

## Future Enhancements

- [ ] Rate limiting per domain
- [ ] Caching of scraped data
- [ ] Parallel execution queue
- [ ] Browser automation via Puppeteer
- [ ] Proxy support
- [ ] Authentication handling
