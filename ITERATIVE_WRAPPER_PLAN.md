# Iterative Wrapper Implementation Plan

**Date:** 2026-01-02  
**Goal:** Add intelligent supervisor layer that detects and fixes systemic failures across validation loop attempts

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│           ITERATIVE WRAPPER (Supervisor)                    │
│  - Monitors validation loop execution                       │
│  - Detects failure patterns (e.g., 5x same error)          │
│  - Applies systematic fixes                                 │
│  - Re-runs validation loop with corrections                 │
│  - Max 3 supervisor iterations                              │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────────┐
│       VALIDATION LOOP (Worker)                              │
│  - Attempts 1-5: Generate → Test → Validate                │
│  - Returns: {validated, code, error, attempts}              │
└─────────────────────────────────────────────────────────────┘
```

---

## How It Works

### Level 1: Validation Loop (Existing)
```typescript
// Current implementation - no changes needed
async function runValidationLoop(task, config, appliedFixes = []) {
  for (attempt = 1 to 5) {
    code = generateScraperCode(selectors, appliedFixes);
    result = testCode(code);
    if (result.success && allFieldsPresent) return {validated: true, code};
  }
  return {validated: false, bestAttempt, allErrors};
}
```

### Level 2: Iterative Wrapper (NEW)
```typescript
async function iterativeWrapper(task, config) {
  let supervisorAttempt = 0;
  const MAX_SUPERVISOR_ATTEMPTS = 3;
  let appliedFixes = [];
  
  while (supervisorAttempt < MAX_SUPERVISOR_ATTEMPTS) {
    supervisorAttempt++;
    console.log(`\n🔄 SUPERVISOR Iteration ${supervisorAttempt}/${MAX_SUPERVISOR_ATTEMPTS}`);
    
    // Run validation loop
    const result = await runValidationLoop(task, config, appliedFixes);
    
    if (result.validated) {
      console.log(`✅ SUPERVISOR: Success on iteration ${supervisorAttempt}`);
      return result;  // SUCCESS!
    }
    
    // ANALYZE FAILURE PATTERN
    const pattern = analyzeFailurePattern(result.allErrors);
    
    if (pattern.type === 'SYNTAX_ERROR' && pattern.consistent) {
      console.log('🔧 SUPERVISOR: Detected consistent syntax errors, applying fixes...');
      appliedFixes.push('quote-field-names');
      appliedFixes.push('escape-special-chars');
      continue;  // Retry with fixes
    }
    
    if (pattern.type === 'JSON_PARSE_ERROR' && pattern.consistent) {
      console.log('🔧 SUPERVISOR: Detected JSON parse errors, applying cleaning...');
      appliedFixes.push('clean-ollama-json');
      continue;
    }
    
    if (pattern.type === 'NO_ITEMS' && pattern.consistent) {
      console.log('🔧 SUPERVISOR: Selectors consistently fail, trying alternative strategies...');
      appliedFixes.push('use-alternative-selectors');
      continue;
    }
    
    // No clear pattern or already tried all fixes
    console.log('⚠️ SUPERVISOR: No fixable pattern detected, returning best attempt');
    return result;
  }
  
  // Max supervisor attempts reached
  return result;
}
```

---

## Implementation Steps

### Step 1: Extract Current Logic into Validation Loop Function (30 min)

**File:** `scraper-backend/src/langchain-server.ts`

**Create new function before /manual-agent-validated endpoint:**

```typescript
async function runValidationLoop(
  url: string,
  html: string,
  validFields: string[],
  appliedFixes: string[] = [],
  onProgress?: (data: any) => void
): Promise<{
  validated: boolean;
  code: string;
  itemCount: number;
  attempts: number;
  allErrors: Array<{attempt: number, error: string, type: string}>;
  bestAttempt: any;
}> {
  
  const MAX_ATTEMPTS = 5;
  let bestAttempt: any = { code: '', itemCount: 0, error: '', attempt: 0 };
  let previousSelectors: any = null;
  const allErrors: Array<{attempt: number, error: string, type: string}> = [];
  
  // Apply fixes to code generation based on appliedFixes array
  const shouldQuoteFields = appliedFixes.includes('quote-field-names');
  const shouldCleanJSON = appliedFixes.includes('clean-ollama-json');
  const useAlternativeSelectors = appliedFixes.includes('use-alternative-selectors');
  
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log(`\n🔄 Attempt ${attempt}/${MAX_ATTEMPTS}`);
    onProgress?.({ type: 'info', message: `🔄 Attempt ${attempt}/${MAX_ATTEMPTS}` });
    
    // ... existing logic ...
    // Generate code with fixes applied
    let scraperCode = buildScraperCode(
      url, 
      validFields, 
      selectors,
      { 
        quoteFieldNames: shouldQuoteFields,
        useAlternativeSelectors: useAlternativeSelectors 
      }
    );
    
    // Test code
    const testResult = await testScraper(scraperCode, url);
    
    // Track errors
    if (!testResult.success) {
      allErrors.push({
        attempt,
        error: testResult.error,
        type: classifyError(testResult.error)
      });
    }
    
    // ... rest of validation logic ...
  }
  
  return {
    validated: false,
    code: bestAttempt.code || '// No valid scraper generated',
    itemCount: bestAttempt.itemCount,
    attempts: MAX_ATTEMPTS,
    allErrors,
    bestAttempt
  };
}
```

---

### Step 2: Add Error Analysis Function (20 min)

```typescript
function classifyError(error: string): string {
  if (error.includes('Unexpected token') || error.includes('SyntaxError')) {
    return 'SYNTAX_ERROR';
  }
  if (error.includes('JSON') || error.includes('parse')) {
    return 'JSON_PARSE_ERROR';
  }
  if (error.includes('Cannot find module') || error.includes('require')) {
    return 'DEPENDENCY_ERROR';
  }
  if (error.includes('timeout') || error.includes('ETIMEDOUT')) {
    return 'TIMEOUT_ERROR';
  }
  return 'UNKNOWN_ERROR';
}

function analyzeFailurePattern(allErrors: Array<{attempt: number, error: string, type: string}>) {
  if (allErrors.length === 0) {
    return { type: 'NO_ERRORS', consistent: false };
  }
  
  // Check if same error type in all attempts
  const errorTypes = allErrors.map(e => e.type);
  const uniqueTypes = new Set(errorTypes);
  
  if (uniqueTypes.size === 1) {
    const type = Array.from(uniqueTypes)[0];
    return { 
      type, 
      consistent: true, 
      count: allErrors.length,
      sampleError: allErrors[0].error
    };
  }
  
  // Check if majority of errors are same type
  const typeCounts: Record<string, number> = {};
  errorTypes.forEach(t => {
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  });
  
  const dominantType = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])[0];
  
  if (dominantType[1] >= allErrors.length * 0.6) {
    return {
      type: dominantType[0],
      consistent: true,
      count: dominantType[1],
      sampleError: allErrors.find(e => e.type === dominantType[0])?.error
    };
  }
  
  return { type: 'MIXED_ERRORS', consistent: false };
}
```

---

### Step 3: Add Code Generation with Fixes (40 min)

**Modify buildScraperCode to accept options:**

```typescript
function buildScraperCode(
  url: string,
  validFields: string[],
  selectors: { containerSelector: string, fields: Record<string, string> },
  options: {
    quoteFieldNames?: boolean;
    useAlternativeSelectors?: boolean;
    escapeSpecialChars?: boolean;
  } = {}
): string {
  
  const matchingContainer = selectors.containerSelector;
  
  // Build field mappings with optional fixes
  const fieldMappings = validFields.map((field: string) => {
    const selector = selectors.fields[field] || `.${field.replace('_', '-')}`;
    const isUrl = field.includes('url');
    
    // Apply fix: Quote field names with special characters
    const fieldKey = (options.quoteFieldNames || field.includes('-') || field.includes('_'))
      ? `'${field}'`
      : field;
    
    if (isUrl) {
      return `          ${fieldKey}: $(el).find('${selector}').attr('href') || $(el).find('a').first().attr('href') || '',`;
    } else {
      return `          ${fieldKey}: $(el).find('${selector}').text().trim() || '',`;
    }
  }).join('\n');
  
  // Generate code
  const scraperCode = `module.exports = async function(url) {
  const axios = require('axios');
  const cheerio = require('cheerio');
  const { data } = await axios.get(url);
  const $ = cheerio.load(data);
  const results = [];
  
  const items = $('${matchingContainer}');
  console.log('Found', items.length, 'items with selector: ${matchingContainer}');
  
  items.each((i, el) => {
    const item = {
${fieldMappings}
    };
    
    // Reject false positives
    const values = Object.values(item).filter(v => v && v.length > 0);
    if (values.length === 0) return;
    
    const uniqueValues = new Set(values);
    if (uniqueValues.size === 1 && values.length > 1) {
      console.log('Rejecting item with identical values:', item);
      return;
    }
    
    const hasEcho = Object.entries(item).some(([key, val]) => 
      val && typeof val === 'string' && val.toLowerCase().includes(key.toLowerCase())
    );
    if (hasEcho && values.length < 3) {
      console.log('Rejecting item with field name echo:', item);
      return;
    }
    
    const hasData = values.length >= Math.min(2, Object.keys(item).length / 2);
    if (hasData) results.push(item);
  });
  
  return results;
};`;
  
  return scraperCode;
}
```

---

### Step 4: Add Ollama JSON Cleaner (15 min)

**Update findSelectorsWithOllama:**

```typescript
async function findSelectorsWithOllama(
  html: string, 
  fieldsRequired: string[], 
  previousAttempt?: any,
  cleanJSON: boolean = false  // NEW parameter
): Promise<{ containerSelector: string, fields: Record<string, string> }> {
  
  // ... existing prompt and Ollama call ...
  
  const responseText = response.data.response || '';
  const selectorMatch = responseText.match(/<selectors>([\s\S]*?)<\/selectors>/);
  
  if (!selectorMatch) {
    throw new Error('Ollama did not return selectors in correct format');
  }
  
  let jsonText = selectorMatch[1].trim();
  
  // NEW: Clean JSON if requested
  if (cleanJSON) {
    console.log('🧹 Cleaning Ollama JSON output...');
    // Remove JavaScript-style comments
    jsonText = jsonText.replace(/\/\/.*$/gm, '');
    jsonText = jsonText.replace(/\/\*[\s\S]*?\*\//g, '');
    // Remove trailing commas
    jsonText = jsonText.replace(/,(\s*[}\]])/g, '$1');
    console.log('✅ JSON cleaned');
  }
  
  try {
    const selectors = JSON.parse(jsonText);
    // ... validation ...
    return selectors;
  } catch (parseError: any) {
    console.log('❌ JSON parse error:', parseError.message);
    throw new Error(`Failed to parse Ollama JSON: ${parseError.message}`);
  }
}
```

---

### Step 5: Create Iterative Wrapper (45 min)

**Add new endpoint:**

```typescript
} else if (req.method === 'POST' && req.url === '/manual-agent-validated') {
  // Iterative wrapper with intelligent error correction
  console.log('🎯 Manual agent VALIDATED endpoint hit (with iterative wrapper)');
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', async () => {
    try {
      const { task, config = {} } = JSON.parse(body);
      const { fieldsRequired = [] } = config;
      
      // Set SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });
      
      const sendProgress = (data: any) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };
      
      // Extract field names
      const validFields = fieldsRequired
        .map((f: any) => {
          if (typeof f === 'string') return f;
          if (f && typeof f === 'object') return f.fieldName || f.name || f.field;
          return null;
        })
        .filter((f: any) => f && typeof f === 'string');
      
      if (validFields.length === 0) {
        sendProgress({ type: 'error', error: 'No valid fields provided' });
        res.end();
        return;
      }
      
      console.log('📥 Validated agent request:', { fields: validFields });
      sendProgress({ type: 'info', message: '📥 Starting iterative validation...' });
      
      // Extract URL
      const urlMatch = task.match(/https?:\/\/[^\s\n]+/);
      if (!urlMatch) {
        sendProgress({ type: 'error', error: 'No URL found in task' });
        res.end();
        return;
      }
      const url = urlMatch[0];
      
      // Fetch HTML once
      console.log('🌐 Fetching HTML...');
      sendProgress({ type: 'info', message: '🌐 Fetching HTML...' });
      const htmlResponse = await axios.get(url, { timeout: 15000 });
      const html = htmlResponse.data;
      console.log(`✅ HTML fetched: ${html.length} chars`);
      sendProgress({ type: 'success', message: `✅ Fetched ${html.length} chars` });
      
      // ITERATIVE WRAPPER LOOP
      const MAX_SUPERVISOR_ATTEMPTS = 3;
      let supervisorAttempt = 0;
      let appliedFixes: string[] = [];
      let lastResult: any = null;
      
      while (supervisorAttempt < MAX_SUPERVISOR_ATTEMPTS) {
        supervisorAttempt++;
        console.log(`\n🔄 SUPERVISOR Iteration ${supervisorAttempt}/${MAX_SUPERVISOR_ATTEMPTS}`);
        sendProgress({ 
          type: 'info', 
          message: `🔄 Supervisor iteration ${supervisorAttempt}/${MAX_SUPERVISOR_ATTEMPTS}` 
        });
        
        if (appliedFixes.length > 0) {
          console.log('🔧 Applied fixes:', appliedFixes);
          sendProgress({ 
            type: 'info', 
            message: `🔧 Applying fixes: ${appliedFixes.join(', ')}` 
          });
        }
        
        // Run validation loop
        lastResult = await runValidationLoop(
          url,
          html,
          validFields,
          appliedFixes,
          sendProgress
        );
        
        if (lastResult.validated) {
          // SUCCESS!
          console.log(`✅ SUPERVISOR: Validation succeeded on iteration ${supervisorAttempt}`);
          sendProgress({ 
            type: 'complete', 
            output: lastResult.code,
            validated: true,
            attempts: lastResult.attempts,
            supervisorIterations: supervisorAttempt,
            itemCount: lastResult.itemCount
          });
          res.end();
          return;
        }
        
        // ANALYZE FAILURE PATTERN
        console.log('📊 SUPERVISOR: Analyzing failure pattern...');
        const pattern = analyzeFailurePattern(lastResult.allErrors);
        console.log('📊 Pattern detected:', pattern);
        
        if (pattern.consistent && supervisorAttempt < MAX_SUPERVISOR_ATTEMPTS) {
          if (pattern.type === 'SYNTAX_ERROR') {
            console.log('🔧 SUPERVISOR: Applying syntax fixes...');
            sendProgress({ 
              type: 'warning', 
              message: '🔧 Detected syntax errors, applying fixes...' 
            });
            if (!appliedFixes.includes('quote-field-names')) {
              appliedFixes.push('quote-field-names');
            }
            continue;  // Retry with fixes
          }
          
          if (pattern.type === 'JSON_PARSE_ERROR') {
            console.log('🔧 SUPERVISOR: Applying JSON cleaning...');
            sendProgress({ 
              type: 'warning', 
              message: '🔧 Detected JSON errors, applying cleaning...' 
            });
            if (!appliedFixes.includes('clean-ollama-json')) {
              appliedFixes.push('clean-ollama-json');
            }
            continue;
          }
          
          if (pattern.type === 'NO_ITEMS') {
            console.log('🔧 SUPERVISOR: Trying alternative selector strategies...');
            sendProgress({ 
              type: 'warning', 
              message: '🔧 Selectors failing, trying alternatives...' 
            });
            if (!appliedFixes.includes('use-alternative-selectors')) {
              appliedFixes.push('use-alternative-selectors');
            }
            continue;
          }
        }
        
        // No fixable pattern or already tried all fixes
        console.log('⚠️ SUPERVISOR: No fixable pattern, returning best attempt');
        sendProgress({ 
          type: 'warning', 
          message: '⚠️ No fixable pattern detected' 
        });
        break;
      }
      
      // Return best attempt after all supervisor iterations
      console.log(`\n❌ SUPERVISOR: All ${MAX_SUPERVISOR_ATTEMPTS} iterations exhausted`);
      sendProgress({ 
        type: 'complete', 
        output: lastResult.code,
        validated: false,
        attempts: lastResult.attempts,
        supervisorIterations: MAX_SUPERVISOR_ATTEMPTS,
        error: `Validation incomplete after ${MAX_SUPERVISOR_ATTEMPTS} supervisor iterations. ${lastResult.bestAttempt?.error || 'No items extracted.'}`,
        itemCount: lastResult.itemCount
      });
      res.end();
      
    } catch (error: any) {
      console.error('❌ Iterative wrapper error:', error);
      res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
      res.end();
    }
  });
```

---

## Expected Behavior

### Before (No Wrapper):
```
Attempt 1: ❌ Syntax error (Unexpected token '-')
Attempt 2: ❌ Syntax error (Unexpected token '-')
Attempt 3: ❌ Syntax error (Unexpected token '-')
Attempt 4: ❌ Syntax error (Unexpected token '-')
Attempt 5: ❌ Syntax error (Unexpected token '-')
Result: FAIL - No learning, returns empty code
```

### After (With Wrapper):
```
Supervisor Iteration 1:
  Attempt 1: ❌ Syntax error
  Attempt 2: ❌ Syntax error
  Attempt 3: ❌ Syntax error
  Attempt 4: ❌ Syntax error
  Attempt 5: ❌ Syntax error
  Pattern: SYNTAX_ERROR (consistent)
  
Supervisor Iteration 2:
  Applied fix: quote-field-names
  Attempt 1: ✅ Syntax valid → Test → Extract 12 items → Validate
  Result: SUCCESS (validated: true)
  
Total: 6 attempts (5+1), 2 supervisor iterations
```

---

## Implementation Checklist

- [ ] Extract validation loop into function (30 min)
- [ ] Add error classification function (20 min)
- [ ] Add pattern analysis function (20 min)
- [ ] Update buildScraperCode with options (40 min)
- [ ] Add JSON cleaning to Ollama function (15 min)
- [ ] Create iterative wrapper endpoint (45 min)
- [ ] Test with real website (30 min)

**Total:** ~3 hours

---

## Key Benefits

1. **Learns from failures** - Detects patterns across multiple attempts
2. **Applies systematic fixes** - Quotes field names, cleans JSON, tries alternatives
3. **Multiple escalation levels** - Worker (5 attempts) → Supervisor (3 iterations)
4. **Graceful degradation** - Returns best attempt if unfixable
5. **Progress visibility** - User sees supervisor iterations and fixes applied

---

## Success Criteria

✅ **Detects syntax errors** and applies quoting fix  
✅ **Detects JSON errors** and applies cleaning  
✅ **Detects selector failures** and tries alternatives  
✅ **Learns between iterations** (doesn't repeat same mistake)  
✅ **Returns validated code** or clear error explanation  
✅ **Max 15 attempts total** (5 worker × 3 supervisor)  

Ready to implement!
