# Complete Fix: Model Switch + Validation Loop

## Root Cause
**qwen2.5-coder:7b outputs tool calls as markdown text, not executable function calls.**

The validation loop is working perfectly (5 attempts, feedback, retry logic). The issue is the underlying model format.

## Solution: Switch to mistral-nemo:12b

You already have this model installed! It's specifically designed for structured output and function calling.

### Why mistral-nemo:12b?
✅ **Trained for function calling** - Outputs proper tool invocations
✅ **Excellent at following instructions** - Multi-step workflows work
✅ **Larger context** - Can handle complex prompts
✅ **Already on your system** - No download needed

## Changes Required

### 1. Update Frontend Default Model
**File:** `sdk-demo/src/components/ScraperAgentUI.js`
**Line:** ~203
**Change:**
```javascript
// OLD:
model: 'qwen2.5-coder:7b',

// NEW:
model: 'mistral-nemo:12b-instruct-2407-q8_0',
```

### 2. Test Configuration
Users can still choose models in the UI, but default to the working one.

## Expected Behavior After Fix

```
📍 Attempt 1/5
🛠️ Using tool: execute_code (fetch HTML)
Tool result: <html>...</html>

🛠️ Using tool: execute_code (build scraper)
Tool result: Code generated

🛠️ Using tool: test_scraper
Tool result: ❌ time field null

📍 Attempt 2/5
🛠️ Using tool: execute_code (fix selectors)
Tool result: Code updated

🛠️ Using tool: test_scraper
Tool result: ✅ SUCCESS! All fields validated

✅ Validation passed on attempt 2!
```

## Architecture Success

The validation loop + mistral-nemo combination provides:

1. **Multiple attempts** - Agent gets 5 chances to succeed
2. **Tool execution** - Model actually invokes tools (not just writes JSON)
3. **Validation feedback** - test_scraper results guide improvements
4. **Guaranteed quality** - Code isn't returned until validation passes

## Alternative Models (if mistral-nemo has issues)

1. **qwen2.5-coder:14b** - Larger version might format correctly
2. **deepseek-coder:6.7b** - Good at code generation
3. **qwen2.5-coder:32b** - Most powerful (if you have VRAM)

## Implementation Status

✅ Validation loop implemented and working
✅ Test scraper tool validated
✅ Request user help implemented  
✅ Smart frontend validation
🔄 **Need to update frontend default model**
⏳ Test with mistral-nemo

## Next Steps

1. Update ScraperAgentUI.js model default
2. Restart frontend
3. Test AI Agent button with Honolulu
4. Watch console for actual tool executions
5. Verify scraper extracts all fields with data
