# Manual Capture Template Guide

## Overview

The Chrome extension's manual capture feature allows you to **click elements on a webpage** to generate a JSON template with discovered selectors. This speeds up scraper building by giving the AI agent **helpful hints** about where data lives.

## Important: Templates are Flexible Hints

🎯 **Key Concept:** The agent treats templates as **starting points, not rigid rules**. It will:
- Use provided selectors as hints
- Verify selectors still work (websites change!)
- **Discover additional fields** not in the template
- Build a complete scraper with all available data

## Workflow

### 1. Capture Elements in Extension

```
1. Navigate to target website (e.g., city council calendar)
2. Click "Capture" in extension
3. Click elements on page:
   - Event title → Captures "h2.event-title"
   - Event date → Captures ".event-date"
   - Event location → Captures ".event-location"
4. Click "View" to see captured template
```

### 2. Send to Agent

Click the **🤖 Send to Agent** button in the viewer modal. This copies a clean prompt to clipboard:

```
Build a scraper using this template as a starting point. The selectors in selectorSteps are hints to help you - verify they work and discover any additional fields not listed here:

{
  "name": "Honolulu Council Scraper",
  "startUrl": "https://www.honolulu.gov/clerk/clk-council-calendar/",
  "pageStructures": [{
    "containerSelector": ".calendar-container",
    "itemSelector": ".event-row",
    "fields": [
      {"fieldName": "title", "selectorSteps": [{"selector": "h2.event-title"}]},
      {"fieldName": "date", "selectorSteps": [{"selector": ".event-date"}]}
    ]
  }]
}

Important:
- Use the provided selectors as hints, but verify they still work
- Inspect the HTML to find additional fields not in this template
- Build a complete scraper that captures ALL available data, not just these fields
```

### 3. Agent Behavior

The agent will:

1. **Extract hints:** "Okay, title is probably at `h2.event-title`, date at `.event-date`"
2. **Fetch HTML:** Use `execute_code` to inspect actual page structure
3. **Verify selectors:** Test if `h2.event-title` and `.event-date` still work
4. **Discover more fields:**
   - "I see `.event-location` - add location field"
   - "I see `a.agenda-link` - add agenda_url field"
   - "I see `.meeting-status` - add status field"
5. **Build complete scraper:** All fields found (not just template fields)

## Example: Template vs Final Scraper

**Manual Capture Template (2 fields):**
```json
{
  "fields": [
    {"fieldName": "title", "selectorSteps": [{"selector": "h2.event-title"}]},
    {"fieldName": "date", "selectorSteps": [{"selector": ".event-date"}]}
  ]
}
```

**Agent's Final Scraper (5 fields - discovered 3 more!):**
```javascript
const events = [];
$('.event-row').each((i, item) => {
  events.push({
    title: $(item).find('h2.event-title').text().trim(),  // From template
    date: $(item).find('.event-date').text().trim(),      // From template
    location: $(item).find('.event-location').text().trim(), // DISCOVERED
    agenda_url: $(item).find('a.agenda-link').attr('href'), // DISCOVERED
    status: $(item).find('.meeting-status').text().trim()   // DISCOVERED
  });
});
```

## Benefits

### Token Efficiency
- **Without template:** Agent fetches HTML (1,500 tokens) → analyzes structure → discovers selectors
- **With template:** Agent gets selector hints → quick verification → discovery phase
- **Savings:** ~500-1,000 tokens per scraper generation

### Faster Generation
- Template provides starting point
- Agent skips initial discovery phase for known fields
- Still performs complete field discovery for additional data

### Higher Accuracy
- Selectors verified by human clicking (you)
- Agent has known-good starting points
- Reduces false selector matches

## Best Practices

### ✅ DO:
- Capture 2-3 key fields (title, date, location)
- Let agent discover additional fields
- Trust agent to verify selectors work

### ❌ DON'T:
- Try to capture every possible field manually
- Assume template is complete (agent will find more)
- Skip verification (websites change)

## Technical Details

### Button Implementation (popup-library.js)

```javascript
// "Send to Agent" button builds clean prompt
document.getElementById('send-to-agent').addEventListener('click', () => {
  const cleanJSON = JSON.stringify({
    name: scraper.name,
    startUrl: scraper.startUrl,
    pageStructures: scraper.pageStructures
  }, null, 2);
  
  const prompt = `Build a scraper using this template as a starting point...
${cleanJSON}

Important:
- Use provided selectors as hints, verify they work
- Inspect HTML to find additional fields
- Build complete scraper with ALL available data`;
  
  navigator.clipboard.writeText(prompt);
});
```

### Agent Context (context-manager.ts)

```typescript
## USING MANUAL CAPTURE TEMPLATES (FLEXIBLE HINTS)
If user provides JSON with selectorSteps, treat as HELPFUL HINTS, NOT RULES:

**CRITICAL - Templates are STARTING POINTS:**
1. Extract selectors from selectorSteps[].selector fields
2. Verify selectors still work (websites change!)
3. Look for additional fields not in template
4. Inspect actual HTML to find what template missed
5. Build complete scraper with ALL fields found
```

## Troubleshooting

### "Selectors don't work anymore"
**Cause:** Website structure changed since capture
**Solution:** Agent will detect this and discover new selectors

### "Agent only returned template fields"
**Cause:** Agent didn't inspect HTML for additional fields
**Solution:** Explicitly ask: "Inspect HTML and find all available fields"

### "Too many fields in template"
**Cause:** Manually captured every field (slow, unnecessary)
**Solution:** Capture 2-3 key fields, let agent discover rest

## Summary

Manual capture templates are **shortcuts, not complete specifications**:
- 🎯 Provide helpful hints to speed up initial discovery
- 🔍 Agent verifies hints and discovers additional fields
- ✅ Result: Complete scraper with all data, built faster
- 💰 Token savings: ~500-1,000 tokens per generation

**Remember:** The goal is to help the agent, not replace it. Capture a few key fields, then let the agent do what it does best - complete field discovery and verification.
