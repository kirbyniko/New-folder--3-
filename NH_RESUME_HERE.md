# NH PROGRESS - PAUSED DUE TO RATE LIMITING

## ✅ What's Working
- Event scraping from JSON endpoints (House + Senate)
- Bill extraction logic (regex patterns)
- Docket URL construction from committee mappings
- Puppeteer can successfully click "See Docket" buttons

## 🚧 What's Left
We have 1 committee mapped, need 14 more for full coverage.

### Puppeteer Script Ready
File: `tools/build-nh-mappings-puppeteer.js`

**When rate limit clears, just run:**
```bash
node tools/build-nh-mappings-puppeteer.js
```

It will:
1. Visit each event page
2. Click "See Docket" button
3. Extract ID and chapter from redirect URL
4. Output ready-to-paste TypeScript code

### Committees to Map (Priority Order)
```javascript
{ name: 'STATE VETERANS ADVISORY COMMITTEE', url: '...?event=1947&et=2' },      // 12 events
{ name: 'ASSESSING STANDARDS BOARD', url: '...?event=1905&et=2' },              // 6 events  
{ name: 'NEW HAMPSHIRE COUNCIL ON SUICIDE PREVENTION', url: '...?event=1919&et=2' },
{ name: 'EDUCATION FREEDOM SAVINGS ACCOUNT OVERSIGHT COMMITTEE', url: '...?event=1967&et=2' },
{ name: 'ADMINISTRATIVE RULES', url: '...?event=1934&et=2' },
{ name: 'INFORMATION TECHNOLOGY COUNCIL', url: '...?event=1962&et=2' },
{ name: 'HEALTH AND HUMAN SERVICES OVERSIGHT COMMITTEE', url: '...?event=1932&et=2' },
{ name: 'FISCAL COMMITTEE', url: '...?event=1930&et=2' },
// ... and 7 more
```

## 📝 When Resuming NH

1. Wait 24 hours for rate limit to clear
2. Run: `node tools/build-nh-mappings-puppeteer.js`
3. Copy output into `new-hampshire.ts` line 97 (the `knownCommittees` object)
4. Test: `npx tsx test-nh-direct.js`
5. Should see 40+ events with bills extracted

## 🎯 Current Status
- **Coverage:** 2/63 events (3%)
- **Target:** 40+/63 events (63%)
- **Blocker:** Rate limited by NH website

---
**Next up:** Try a different state with same logic pattern
