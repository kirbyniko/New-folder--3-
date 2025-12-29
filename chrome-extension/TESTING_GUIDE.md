# Testing the Template Workflow

## 🧪 Complete Test Flow

### 1️⃣ Start the API Server
```powershell
cd scraper-platform
npm start
```
Server runs on http://localhost:3001

### 2️⃣ Import the Example Template

**Option A: Import from File**
1. Open Chrome Extension → **Template Creator** tab
2. Click **"📥 Import from JSON"**
3. Choose **"OK"** (Import from file)
4. Navigate to: `chrome-extension/examples/court-calendar-example.json`
5. Click **Open**
6. ✅ See success message: "Imported template... **View in Library**"
7. Click the **"View in Library"** link

**Option B: Copy-Paste JSON**
1. Open `court-calendar-example.json` in editor
2. Copy all JSON content (Ctrl+A, Ctrl+C)
3. Open Chrome Extension → **Template Creator** tab
4. Click **"📥 Import from JSON"**
5. Choose **"Cancel"** (Paste from clipboard)
6. Browser reads clipboard automatically OR paste in prompt
7. ✅ See success message with **"View in Library"** link

### 3️⃣ View in Library Tab

After clicking "View in Library" link, you'll see:

```
📚 Scraper Library                    🔄 Refresh
Templates from database and examples
____________________________________________

📝 Templates (Click to Use)

┌─────────────────────────────────────────┐
│ Court Calendar Scraper - Example 📁 EXAMPLE │
│ Example template for scraping court     │
│ calendars with case numbers...          │
│ Type: court_calendar • Steps: 5         │
│ [✨ Use Template] [👁️ View]            │
└─────────────────────────────────────────┘
```

### 4️⃣ Save Template to Database

1. While still in **Template Creator** tab (with imported template loaded)
2. Scroll down to **"💾 Save Template to Database"** button
3. Click it
4. ✅ See success: "Template saved to database! **View in Library**"
5. Click **"View in Library"** link

### 5️⃣ Verify Database Template

After saving and viewing Library:

```
📝 Templates (Click to Use)

┌─────────────────────────────────────────┐
│ Court Calendar Scraper - Example 💾 DATABASE │  ← Blue badge!
│ Example template for scraping court     │
│ calendars with case numbers...          │
│ Type: court_calendar • Steps: 5         │
│ [✨ Use Template] [👁️ View]            │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Court Calendar Scraper - Example 📁 EXAMPLE │  ← Green badge!
│ (same template from file)                │
└─────────────────────────────────────────┘
```

**You'll see TWO versions:**
- 💾 **DATABASE** (blue) - From PostgreSQL database
- 📁 **EXAMPLE** (green) - From examples/ folder

### 6️⃣ Use the Template

1. Click **"✨ Use Template"** on either version
2. Template loads into **Build** tab
3. You can now use it to build a scraper!

### 7️⃣ Refresh to Check Updates

1. Go to **Template Creator** tab
2. Create a new template or modify existing
3. Click **"💾 Save Template to Database"**
4. Switch to **Library** tab
5. Click **"🔄 Refresh"** button
6. New template appears with **💾 DATABASE** badge!

## 🎯 What You Should See

### Template Creator Tab
- Import button works (file picker OR clipboard paste)
- Success message with clickable link
- Link navigates to Library tab
- Save button sends to database API

### Library Tab
- Shows templates from database (blue badge)
- Shows templates from examples/ folder (green badge)
- Displays description and metadata
- Refresh button reloads from database
- Use Template button works
- View button shows JSON

### Build Tab
- Templates load when you click "Use Template"
- 5-step wizard appears
- Fields populate from template

## 🐛 Troubleshooting

**"Could not load templates from database"**
- Check API server is running: `npm start` in scraper-platform/
- Verify http://localhost:3001/api/templates returns JSON

**"Template not showing in Library"**
- Click the **🔄 Refresh** button
- Check console for errors (F12 → Console tab)
- Verify template saved successfully (green success message)

**"Import button does nothing"**
- Check browser console for errors
- Ensure JSON is valid (use JSONLint.com to validate)
- Try the other import method (file vs clipboard)

**"DATABASE badge not showing"**
- Refresh the Library tab (click 🔄 Refresh)
- Verify API returned templates: Open DevTools → Network → Check /api/templates response

## ✅ Success Checklist

- [ ] API server running on localhost:3001
- [ ] Import from file works
- [ ] Import from clipboard works
- [ ] Success message shows "View in Library" link
- [ ] Clicking link switches to Library tab
- [ ] Template appears in Library (green EXAMPLE badge)
- [ ] Save to Database works
- [ ] Template appears with blue DATABASE badge
- [ ] Refresh button reloads templates
- [ ] Use Template button loads into Build tab
- [ ] Can see 5 steps with all fields

## 📊 Expected Results

**After Full Test:**
- 4 example templates (green badges)
- 1+ database templates (blue badges)
- Total 5+ templates in Library
- All clickable and functional

**Database Check:**
```sql
SELECT id, name, description, 
       jsonb_array_length(steps) as step_count
FROM builder_templates;
```

Should show your saved templates!
