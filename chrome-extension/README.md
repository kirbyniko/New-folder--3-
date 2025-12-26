# Scraper Builder Chrome Extension

A Chrome extension that makes building legislative calendar scrapers as easy as clicking elements on a webpage.

## Features

- **Visual Element Selection**: Click any element to capture its CSS selector and HTML
- **Step-by-Step Wizard**: Guided flow through all required scraper components
- **Auto-fill Helpers**: One-click buttons to fill in current URL and base URL
- **Real-time Validation**: Ensures all required fields are captured
- **JSON Export**: Generates complete scraper specification ready for code generation

## Installation

### For Development

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `chrome-extension` folder
5. The extension icon will appear in your toolbar

### Usage

1. **Navigate to a legislative calendar page** you want to scrape
2. **Click the extension icon** to open the wizard
3. **Follow the steps**:
   - **Step 1**: Enter jurisdiction info, use "📍 Current URL" button to auto-fill
   - **Step 2**: Click "Month View" and navigation buttons on the page
   - **Step 3**: Click event list container, then a single event item
   - **Step 4**: Click each field within an event (name, date, time, etc.)
   - **Step 5**: (Optional) Navigate to details page and capture additional fields
   - **Step 6**: Review and export JSON

4. **Export the JSON specification** - ready to generate a scraper!

## How It Works

### Element Capture Flow

1. Click a "Capture" button in the wizard
2. The page dims with a blue overlay
3. Hover over elements to see their selector
4. Click to capture - element highlights green
5. Data is automatically saved

### What Gets Captured

For each element, the extension captures:
- **CSS Selector** (optimized for reliability)
- **HTML Structure** (sample of the element)
- **Text/Link Value** (what the element contains)
- **Attributes** (href, data-*, etc.)

### Generated JSON Structure

The extension produces a complete scraper specification including:
- Metadata (jurisdiction, state, level)
- Calendar page structure (navigation, event list)
- Event field mappings (name, date, location, etc.)
- Details page structure (agendas, bills, etc.)
- Geocoding defaults
- Rate limiting settings

## Tips

- **Start on the calendar listing page**, not a details page
- **Capture the most specific selectors** - click the exact element, not its container
- **Test navigation buttons** - the extension will verify they work
- **For containers** (event list, bill list), click the parent element that contains all items
- **For individual items**, click just one example item
- **Use ESC** to cancel a capture in progress

## Keyboard Shortcuts

- **ESC**: Cancel element capture
- **Tab**: Navigate through form fields

## Field Priority

### 🔴 Required (scraper won't work without these)
- Event name
- Date
- Event list container
- Event item selector

### 🟡 Highly Recommended (needed for usefulness)
- Time
- Location OR Virtual Meeting Link
- Details link (for enrichment)

### 🟢 Optional (nice to have)
- Committee name
- Description
- Agenda PDF link
- Bill/ordinance items

## Troubleshooting

**"Can't capture element"**
- Make sure the page has fully loaded
- Try clicking a more specific child element
- Check if the element is inside an iframe

**"Selector not specific enough"**
- The extension will find a unique selector
- If you see multiple elements highlighted, try clicking a more specific one

**"Navigation buttons don't work"**
- Some sites use JavaScript for navigation
- Check the "Requires JavaScript" box in Step 1

**"Extension not appearing"**
- Refresh the page after installing
- Check that the extension is enabled in `chrome://extensions/`

## What's Next?

After exporting the JSON:

1. **Manual scraper generation**: Use the JSON as a reference to write scraper code
2. **Automated generation** (coming soon): Feed JSON to a code generator
3. **Test with sample data**: Validate the selectors work on multiple pages
4. **Submit to community**: Share your scraper specification

## File Structure

```
chrome-extension/
├── manifest.json         # Extension configuration
├── popup.html            # Main UI wizard
├── popup.css             # UI styling
├── popup.js              # Wizard logic & data management
├── content.js            # Element capture & highlighting
├── content.css           # Content script styles
├── background.js         # Message routing
└── icons/                # Extension icons
```

## Privacy

- **No data leaves your browser** - everything is stored locally
- **No network requests** - extension works entirely offline
- **No tracking** - we don't collect any usage data

## Contributing

Found a bug? Have a feature idea?

1. Test on multiple legislative websites
2. Document edge cases
3. Submit improvements to selector generation
4. Add support for new field types

## License

MIT License - feel free to modify and distribute

---

**Made for civic tech enthusiasts who want to democratize government data access!**
