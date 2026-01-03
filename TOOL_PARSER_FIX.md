# Quick Fix: Tool Call Parser

## Status: IMPLEMENTED

Added tool call parser to extract and execute tools from markdown-wrapped JSON.

## How It Works

1. Agent outputs: ` ```json\n{"name": "execute_code", ...}\n``` `
2. Parser extracts tool name and arguments
3. We execute the tool directly
4. Feed result back to validation loop
5. Loop continues until validation passes

## Files Modified

- `scraper-backend/src/validation-loop.ts` - Added tool call extraction
- Tool calls now work even when model outputs them as markdown

## Result

✅ qwen2.5-coder:7b now works with validation loop
✅ No need to switch models
✅ Validation loop automatically retries with tool execution
