# Layout Updates - Navbar & Two-Column Design

## Summary
Major UI restructure implementing:
1. **Navbar** with ZIP code search
2. **Two-column layout** (sidebar + main content)
3. **Auto-location detection** using browser Geolocation API
4. **Organized sidebar** with collapsible filters and data sources

## New Components Created

### 1. Navbar Component (`src/components/Navbar.tsx`)
- **Purpose**: Top navigation bar with ZIP code search
- **Features**:
  - Logo/title on the left
  - ZIP search input and button
  - Sticky positioning at top
  - Responsive design
- **Props**:
  - `zipCode`: Current ZIP code value
  - `onZipCodeChange`: Handler for ZIP input changes
  - `onSearch`: Handler for form submission
  - `loading`: Boolean to disable inputs during searches

### 2. Sidebar Component (`src/components/Sidebar.tsx`)
- **Purpose**: Left column with filters and data sources
- **Features**:
  - **StateSelector**: Browse by state dropdown
  - **Filters Section**: Collapsible with scrollable content (max 400px)
  - **Data Sources Section**: Collapsible, shows calendar sources
  - **Sticky positioning**: Stays visible while scrolling
  - **Tagline**: Descriptive text at bottom
- **Props**:
  - `selectedTags`, `onTagsChange`: Tag filter state
  - `selectedState`, `onSelectState`: State selection state
  - `federalEvents`, `stateEvents`, `localEvents`: Event data for sources
  - `searchedState`: State from ZIP search
  - `calendarSources`: Array of calendar source objects
  - `userLocation`: Current search location

## Modified Components

### 3. App.tsx
**Major Changes**:
- **Removed inline ZIP search form** (moved to Navbar)
- **Added geolocation detection** on component mount:
  ```typescript
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          // Reverse geocode to ZIP
          // Set ZIP code (user clicks search)
        },
        (error) => {
          // Silently fail - no default location
        },
        { timeout: 10000 }
      )
    }
  }, [])
  ```
- **Changed initial ZIP state**: Empty string instead of '03054'
- **Updated handleStateSelect**: Converted from simple filter to async function with full fetch logic
- **Restructured layout**:
  ```tsx
  <div className="app">
    <StateSidebar />
    <Navbar />
    <div className="layout">
      <Sidebar />
      <main className="main-content">
        {/* Results, errors, empty states */}
      </main>
    </div>
    <footer />
  </div>
  ```
- **Removed inline components**: StateSelector, TagFilter, SourceLinks (now in Sidebar)

### 4. App.css
**Layout Changes**:
- `.app`: Changed to `min-height: 100vh`, flex column
- `.layout`: New grid container with `grid-template-columns: 320px 1fr`
- `.main-content`: New white card for results
- **Removed**: `.header` (title now in Navbar)
- **Updated responsive**: Grid collapses to single column on mobile

## Auto-Location Feature

### How it Works
1. **On page load**: Requests browser geolocation permission
2. **If granted**: 
   - Gets latitude/longitude
   - Reverse geocodes via OpenStreetMap Nominatim API
   - Extracts ZIP code from postal code
   - Sets ZIP in navbar input (does NOT auto-search)
3. **If denied/failed**: 
   - Silently fails
   - Leaves ZIP input empty
   - No default location set

### User Flow
1. User visits site
2. Browser asks for location permission
3. If allowed: ZIP auto-fills, user clicks search button
4. If denied: User manually enters ZIP, clicks search

## Sidebar Organization

### State Selector
- Always visible at top
- Shows selected state name (from previous fix)
- Clicking state triggers full search

### Filters Section
- **Collapsible**: Click header to toggle
- **Scrollable**: Max height 400px with custom scrollbar
- **Default**: Open on page load
- Contains: TagFilter component with all tag checkboxes

### Data Sources Section
- **Collapsible**: Click header to toggle
- **Default**: Closed on page load
- **Visibility**: Only shows when `userLocation` exists (after search)
- Contains: SourceLinks component with calendar attribution

## Two-Column Layout

### Left Column (Sidebar)
- **Width**: 320px fixed
- **Position**: Sticky (stays visible while scrolling)
- **Top offset**: 80px (below navbar)
- **Content**: StateSelector, Filters, Data Sources

### Right Column (Main Content)
- **Width**: Flexible (1fr)
- **Content**: 
  - Error messages
  - Empty states
  - Results (event count, enrichment notice, tabbed events)
  - Map (inside TabbedEvents component)

### Responsive Behavior
- **Desktop**: Two columns side-by-side
- **Mobile** (< 1024px): Single column, sidebar above content

## CSS Enhancements

### Navbar Styles (`src/components/Navbar.css`)
- Sticky positioning
- Blue gradient background
- Flexbox for logo + search
- Responsive collapse on mobile

### Sidebar Styles (`src/components/Sidebar.css`)
- White card with shadow
- Collapsible section headers with chevrons
- Custom scrollbar for filters
- Sticky positioning with calculated max-height

## Benefits

### User Experience
1. **Better Navigation**: ZIP search always accessible in navbar
2. **Better Organization**: Filters and sources in dedicated sidebar
3. **Better Discovery**: Auto-location helps new users get started
4. **Better Layout**: Map and results have more space in right column
5. **Better State Selection**: Selected state clearly visible

### Technical
1. **Cleaner Code**: Separated concerns (Navbar, Sidebar, Main)
2. **Reusable Components**: Navbar and Sidebar can be enhanced independently
3. **Better State Management**: handleStateSelect now properly async
4. **Progressive Enhancement**: Geolocation fails gracefully

## Testing Notes

### Test Scenarios
1. **Geolocation Allowed**: ZIP should auto-fill
2. **Geolocation Denied**: ZIP should be empty
3. **Manual ZIP Entry**: Should work as before
4. **State Selection**: Should trigger full search with 500mi radius
5. **Filter Collapse**: Should expand/collapse smoothly
6. **Sources Collapse**: Should expand/collapse smoothly
7. **Mobile View**: Should stack vertically

### Browser Compatibility
- **Geolocation API**: Supported in all modern browsers
- **CSS Grid**: Supported in all modern browsers
- **Sticky Positioning**: Supported in all modern browsers
- **Fallback**: Manual ZIP entry always available

## Future Enhancements

### Potential Improvements
1. **Radius Control**: Add radius slider back to sidebar
2. **Save Preferences**: Remember collapsed state in localStorage
3. **Map in Sidebar**: Optional mini-map in sidebar for context
4. **Recent Searches**: Show recent ZIP/state searches
5. **Keyboard Navigation**: Better accessibility for sidebar sections
6. **Loading States**: Better visual feedback during geolocation
7. **Error Handling**: Show toast notifications for geolocation errors

## Files Changed

### Created
- `src/components/Navbar.tsx`
- `src/components/Navbar.css`
- `src/components/Sidebar.tsx`
- `src/components/Sidebar.css`

### Modified
- `src/App.tsx` (major restructure)
- `src/App.css` (layout changes)

### Unchanged
- `src/components/StateSelector.tsx` (recently fixed)
- `src/components/TagFilter.tsx` (now used in Sidebar)
- `src/components/SourceLinks.tsx` (now used in Sidebar)
- `src/components/TabbedEvents.tsx` (now in main content)
- All backend scrapers and functions
