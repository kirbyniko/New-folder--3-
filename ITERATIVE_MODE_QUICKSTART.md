# Quick Start: Iterative Learning Mode

## What You Need to Know

You have a **fast local LLM** but a **small context window**. Iterative Learning Mode turns this into an advantage by:

1. **Splitting 72 fields into batches of 12**
2. **Processing each batch in 7-10 seconds**
3. **Learning from each batch to improve the next**
4. **Accepting partial success** (65/72 fields is great!)

## How to Enable

### Option 1: UI Toggle (Recommended)
1. Open Chrome extension popup
2. Scroll to "🤖 Agent Settings"
3. Check "🔄 Iterative Learning Mode"
4. Done!

### Option 2: Console
```javascript
// Enable
scraperAgent.setIterativeLearningMode(true);

// Disable
scraperAgent.setIterativeLearningMode(false);
```

## How to Use

### Generate Scraper (Automatic)
```javascript
// If iterative mode is enabled, this automatically uses batching:
const result = await scraperAgent.generateWithIterativeLearning(
  scraperConfig,
  url,
  pageStructure
);

console.log(result.metadata.batchResults);
// [
//   { batchIndex: 0, fieldsExtracted: 10/12, iterations: 2 },
//   { batchIndex: 1, fieldsExtracted: 11/12, iterations: 1 },
//   { batchIndex: 2, fieldsExtracted: 12/12, iterations: 1 },
//   ...
// ]
```

### What You'll See

```
🔄 Starting iterative learning extraction
📦 Split 72 fields into 6 batches

🎯 Processing batch 1/6 (12 fields)
  🔄 Attempt 1 for 12 fields
  ✅ Extracted 10 fields
  ⚠️  2 fields still missing
  🔄 Attempt 2 for 2 fields
  ✅ Extracted 2 fields
  ⚠️  0 fields still missing

🎯 Processing batch 2/6 (12 fields)
  💡 LEARNED: Previous batch used .class selectors successfully
  🔄 Attempt 1 for 12 fields
  ✅ Extracted 11 fields
  ⚠️  1 field still missing
  🔄 Attempt 2 for 1 field
  ✅ Extracted 0 fields (field may not exist)

[... batches 3-6 ...]

✅ Iterative learning complete: 11 total iterations
📊 Final results: 65/72 fields (90% success)
⏱️  Total time: 46 seconds
```

## Understanding the Output

### Success Metrics
```javascript
{
  success: true,
  data: {
    "step2-title": "County Commission Meeting",
    "step2-date": "01/15/2025",
    "step2-location": "City Hall",
    // ... 62 more fields
  },
  metadata: {
    iterations: 11,              // Total LLM calls
    batchResults: [
      {
        batchIndex: 0,
        fieldsAttempted: 12,
        fieldsExtracted: 10,      // 10/12 success
        iterations: 2,            // Took 2 tries
        learnedPatterns: [
          "Selectors use Bootstrap classes",
          "Dates in MM/DD/YYYY format"
        ]
      },
      // ... 5 more batches
    ]
  }
}
```

### Interpreting Results

**90%+ success rate**: Excellent! Most fields found
**70-89% success rate**: Good, some fields missing (may not exist on page)
**50-69% success rate**: Fair, check if page structure changed
**<50% success rate**: Poor, may need manual selector hints

## When to Use Iterative Mode

### ✅ Use Iterative Mode When:
- You have 30+ fields to extract
- Using qwen2.5-coder:7b or qwen2.5-coder:14b (small context)
- Page has complex structure
- You want to see incremental progress
- You can accept partial success (65/72 fields OK)

### ❌ Don't Use Iterative Mode When:
- You have <15 fields (not worth the batching overhead)
- Using qwen2.5-coder:32b+ (large context, one-shot works)
- Need 100% field extraction (though iterative often gets closer)
- Time is critical (one-shot is faster if it works)

## Tuning Parameters

### Batch Size (Default: 12)
```javascript
// In iterative-agent.js:
const fieldBatches = this.createFieldBatches(scraperConfig, 12); // ← Change this

// Smaller batches (8): More focused, more iterations
// Larger batches (15): Fewer iterations, may exceed context
```

### Max Retry Attempts (Default: 3)
```javascript
// In iterative-agent.js:
while (attempt < 3 && failedFields.length > 0) { // ← Change this

// More attempts (5): Better success rate, slower
// Fewer attempts (2): Faster, lower success rate
```

### Learning Window (Default: Last 3 patterns)
```javascript
// In buildFocusedPrompt():
learnedPatterns.slice(-3).forEach(pattern => { // ← Change this

// More patterns (5): More context, may exceed token limit
// Fewer patterns (1): Less context, faster
```

## Troubleshooting

### "Iterative learning toggle not found"
- Reload extension: `chrome://extensions` → Reload
- Clear cache: `localStorage.clear()`

### "Batch failed: timeout"
- Increase timeout in execute-server (default: 90s)
- Reduce batch size to 8 fields

### "Only 30% success rate"
- Check page structure: `console.log(pageStructure)`
- Manually test selectors in DevTools
- Add hints to first batch prompt

### "Too slow (>2 minutes)"
- Reduce max retry attempts from 3 to 2
- Increase batch size from 12 to 15
- Check Ollama isn't using CPU: `ollama ps`

## Example Session

```javascript
// 1. Enable iterative mode
scraperAgent.setIterativeLearningMode(true);

// 2. Load scraper config with 72 fields
const config = await loadScraperConfig('alabama-events');

// 3. Get page structure
const pageStructure = await analyzePageStructure(url);

// 4. Generate with iterative learning
const result = await scraperAgent.generateWithIterativeLearning(
  config,
  url,
  pageStructure
);

// 5. Review results
console.log(`Extracted ${Object.keys(result.data).length} fields`);
console.log(`Took ${result.metadata.iterations} iterations`);
console.log(`Learned patterns:`, 
  result.metadata.batchResults.flatMap(b => b.learnedPatterns)
);

// 6. Save successful scraper
if (Object.keys(result.data).length >= 60) {
  await saveScraperScript(result);
}
```

## The Big Picture

**Traditional approach**: One massive prompt, pray it works
**Iterative approach**: Six focused prompts, learn and adapt

You're not fighting your hardware limitations - you're **leveraging your speed advantage**.

🚀 **Fast iterations > Large context windows**
