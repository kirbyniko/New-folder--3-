# NH Docket Page Structure Analysis

**Date:** December 14, 2025  
**Analysis Phase:** 1.1 - HTML Structure Documentation

---

## Key Findings

### Event Detail Page Structure

**URL Pattern:**
```
https://www.gencourt.state.nh.us/house/schedule/eventDetails.aspx?event={id}&et={type}
https://www.gencourt.state.nh.us/senate/schedule/eventDetails.aspx?event={id}&et={type}
```

**Example Analyzed:**
- Event ID: 635
- Name: STATE COMMISSION ON AGING
- URL: `https://www.gencourt.state.nh.us/house/schedule/eventDetails.aspx?event=635&et=2`

---

## HTML Structure

### 1. Virtual Meeting Links (Zoom)

**Location:** Inside Notes section  
**HTML Pattern:**
```html
<div id="pageBody_pnlNotes">
    <h6>Notes</h6>
    <span id="pageBody_lblHiddenNotes">
        Zoom: 
        https://us02web.zoom.us/j/87430173115?pwd=bUFER3I5emt3NGVueDBYYW9SZThLUT09
    </span><br />
</div>
```

**Selector Strategy:**
1. Look for `#pageBody_lblHiddenNotes` or `#lblHiddenNotes`
2. Extract text and find URL matching `https://[^\s<>"]+zoom\.us[^\s<>"]`+`
3. Alternative: Check for `<a href="*zoom.us*">`

**Status:** ✅ RELIABLE - Zoom links found in Notes section

---

### 2. Bills Section

**Current Observation:** Bills section exists as HTML comment but is empty for non-hearing events.

**HTML Pattern:**
```html
<!--  bills grid - only shows when bills assigned to meeting  -->
```

**Key IDs/Classes:**
- `#pageBody_pnlBills` or `#pnlBills` - Bills panel (not present when no bills)
- Bills likely rendered in GridView or table when present

**Status:** ⚠️ CONDITIONAL - Only appears during active legislative session with bill hearings

---

###3. Action Buttons

**See Docket Button:**
```html
<div id="pageBody_pnlDocket">
    <input type="submit" 
           name="ctl00$pageBody$btnDocket" 
           value="See Docket" 
           id="pageBody_btnDocket" 
           title="Docket History" 
           class="btn btn-outline-primary btn-block" /><br />
</div>
```

**Calendar Notice Button:**
```html
<div id="pageBody_pnlAgenda">
    <input type="submit" 
           name="ctl00$pageBody$btnAgenda" 
           value="Calendar Notice" 
           id="pageBody_btnAgenda" 
           title="Download Calendar Notice PDF" 
           class="btn btn-outline-primary btn-block" /><br />
</div>
```

**Status:** ✅ PRESENT - Buttons exist but may require POST request to access docket data

---

## Bill Display Patterns (Expected)

Based on NH General Court website structure, when bills ARE present:

### Expected GridView Structure:
```html
<div id="pageBody_pnlBills">
    <table class="table" id="pageBody_gvBills">
        <tr>
            <th>Bill Number</th>
            <th>Title</th>
            <th>Status</th>
        </tr>
        <tr>
            <td><a href="/bill_status/billinfo.aspx?id=1234">HB 1234</a></td>
            <td>AN ACT relative to...</td>
            <td>In Committee</td>
        </tr>
    </table>
</div>
```

### Alternative: Bill Links in Description
```html
<div class="description">
    <p>Discussion of <a href="/bill_status/billinfo.aspx?id=1234">HB 1234</a> ...</p>
</div>
```

---

## Scraping Strategy

### Phase 1: Extract Available Data (CURRENT)

✅ **Implemented:**
- Event basic info (name, date, time, location)
- Details page URL

🔄 **Next Steps:**
1. Extract Zoom links from Notes section
2. Store docket URL (same as details URL)
3. Detect presence of bills panel

### Phase 2: Bill Extraction (WHEN AVAILABLE)

When legislature is in session with bill hearings:

**Method 1: Direct Scraping**
```typescript
// Look for bills panel
const billsPanel = $('#pageBody_pnlBills, #pnlBills');
if (billsPanel.length > 0) {
  // Extract from GridView
  const bills = [];
  $('table#pageBody_gvBills tr').each((i, row) => {
    if (i === 0) return; // Skip header
    const $row = $(row);
    const billLink = $row.find('a[href*="billinfo"]');
    if (billLink.length) {
      bills.push({
        id: billLink.text().trim(),
        title: $row.find('td').eq(1).text().trim(),
        url: resolveUrl(billLink.attr('href'))
      });
    }
  });
}
```

**Method 2: Docket Page Scraping**
```typescript
// If "See Docket" button present, may need to:
// 1. Submit POST request to get docket
// 2. OR follow link to separate docket page
// 3. Parse bill list from docket view
```

**Method 3: Bill Status API** (NH may have an API)
```typescript
// Check if NH provides bill search API
// Cross-reference committee meetings with bill database
```

---

## Testing Approach

### Current Session (Dec 2025)
- ❌ No active bill hearings
- ✅ Committee meetings and conferences only
- ✅ Can test Zoom link extraction
- ❌ Cannot test bill extraction until session starts

### Test When Session Active:
1. Find events with type="hearing"
2. Verify bills panel appears
3. Test extraction selectors
4. Validate bill URLs
5. Test bill tagging

---

## Important Notes

### Legislative Calendar Context
- **New Hampshire General Court** meets January-June
- Current period (December) is interim/off-season
- Committee meetings happen year-round but bill hearings are seasonal
- Bills will appear when 2026 session starts (likely January 2026)

### Workaround for Development:
1. ✅ Implement Zoom link extraction NOW
2. ✅ Store docket URLs NOW
3. ✅ Create bill extraction framework NOW
4. ⏳ Test bill extraction in January 2026
5. ⏳ May need to scrape archived hearings for testing

### Alternative Data Sources:
- NH Bill Search: `https://www.gencourt.state.nh.us/bill_status/`
- NH LSR Search: `https://www.gencourt.state.nh.us/lsr_search/`
- May be able to query bills by committee assignment

---

## CSS Selectors Reference

```typescript
const SELECTORS = {
  // Virtual meeting
  zoomLink: '#pageBody_lblHiddenNotes, #lblHiddenNotes',
  
  // Panels
  billsPanel: '#pageBody_pnlBills, #pnlBills',
  agendaPanel: '#pageBody_pnlAgenda, #pnlAgenda',
  docketPanel: '#pageBody_pnlDocket, #pnlDocket',
  notesPanel: '#pageBody_pnlNotes, #pnlNotes',
  
  // Event info
  eventName: '#pageBody_lblEvent',
  eventRoom: '#pageBody_lblRoom',
  eventNotes: '#pageBody_lblHiddenNotes',
  
  // Bills (when present)
  billsGrid: '#pageBody_gvBills, #gvBills',
  billLinks: 'a[href*="billinfo"]',
  
  // Actions
  docketButton: '#pageBody_btnDocket',
  agendaButton: '#pageBody_btnAgenda',
  signupButton: '#pageBody_btnSignup'
};
```

---

## Next Actions

### Immediate (Can Do Now):
1. ✅ Implement Zoom link extraction
2. ✅ Store docket URL in event data
3. ✅ Add `virtualMeetingUrl` field to schema
4. ✅ Update NH scraper to include docket URL
5. ✅ Create UI button to open docket pages

### When Session Starts (January 2026):
1. Monitor for events with type="hearing"
2. Test bill extraction selectors
3. Implement bill parsing logic
4. Add bill tagging
5. Test full docket integration

### Alternative Approach:
1. Find archived hearing pages from 2025 session
2. Use for development/testing
3. Example: Search for "HB 1234" in NH bill status
4. Find committee hearings that discussed it
5. Use those URLs for testing

---

## Sample URLs for Future Testing

**When Available:**
- Bill Status: `https://www.gencourt.state.nh.us/bill_status/billinfo.aspx?id={billId}`
- Committee Page: `https://www.gencourt.state.nh.us/house/committees/committeedetails.aspx?code={code}`
- Archived Hearings: `https://www.gencourt.state.nh.us/house/schedule/` (look for past sessions)

**Search for Examples:**
```
site:gencourt.state.nh.us "HB" "hearing" "docket"
```

---

**Conclusion:** We can implement Phase 1 (Zoom links, docket URLs) immediately. Bill extraction (Phase 2) must wait for legislative session to start OR we need to find archived hearing pages for testing.
