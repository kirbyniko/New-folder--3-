# Testing AI Field Analysis

## Quick Test Setup

### 1. Reload Extension
```
1. Go to chrome://extensions
2. Click refresh on your extension
3. Open detached window
```

### 2. Test AI Checkbox

**Load Court Calendar Template:**
1. Click "Build" tab
2. Select "Court Calendar" template
3. Navigate to any field step
4. Scroll down past the capture button

**You should see:**
```
✅ Capture Element button
📝 Field note textarea
🤖 Purple gradient box with "Uses AI Analysis" checkbox
```

**Check the box:**
- Purple section expands
- Shows "AI Prompt Template" textarea
- Placeholder text: "e.g., Extract all dates..."
- Tip text below

### 3. Test Auto-Save

**Enter AI prompt:**
```
Extract all court hearing dates in YYYY-MM-DD format. Return as JSON array.
```

**Verify it saves:**
1. Open DevTools console (F12)
2. Check the checkbox
3. Type in prompt
4. Look for: `💾 Saved AI toggle: step1-field_name true`
5. Look for: `💾 Saved AI prompt: step1-field_name`

### 4. Test Export with AI

**Complete a scraper:**
1. Fill in all required fields
2. Check AI checkbox on one field
3. Add AI prompt
4. Click "Finish & Export"

**Verify modal shows:**
```
✅ "🤖 Generate AI Script" button (gradient purple)
✅ "View Config" button
✅ Config JSON includes aiFields object
```

**Click "View Config":**
```json
{
  "fields": {...},
  "aiFields": {
    "step1-some_field": {
      "enabled": true,
      "prompt": "Extract all dates..."
    }
  }
}
```

### 5. Test AI Generation

**Click "Generate AI Script":**
1. Should see "Generating..." message
2. Console shows 4-stage progress:
   ```
   🤖 Starting AI scraper generation...
   📊 Stage 1: Analyzing fields...
   🔄 Stage 2: Analyzing step sequences...
   🔧 Stage 3: Determining required tools...
   ⚙️ Stage 4: Generating scraper code...
   ✅ AI generation complete!
   ```
3. Generated code appears in modal
4. Code includes `analyzeWithAI()` function
5. AI fields have AI analysis calls

**Check generated code for:**
```javascript
// Should be at top
async function analyzeWithAI(content, prompt) {
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      // ... Ollama integration
    });
    // ...
  }
}

// Should be in scrape function
const fieldContent = $('selector').text();
const aiResult = await analyzeWithAI(
  fieldContent,
  'Extract all dates...' // Your prompt
);
```

## Expected Console Output

When generating AI script:
```
🤖 Starting AI scraper generation...
📊 Stage 1: Analyzing fields...
  Analyzing: base_url
  Analyzing: court_url
  Analyzing: pdf_link
  Analyzing: hearing_dates
🔄 Stage 2: Analyzing step sequences...
  Analyzing steps for: step2-pdf_link
🔧 Stage 3: Determining required tools...
  Tools: cheerio, axios, pdf-parse
⚙️ Stage 4: Generating scraper code...
✅ AI generation complete!
```

## Verify Features Checklist

- [ ] AI checkbox appears on selector fields
- [ ] Checking box expands purple section
- [ ] AI prompt textarea accepts input
- [ ] Settings auto-save to storage
- [ ] Export config includes aiFields
- [ ] Generate button checks Ollama status
- [ ] AI generation shows 4-stage progress
- [ ] Generated code includes analyzeWithAI()
- [ ] AI-enabled fields have LLM calls
- [ ] Copy/download works with AI code

## Known Working Flow

```
1. Load template ✅
2. Capture field selectors ✅
3. Check "Uses AI Analysis" ✅
4. Enter prompt: "Extract dates in YYYY-MM-DD format" ✅
5. Complete other fields ✅
6. Click "Finish & Export" ✅
7. Click "Generate AI Script" ✅
8. Wait 20-30 seconds ✅
9. See generated code with AI integration ✅
10. Copy code ✅
11. Test in Node.js environment ✅
```

## Testing with Real Scraper

### Simple Test Case

**Template:** Court Calendar
**AI Field:** hearing_dates
**Prompt:** "Extract all dates in YYYY-MM-DD format as JSON array"

**Steps:**
1. Capture court website URL
2. Capture PDF link selector
3. Mark "hearing_dates" field as AI-enabled
4. Add prompt
5. Generate script
6. Run script against real court website

**Expected generated code:**
```javascript
const pdfUrl = $('a.agenda-pdf').attr('href');
const pdfBuffer = await axios.get(pdfUrl, {responseType: 'arraybuffer'});
const pdfData = await pdfParse(pdfBuffer.data);

// AI analysis
const dates = await analyzeWithAI(
  pdfData.text,
  'Extract all dates in YYYY-MM-DD format as JSON array'
);

return {
  success: true,
  data: {
    hearing_dates: JSON.parse(dates)
  }
};
```

## Troubleshooting Test Issues

### Issue: Checkbox doesn't appear
**Check:** Reload extension, clear cache

### Issue: Prompt doesn't save
**Check:** Console for errors, verify storage permissions

### Issue: Generate button disabled
**Check:** Ollama running: `ollama list`

### Issue: Generation fails
**Check:** 
- Ollama serve running
- Model installed: `ollama pull deepseek-coder:6.7b`
- Check console for error messages

### Issue: Generated code missing AI calls
**Check:**
- AI checkbox was checked
- Prompt was entered
- Config shows aiFields object
- Re-generate if needed

## Next Steps After Testing

1. ✅ Confirm all features work
2. Test with real scraping scenario
3. Run generated script in Node.js
4. Verify AI calls work at runtime
5. Optimize prompts for accuracy
6. Document successful patterns

## Advanced Testing

### Test Multi-Field AI
1. Enable AI on 2-3 fields
2. Different prompts for each
3. Generate script
4. Verify all AI calls present

### Test Complex Prompts
1. Use JSON return format
2. Multiple data points
3. Conditional extraction
4. Verify AI understands requirements

### Test Error Handling
1. Invalid prompt
2. Ollama not running
3. Model not installed
4. Check graceful degradation
