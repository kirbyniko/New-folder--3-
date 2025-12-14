# State Legislative Event Coverage Status

## Custom Scrapers (6 states) - ✅ URLs Working
1. **New Hampshire (NH)** - 63 events, dynamic URLs from API
2. **California (CA)** - 4 events, https://assembly.ca.gov/dailyfile
3. **Texas (TX)** - Custom scraper, https://capitol.texas.gov/Calendar/Meetings
4. **Florida (FL)** - Custom scraper, https://www.myfloridahouse.gov/Sections/Calendar/calendar.aspx
5. **New York (NY)** - Custom scraper, https://nyassembly.gov/leg/?sh=hear
6. **Pennsylvania (PA)** - Custom scraper, https://www.legis.state.pa.us/cfdocs/legis/home/session.cfm

## OpenStates Fallback (44 states) - ⚠️ Variable Quality

### States with Issues (Need Manual Upgrade):
- **Alaska (AK)** - Returns 20 events but all from past (January 2025)
- **Connecticut (CT)** - Returns old data from 2023
- **Many states** - Missing event URLs (OpenStates location.url field often empty)

### States Tested Working:
- **Alabama (AL)** - Has current data but events may be filtered as past
- **Arkansas (AR)** - Has future events (e.g., 2025-12-15)
- **Arizona (AZ)** - Has current events
- **Colorado (CO)** - Has current events (filtered some past ones)
- **Wyoming (WY)** - Has future events but many past

## URL Availability Status

### Custom Scrapers:
- ✅ All 6 custom scrapers now return URLs
- ✅ URLs display in UI with "View Details" link

### OpenStates States:
- ⚠️ Most states: location.url is often null/empty in API response
- ⚠️ Some states: Have URLs when present (mapped via event.location?.url)
- 📝 Need to manually verify each state and add custom scrapers where OpenStates data is poor

## Next Steps for Manual Upgrades

### Priority 1 - Large Population States Needing Custom Scrapers:
1. **Illinois (IL)** - 12.6M people
2. **Ohio (OH)** - 11.8M people  
3. **Georgia (GA)** - 10.9M people
4. **North Carolina (NC)** - 10.7M people
5. **Michigan (MI)** - 10.0M people

### Priority 2 - Fix Data Quality Issues:
1. **Connecticut (CT)** - Old data (2023), needs custom scraper
2. **Alaska (AK)** - Events filtered as past, may need date range adjustment

### Priority 3 - States with Good OpenStates Data:
- Arkansas, Arizona, Colorado, Wyoming - Keep monitoring
- Add custom scrapers only if OpenStates quality degrades

## Technical Notes

### OpenStates API Date Filtering:
- Current range: Today + 90 days
- Some states return events outside this range (past events)
- Filter: `Future: false` removes events before current date
- Filter: `NotCancelled: true` removes cancelled events

### URL Mapping:
- Custom scrapers: Use `detailsUrl` field
- OpenStates: Use `event.location?.url || null`
- UI displays when available: `{event.url && <a>View Details</a>}`

## Coverage Summary
- **Total States**: 50
- **Custom Scrapers**: 6 states (135M people)
- **OpenStates Fallback**: 44 states
- **Known Issues**: 2-3 states with old/filtered data
- **URL Coverage**: ~30-40% (custom scrapers + some OpenStates)
