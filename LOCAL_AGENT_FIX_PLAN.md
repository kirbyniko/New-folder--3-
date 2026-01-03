# Local Agent Fix Plan (No API Keys)

**Date:** 2026-01-02  
**Constraint:** Must work 100% locally with Ollama (no API keys, no external services)

---

## Current Situation

### What Works
- ✅ `/manual-agent` endpoint generates scrapers quickly
- ✅ Code is returned to frontend
- ✅ Ollama running locally (llama3-groq-tool-use)
- ✅ Validation loop architecture exists (validation-loop.ts)
- ✅ Test scraper tool exists (test_scraper in langchain-agent.ts)

### What Doesn't Work
- ❌ Generated scrapers fail (extract 0 items or wrong data)
- ❌ No testing happens before returning code
- ❌ No iteration to fix failures
- ❌ Manual endpoint just guesses selectors and returns untested code

### Root Cause
**Ollama models cannot execute tools through LangChain's ReAct agent** (architectural incompatibility). Instead of fixing this, we bypassed ALL intelligence with `/manual-agent` which has zero testing.

---

## Solution: Add Validation Loop to Manual Endpoint

**Strategy:** Keep manual scraper generation (fast) but add testing and iteration (intelligent)

### Architecture

```
User clicks AI Agent
       ↓
Frontend → /manual-agent-validated (NEW endpoint)
       ↓
┌─────────────────────────────────────┐
│  Validation Loop (max 5 attempts)  │
│                                     │
│  FOR attempt = 1 to 5:              │
│    1. Generate scraper code         │
│       - Fetch HTML if first attempt │
│       - Use previous HTML on retries│
│       - Build code with selectors   │
│                                     │
│    2. Test the code                 │
│       - POST to execute server      │
│       - Run scraper on real URL     │
│       - Check results               │
│                                     │
│    3. Validate results              │
│       - Did it extract items?       │
│       - Do all fields have data?    │
│       - Are values reasonable?      │
│                                     │
│    4. If PASS → Return code         │
│                                     │
│    5. If FAIL → Analyze & retry     │
│       - Parse HTML for actual       │
│         selectors that exist        │
│       - Ask Ollama: "Given this     │
│         HTML structure and these    │
│         failed selectors, suggest   │
│         better CSS selectors"       │
│       - Regenerate with new         │
│         selectors                   │
│                                     │
│  END FOR                            │
│                                     │
│  If all attempts fail:              │
│    Return best attempt + error log  │
└─────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Add Testing to Manual Endpoint (30 min)

**File:** `scraper-backend/src/langchain-server.ts`

**Current flow:**
```typescript
/manual-agent:
  1. Fetch HTML
  2. Build scraper code
  3. Return code immediately ← NO TESTING
```

**New flow:**
```typescript
/manual-agent-validated:
  1. Fetch HTML
  2. Build scraper code
  3. TEST CODE via execute server ← NEW
  4. Validate results ← NEW
  5. If pass → return code
  6. If fail → continue to retry logic
```

**Code to add after line 640:**
```typescript
// Test the generated scraper
const testResult = await fetch('http://localhost:3002/run', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    code: scraperCode,
    args: [url]
  })
});

const testData = await testResult.json();

if (!testData.success) {
  // Execution failed - try again with different approach
  console.log('❌ Test execution failed:', testData.error);
  // CONTINUE TO RETRY LOGIC
} else {
  const items = testData.result || [];
  console.log(`📊 Test extracted ${items.length} items`);
  
  if (items.length === 0) {
    // No items found - selectors don't match
    console.log('❌ No items extracted - selectors failed');
    // CONTINUE TO RETRY LOGIC
  } else {
    // Check if all required fields have data
    const firstItem = items[0];
    const missingFields = validFields.filter(field => 
      !firstItem[field] || firstItem[field].trim() === ''
    );
    
    if (missingFields.length > 0) {
      console.log('❌ Missing data for fields:', missingFields);
      // CONTINUE TO RETRY LOGIC
    } else {
      // SUCCESS! All fields extracted with data
      console.log('✅ Validation passed!');
      res.write(`data: ${JSON.stringify({ 
        type: 'complete', 
        output: scraperCode,
        validated: true,
        itemCount: items.length
      })}\n\n`);
      res.end();
      return;
    }
  }
}
```

---

### Phase 2: Add HTML Analysis for Selector Discovery (1 hour)

When test fails, we need better selectors. Use Ollama to analyze HTML structure.

**Function to add:**
```typescript
async function findSelectorsWithOllama(
  html: string, 
  fieldsRequired: string[], 
  previousAttempt?: { selectors: any, error: string }
): Promise<Record<string, string>> {
  
  // Extract a sample of the HTML structure (first 10 items)
  const $ = cheerio.load(html);
  const bodySnippet = $('body').html()?.substring(0, 5000) || '';
  
  // Build prompt for Ollama
  const prompt = `You are analyzing HTML to find CSS selectors for web scraping.

HTML STRUCTURE:
${bodySnippet}

FIELDS TO EXTRACT:
${fieldsRequired.map(f => `- ${f}`).join('\n')}

${previousAttempt ? `
PREVIOUS ATTEMPT FAILED:
Selectors used: ${JSON.stringify(previousAttempt.selectors, null, 2)}
Error: ${previousAttempt.error}
` : ''}

Analyze the HTML and provide CSS selectors for each field.
Return ONLY valid JSON in this exact format:
{
  "containerSelector": ".item-class or tr or article",
  "fields": {
    "fieldName": ".field-selector or [attribute]",
    ...
  }
}

Requirements:
- containerSelector must match repeating items
- Each field selector is relative to container
- Use classes, IDs, or attributes visible in HTML
- Be specific to avoid false matches`;

  // Call Ollama
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3-groq-tool-use',
      prompt: prompt,
      stream: false,
      temperature: 0.1
    })
  });
  
  const data = await response.json();
  const responseText = data.response || '';
  
  // Parse JSON from response
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Ollama did not return valid JSON');
  }
  
  const selectors = JSON.parse(jsonMatch[0]);
  return selectors;
}
```

---

### Phase 3: Implement Retry Loop (1 hour)

**Wrap the manual endpoint logic in a loop:**

```typescript
app.post('/manual-agent-validated', async (req, res) => {
  const MAX_ATTEMPTS = 5;
  const { task, config } = req.body;
  const { fieldsRequired = [] } = config;
  const url = extractUrl(task);
  
  // Extract field names
  const validFields = fieldsRequired
    .map(f => typeof f === 'string' ? f : f.fieldName || f.name || f.field)
    .filter(f => f && typeof f === 'string');
  
  // Fetch HTML once
  const htmlResponse = await axios.get(url);
  const html = htmlResponse.data;
  
  let bestAttempt = { code: '', itemCount: 0, error: '' };
  let previousSelectors = null;
  
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log(`\n🔄 Attempt ${attempt}/${MAX_ATTEMPTS}`);
    res.write(`data: ${JSON.stringify({ 
      type: 'info', 
      message: `🔄 Attempt ${attempt}/${MAX_ATTEMPTS}` 
    })}\n\n`);
    
    // Get selectors
    let selectors;
    if (attempt === 1) {
      // First attempt: use simple heuristics
      selectors = guessSelectorsFromFieldNames(validFields);
    } else {
      // Subsequent attempts: ask Ollama
      selectors = await findSelectorsWithOllama(
        html, 
        validFields,
        previousSelectors
      );
    }
    
    // Build scraper with these selectors
    const scraperCode = buildScraperCode(url, validFields, selectors);
    
    // Test it
    const testResult = await testScraper(scraperCode, url);
    
    if (testResult.success && testResult.itemCount > 0) {
      // Check if all fields have data
      const validation = validateFields(testResult.items[0], validFields);
      
      if (validation.allFieldsHaveData) {
        // SUCCESS!
        console.log(`✅ Success on attempt ${attempt}!`);
        res.write(`data: ${JSON.stringify({ 
          type: 'complete', 
          output: scraperCode,
          validated: true,
          attempts: attempt,
          itemCount: testResult.itemCount
        })}\n\n`);
        res.end();
        return;
      } else {
        // Partial success - some fields missing
        console.log(`⚠️ Partial success: ${validation.missingFields.length} fields missing`);
        if (testResult.itemCount > bestAttempt.itemCount) {
          bestAttempt = { 
            code: scraperCode, 
            itemCount: testResult.itemCount,
            error: `Missing fields: ${validation.missingFields.join(', ')}`
          };
        }
        previousSelectors = { 
          selectors, 
          error: `Missing: ${validation.missingFields.join(', ')}` 
        };
      }
    } else {
      // Failed completely
      console.log(`❌ Attempt ${attempt} failed: ${testResult.error}`);
      previousSelectors = { selectors, error: testResult.error };
    }
  }
  
  // All attempts failed - return best attempt
  console.log(`❌ All ${MAX_ATTEMPTS} attempts failed`);
  res.write(`data: ${JSON.stringify({ 
    type: 'complete', 
    output: bestAttempt.code,
    validated: false,
    attempts: MAX_ATTEMPTS,
    error: 'Could not validate scraper - returning best attempt',
    itemCount: bestAttempt.itemCount
  })}\n\n`);
  res.end();
});
```

---

### Phase 4: Update Frontend (5 min)

**File:** `sdk-demo/src/components/ScraperAgentUI.js`

**Change line 199:**
```javascript
// OLD:
const response = await fetch('http://localhost:3003/manual-agent', {

// NEW:
const response = await fetch('http://localhost:3003/manual-agent-validated', {
```

---

## Benefits of This Approach

### Advantages
1. ✅ **100% Local** - No API keys, uses only Ollama
2. ✅ **Fast First Attempt** - Simple heuristics for common patterns
3. ✅ **Intelligent Retries** - Uses Ollama to analyze HTML when needed
4. ✅ **Validated Output** - Code is tested before returning
5. ✅ **Graceful Degradation** - Returns best attempt if all fail
6. ✅ **Progress Visibility** - User sees each attempt via SSE

### What This Gives You
- **Testing:** Every scraper is executed before returning
- **Validation:** Checks that all fields extract actual data
- **Iteration:** Up to 5 attempts with improving selectors
- **Intelligence:** Ollama analyzes HTML structure when heuristics fail
- **Reliability:** Only returns validated code (or clearly marked best attempt)

---

## Expected Behavior

### Success Case (Simple Website)
```
Attempt 1:
  - Generate scraper with heuristic selectors (.event, .date, etc.)
  - Test scraper → Extracts 12 items
  - Validate → All 6 fields have data
  - ✅ Return code (validated: true)
Time: ~5 seconds
```

### Success Case (Complex Website)
```
Attempt 1:
  - Generate with heuristics
  - Test → 0 items
  - ❌ Selectors don't match

Attempt 2:
  - Ask Ollama to analyze HTML
  - Get suggested selectors: { container: "tr.meeting-row", ... }
  - Test → 8 items extracted
  - Validate → Missing "agenda_url" field
  - ⚠️ Partial success

Attempt 3:
  - Ask Ollama again with feedback about missing field
  - Get refined selectors
  - Test → 8 items, all fields present
  - ✅ Return code (validated: true, attempts: 3)
Time: ~15 seconds
```

### Failure Case
```
Attempts 1-5:
  - Various selector strategies
  - Best attempt: 3 items, 4/6 fields

Response:
  - Returns best attempt code
  - validated: false
  - error: "Could not validate scraper - returning best attempt"
  - User can manually inspect and fix
Time: ~30 seconds
```

---

## Implementation Checklist

- [ ] **Phase 1:** Add testing logic after code generation
  - Test via execute server
  - Validate item count > 0
  - Validate all fields have data
  
- [ ] **Phase 2:** Add Ollama HTML analysis function
  - Extract HTML snippet
  - Build analysis prompt
  - Parse selector suggestions from Ollama response
  
- [ ] **Phase 3:** Wrap in retry loop
  - Max 5 attempts
  - First attempt: heuristics
  - Subsequent: Ollama analysis
  - Track best attempt
  - Return validated or best attempt
  
- [ ] **Phase 4:** Update frontend endpoint
  - Change to `/manual-agent-validated`
  - Handle new response format (validated flag)
  
- [ ] **Testing:** Verify on real websites
  - Simple site (should pass attempt 1)
  - Complex site (should pass after 2-3 attempts)
  - Dynamic site (may fail, return best attempt)

---

## File Changes Required

### 1. `scraper-backend/src/langchain-server.ts`
- Add `/manual-agent-validated` endpoint (~200 lines)
- Add `findSelectorsWithOllama()` function (~80 lines)
- Add `testScraper()` helper function (~30 lines)
- Add `validateFields()` helper function (~20 lines)
- Add `buildScraperCode()` helper function (~40 lines)
- Keep `/manual-agent` as fallback (no changes)

### 2. `sdk-demo/src/components/ScraperAgentUI.js`
- Line 199: Change endpoint URL (1 line)
- Lines 248-280: Handle new response format with `validated` flag (add check)

### 3. No other files need changes
- validation-loop.ts: Keep as reference but not used
- langchain-agent.ts: Keep as reference but not used
- execute-server.ts: Already works, no changes

---

## Timeline

- **Phase 1 (Testing):** 30 minutes
- **Phase 2 (Ollama Analysis):** 1 hour  
- **Phase 3 (Retry Loop):** 1 hour
- **Phase 4 (Frontend):** 5 minutes
- **Testing & Debug:** 1 hour

**Total:** ~3.5 hours

---

## Alternative: Simpler Version (No Ollama Analysis)

If you want something faster to implement:

### Simplified Approach (1 hour implementation)
1. Keep manual selector guessing
2. Add testing after generation
3. If test fails, try 3 predetermined selector strategies:
   - Strategy 1: Class-based (`.time`, `.date`)
   - Strategy 2: Table-based (`tr > td:nth-child(N)`)
   - Strategy 3: Attribute-based (`[data-time]`, `[data-date]`)
4. Return first one that validates

**Pros:** 
- Faster to implement (no Ollama prompting logic)
- Still gets validation and iteration
- Works for ~70% of sites

**Cons:**
- Less intelligent (fixed strategies)
- Won't adapt to unique HTML structures
- Lower success rate on complex sites

---

## Decision Point

**Choose your approach:**

### Option B (Recommended): Full Implementation
- 3.5 hours
- Uses Ollama for intelligent HTML analysis
- Higher success rate
- Better for production use

### Option B-Simple: Simplified Implementation  
- 1 hour
- Fixed selector strategies
- Good enough for testing
- Can upgrade to full later

**Both are 100% local. Both add validation. Both iterate on failure.**

Ready to implement when you give the go-ahead.
