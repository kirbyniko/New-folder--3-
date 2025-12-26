# Quick Start Guide

## Install the Extension

1. Open Chrome/Edge
2. Go to `chrome://extensions/` (or `edge://extensions/`)
3. Enable **Developer mode** (toggle in top-right corner)
4. Click **"Load unpacked"**
5. Select the `chrome-extension` folder from your project
6. ✅ Extension installed!

## Build Your First Scraper

### Step 1: Navigate to a Calendar Page
Visit any legislative calendar, for example:
- https://legislature.maine.gov/calendar/
- https://malegislature.gov/Events
- Your city council's meeting calendar

### Step 2: Open the Extension
Click the extension icon in your toolbar (you may need to pin it first)

### Step 3: Fill Metadata (Step 1)
- **Jurisdiction**: e.g., "City of Boston" or "State of Maine"
- **State Code**: Select from dropdown
- **Level**: State / Local / Federal
- **Calendar URL**: Click "📍 Current URL" button to auto-fill!
- **Base URL**: Click "🔗 Auto-detect" button
- Check "Requires JavaScript" if the calendar loads dynamically
- Click **"Next: Calendar Structure →"**

### Step 4: Capture Calendar Structure (Step 2)
The page will dim with a blue overlay. Now click elements:

1. **Month View Button** (optional): Click any button that switches to month view
2. **Next Month Button** (optional): Click the "Next →" or ">" button
3. **Previous Month Button** (optional): Click the "← Prev" or "<" button
4. **Event List Container** (required): Click the parent `<div>` or `<ul>` that contains ALL events
5. **Single Event Item** (required): Click on just ONE event card/row

💡 **Tip**: Hover to see what you're selecting. Press ESC to cancel.

Click **"Next: Event Fields →"**

### Step 5: Capture Event Fields (Step 3)
Now click individual fields WITHIN a single event:

**Required:**
- **Event Name**: Click the event title/heading
- **Date**: Click the date text

**Recommended:**
- **Time**: Click the time (e.g., "2:00 PM")
- **Location**: Click the location/room text
- **Committee**: Click the committee name
- **Details Link**: Click the "View Details" or "More Info" link

**Optional:**
- Description, Event Type, Virtual Meeting Link

Click **"Next: Details Page →"**

### Step 6: Details Page (Step 4) - Optional
If events have separate detail pages:

1. Check **"This site has separate detail pages"**
2. Click a details link to navigate to one
3. Capture additional fields:
   - **Agenda/PDF Link**: Click "Download Agenda" link
   - **Docket Link**: Click any docket link
   - **Virtual Meeting Link**: Click Zoom/Teams links
   - **Full Description**: Click the description text

**For Bills/Agenda Items:**
1. **Bill List Container**: Click the `<ul>` or parent containing all bills
2. **Single Bill Item**: Click just one bill
3. Within that bill, capture:
   - **Bill Number**: Click the bill number (e.g., "HB 123")
   - **Bill Title**: Click the bill title
   - **Bill Link**: Click the link to the bill

Click **"Next: Review →"**

### Step 7: Review & Export (Step 5)
- Review the summary
- Check validation results
- Preview the JSON
- Click **"💾 Export JSON"** to download
- Or **"📋 Copy to Clipboard"**

## Example: Massachusetts Legislature

1. Go to: https://malegislature.gov/Events
2. Open extension
3. Fill: "Massachusetts State Legislature", "MA", "State", current URL
4. Capture navigation: Next month button
5. Capture event list: `.eventListing` (the container)
6. Capture single event: `.eventListing-item` (one event)
7. Capture fields:
   - Name: `.eventListing-title`
   - Date: `.eventListing-date`
   - Time: `.eventListing-time`
   - Details Link: `.eventListing-title a`
8. Navigate to a detail page
9. Capture: Agenda link, description, bills list
10. Export JSON!

## Troubleshooting

**Element won't capture?**
- Try clicking more specifically (the exact text, not the container)
- Make sure page is fully loaded
- Check if it's in an iframe (won't work)

**Wrong element highlighted?**
- Click more precisely
- The extension picks the most specific element under your cursor

**Missing required fields?**
- Red border = required field not filled
- Must have: name, date, event container, event item

**Can't proceed to next step?**
- Check for red validation messages
- Ensure all required fields are captured

## What to Do with the JSON?

The exported JSON is a **scraper specification** that describes:
- What elements to look for
- Where they are on the page
- How to extract their values

You can:
1. Use it as a reference to manually write scraper code
2. Feed it to an automated scraper generator
3. Share it with the community
4. Submit it to your project's scraper repository

## Pro Tips

✅ **DO:**
- Start on the main calendar/listing page
- Click the most specific element possible
- Test on a page with multiple events
- Capture optional fields for richer data

❌ **DON'T:**
- Start on a details page
- Click too broadly (container when you want content)
- Skip required fields
- Forget to check "Requires JavaScript" for dynamic sites

## Need Help?

- Read the full README.md
- Check the SCRAPER_SPECIFICATION.md for details
- Test on multiple calendar pages
- Compare with existing scraper specifications

---

**Happy scraping! 🎯**
