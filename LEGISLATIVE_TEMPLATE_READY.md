# ✅ Legislative Calendar Template - Ready to Import

## What Was Created

**File**: `chrome-extension/examples/legislative-calendar-template.json`

A complete, production-ready legislative calendar scraper template with:

### 5-Step Builder Workflow

#### Step 1: Metadata (📋)
- Form mode for entering basic information
- Fields:
  - Jurisdiction Name (text)
  - State Code (select dropdown)
  - Level (radio: state/local/federal)
  - Calendar URL (auto-fills from current page)
  - Base URL (auto-fills from domain)
  - Requires Puppeteer (radio: yes/no/unknown)
  - Notes (textarea)

#### Step 2: Calendar Structure (📅)
- Capture mode for clicking page elements
- **Navigation Group** (optional):
  - Month View Button
  - Next Month Button
  - Previous Month Button
- **Event List Group**:
  - Has event list checkbox
  - Event List Container selector
  - Single Event Item selector

#### Step 3: Event Fields (📝)
- Capture mode for data extraction
- **Required Fields**:
  - Event Name ✓
  - Date ✓
- **Recommended Fields**:
  - Time
  - Location
  - Committee
  - Details Link
- **Optional Fields**:
  - Description
  - Event Type
  - Virtual Meeting Link

#### Step 4: Details Page (🔍)
- Capture mode for detail pages (optional step)
- **Details Page Fields**:
  - Has details page checkbox
  - Agenda/PDF Link
  - Docket Link
  - Virtual Meeting Link
  - Full Description
- **Bills/Agenda Items**:
  - Bill List Container
  - Single Bill Item
- **Bill Fields**:
  - Bill Number
  - Bill Title
  - Bill Link

#### Step 5: Review & Export (✅)
- Shows summary of all captured data
- Validation checks
- Preview of generated scraper
- Export as JSON

### Storage Configuration

Uses the **unified events table** architecture:

```json
{
  "table": "events",
  "eventType": "legislative_calendar",
  "scraperSource": "custom_legislative",
  "useMetadata": true
}
```

**Core Fields** (events table columns):
- name, date, time, location_name
- description, details_url, source_url

**Metadata Fields** (JSONB):
- committee_name, bill_numbers, chair
- meeting_type, agenda_url, virtual_meeting_url

## How to Test

### Method 1: Import via Modal (Recommended)
1. Open Chrome Extension
2. Go to **Template Creator** tab
3. Click "📥 Import from JSON"
4. Click "📁 Import from File"
5. Select `legislative-calendar-template.json`
6. ✅ Success message appears
7. Click "→ View in Library"
8. Verify template shows with **EXAMPLE** badge

### Method 2: Import via Clipboard
1. Open `legislative-calendar-template.json` in editor
2. Copy entire file contents (Ctrl+A, Ctrl+C)
3. Open Chrome Extension
4. Go to **Template Creator** tab
5. Click "📥 Import from JSON"
6. Click "📋 Paste from Clipboard"
7. Paste JSON (Ctrl+V)
8. Click "✅ Import"
9. ✅ Success message appears

### Method 3: View in Library Directly
1. Open Chrome Extension
2. Go to **Library** tab
3. Click "🔄 Refresh Templates"
4. Should see "Legislative Calendar Scraper" with:
   - 📋 **EXAMPLE** badge (green)
   - Description: "Default template for scraping legislative/government meeting calendars..."
   - Type: legislative_calendar
   - Steps: 5

## What Makes This Template "Work Perfectly"

### ✅ Complete Structure
- All 5 steps properly defined
- Clear progression: Metadata → Structure → Fields → Details → Review
- Proper field types for each input (text, select, radio, checkbox, selector)

### ✅ Unified Events Table
- Uses new architecture with `eventType` and `scraperSource`
- Proper field mapping to core columns and metadata JSONB
- No table creation needed - works immediately

### ✅ Flexible Field Capture
- Required vs optional fields clearly marked
- Multiple capture modes (form vs element selection)
- Support for nested structures (bills, agenda items)
- Details page handling for multi-step scraping

### ✅ Production Ready
- Based on actual database migration template
- Same structure as will be used by all legislative scrapers
- Proper validation and error handling
- Auto-fill capabilities for common fields

### ✅ User-Friendly
- Clear labels and instructions
- Logical field grouping
- Step-by-step guidance
- Icons for visual clarity

## Comparison to Court Calendar Example

| Feature | Legislative | Court Calendar |
|---------|-------------|----------------|
| Steps | 5 | 5 |
| Capture Modes | Yes (Steps 2-4) | Yes (Steps 2-4) |
| Detail Pages | Yes (Step 4) | Yes (Step 4) |
| Nested Items | Bills/Agenda | Cases/Dockets |
| Metadata Fields | 6 | 4 |
| Complexity | Higher (bills) | Medium (cases) |

## Files Modified

1. **chrome-extension/examples/legislative-calendar-template.json** (NEW)
   - Complete 5-step builder template
   - 311 lines of properly formatted JSON
   - Ready to import and use

2. **chrome-extension/popup-library.js** (UPDATED)
   - Line 74: Added 'legislative-calendar-template.json' to exampleFiles array
   - Now loads both legislative and court calendar examples

## Next Steps After Import

1. **Start Building a Scraper**:
   - Go to Library tab
   - Click "Use Template" on Legislative Calendar
   - Gets loaded into Template Creator
   - Navigate to a legislative site
   - Start capturing selectors

2. **Customize the Template**:
   - Add/remove fields as needed
   - Adjust field groups
   - Modify capture modes
   - Export customized version

3. **Save to Database**:
   - After customizing, save template
   - Will appear with DATABASE badge
   - Available across all users

## Validation Checklist

Test after importing:

- [ ] Template appears in Library tab
- [ ] Shows correct name: "Legislative Calendar Scraper"
- [ ] Shows correct description
- [ ] Badge shows "EXAMPLE" (green)
- [ ] Type shows: legislative_calendar
- [ ] Steps shows: 5
- [ ] Click "Use Template" loads into Template Creator
- [ ] All 5 steps are present in Template Creator
- [ ] Step 1 fields are form inputs (not capture mode)
- [ ] Steps 2-4 fields have capture mode enabled
- [ ] Step 5 shows Review & Export
- [ ] Storage config shows unified events table
- [ ] Can export back to JSON successfully

---

**Status**: ✅ READY TO USE

**Import Now**: Use the new modal UI to import `legislative-calendar-template.json`!
