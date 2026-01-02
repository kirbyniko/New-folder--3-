# Context Management & VRAM Optimization System

## Overview

A comprehensive context management system that provides:
- **Smart Model Selection** based on available VRAM
- **Context Templates** for different agent personalities (Scraper Builder, Data Analyzer, Puppeteer Specialist, etc.)
- **VRAM Detection** and optimization recommendations
- **Chrome Extension Integration** for scraper template analysis

## Components Created

### 1. `context-manager.ts` (Backend)
**Location:** `scraper-backend/src/context-manager.ts`

**Features:**
- Model database with VRAM requirements, speed ratings, and use cases
- 7 pre-configured models (qwen2.5-coder variants, mistral, llama, deepseek)
- 5 context templates (Scraper Builder, Data Analyzer, General Assistant, Puppeteer Specialist, Quick Query)
- VRAM detection via nvidia-smi
- Model recommendations based on available VRAM
- Chrome extension integration for JSON template analysis

**Key Functions:**
```typescript
getModelRecommendations(availableVramGB: number)  // Returns suitable models
detectVRAM()                                       // Queries GPU memory
getScraperExtensionContext(jsonTemplate)           // Analyzes scraper fields
```

### 2. `ContextSelector.js` (Frontend UI Component)
**Location:** `sdk-demo/src/components/ContextSelector.js`

**Features:**
- Collapsible context selector panel
- Visual model cards with stats (VRAM, speed, context window)
- Color-coded recommendations (green=fits VRAM, red=too large)
- Quick optimization buttons (Speed vs Quality)
- Model testing functionality
- Real-time VRAM detection display

**UI Elements:**
- Context grid (choose agent personality)
- Model cards (select LLM)
- Quick actions (optimize, test model)
- Real-time notifications

### 3. `context-selector.css` (Styling)
**Location:** `sdk-demo/src/styles/context-selector.css`

**Design:**
- Dark theme with purple accents
- Card-based layout with hover effects
- Animated notifications (slide-in/out)
- Selected state highlighting
- Disabled state for too-large models

### 4. Enhanced `langchain-server.ts`
**New Endpoints:**
- `GET /contexts` - List available contexts and models
- `GET /vram-info` - VRAM detection and recommendations
- `POST /scraper-context` - Enhanced prompt for scraper extension
- `POST /test-model` - Quick model health check

## Model Database

| Model | VRAM | Speed | Context | Best For |
|-------|------|-------|---------|----------|
| qwen2.5-coder:1.5b | 2GB | 50 tok/s | 32K | Quick queries, simple tasks |
| qwen2.5-coder:3b | 3GB | 40 tok/s | 32K | Web scraping, data extraction |
| qwen2.5-coder:7b | 6GB | 30 tok/s | 32K | Complex scraping, multi-step |
| qwen2.5-coder:14b | 10GB | 20 tok/s | 32K | Complex reasoning, error recovery |
| mistral-nemo:12b | 9GB | 18 tok/s | 4K | General purpose, structured output |
| llama3.2:3b | 3GB | 35 tok/s | 8K | Fast responses, low memory |
| deepseek-coder-v2:16b | 12GB | 15 tok/s | 16K | Puppeteer scripts, complex code |

## Context Templates

### 1. Scraper Builder
- **Purpose:** Build web scrapers from SCRAPER_GUIDE_SHORT.md patterns
- **Recommended Model:** qwen2.5-coder:7b
- **Tools:** execute_code, fetch_url
- **Use Case:** Analyze HTML/JSON structure, generate functional scrapers
- **Special Feature:** Extracts ALL fields from JSON template

### 2. Data Analyzer
- **Purpose:** Validate and analyze scraped data
- **Recommended Model:** qwen2.5-coder:3b
- **Tools:** execute_code
- **Use Case:** Quality checks, pattern detection, statistics

### 3. General Assistant
- **Purpose:** General-purpose web research and scraping
- **Recommended Model:** mistral-nemo:12b
- **Tools:** All (execute_code, fetch_url, search_web)
- **Use Case:** Flexible multi-step tasks

### 4. Puppeteer Specialist
- **Purpose:** Generate Puppeteer automation scripts
- **Recommended Model:** deepseek-coder-v2:16b
- **Tools:** execute_code
- **Use Case:** JavaScript-heavy sites, complex interactions
- **Specialization:** Browser automation, dynamic content

### 5. Quick Query
- **Purpose:** Fast responses for simple questions
- **Recommended Model:** qwen2.5-coder:1.5b
- **Tools:** search_web, fetch_url
- **Use Case:** Ultra-fast lookups, minimal VRAM

## Chrome Extension Integration

### Workflow
1. **Extract Fields** from JSON template in Chrome extension
2. **Send to Agent** via `POST /scraper-context`
3. **Get Enhanced Prompt** with field mapping
4. **Agent Analyzes** webpage structure
5. **Generates Scraper** using appropriate pattern (Static HTML, API, or Puppeteer)
6. **Reports Results:** Which fields found, which missing, event count

### Enhanced Prompt Format
```
## USER'S JSON TEMPLATE FIELDS
- name: string
- date: string
- location: string
- agendaUrl: string

## YOUR TASK
1. Analyze webpage structure
2. Determine best approach (HTML/API/Puppeteer)
3. Generate code for ALL 4 fields
4. Test with execute_code
5. Report: fields found/missing, total events
```

## VRAM Optimization

### Auto-Optimize for Speed
- Selects **fastest model** that fits in VRAM
- Prioritizes tok/s rating
- Example: 8GB VRAM → qwen2.5-coder:7b (30 tok/s)

### Auto-Optimize for Quality
- Selects **largest model** that fits in VRAM
- Prioritizes accuracy over speed
- Example: 8GB VRAM → mistral-nemo:12b (18 tok/s but better quality)

### VRAM Detection
```typescript
// Auto-detects via nvidia-smi
{ totalGB: 8, available: true }

// Or defaults to 8GB if detection fails
{ totalGB: 8, available: false }
```

## Quick Actions

### Test Current Model
- Sends test prompt: "Respond with 'OK'"
- Measures response time and tokens/sec
- Shows: `✅ Model working! 18.5 tok/s (2.1s total)`
- Or: `❌ Model test failed: connection timeout`

### Refresh VRAM
- Re-queries GPU memory
- Updates model recommendations
- Useful after closing other GPU applications

## Integration Points

### Frontend (ScraperAgentUI)
```javascript
// Initialize context selector
this.contextSelector = new ContextSelector(container);

// Listen for changes
this.contextSelector.onModelChange = (model) => {
  this.config.model = model;
};

this.contextSelector.onContextChange = (context) => {
  this.config.context = context;
};

// Get current config
const { context, model } = this.contextSelector.getConfig();
```

### Backend (langchain-agent.ts)
```typescript
// Use context in agent creation
const context = getContextById(request.config.context);
const systemPrompt = context?.systemPrompt || defaultPrompt;

const llm = new ChatOllama({
  model: request.config.model || 'mistral-nemo:12b',
  // ... other config
});
```

## Next Steps

### Immediate
1. ✅ Black text visibility fixed (using `.message.progress` class)
2. ✅ Context selector UI implemented
3. ✅ VRAM detection working
4. ✅ Model recommendations based on GPU memory

### Pending
1. **Test with Chrome Extension** - Send JSON template from extension
2. **Improve Accuracy** - Fine-tune prompts for better scraper generation
3. **Add History** - Save context/model preferences
4. **Model Switching** - Hot-swap models without restart
5. **Batch Analysis** - Process multiple scrapers in parallel

## Usage Examples

### Example 1: Quick Hacker News Scraping
1. User selects "Quick Query" context (auto-selects qwen2.5-coder:1.5b)
2. Asks: "Get top 10 HN headlines"
3. Agent runs in 2-3 seconds with 50 tok/s

### Example 2: Complex Puppeteer Script
1. User selects "Puppeteer Specialist" (auto-selects deepseek-coder-v2:16b if 12GB+ VRAM)
2. Provides JSON template with 10 fields
3. Agent analyzes JavaScript-heavy site
4. Generates comprehensive Puppeteer script
5. Reports which fields were extracted

### Example 3: VRAM-Constrained System
1. System has only 4GB VRAM
2. Context selector shows:
   - ✅ Recommended: qwen2.5-coder:3b, llama3.2:3b
   - ⚠️ Too Large: All models >4GB
3. User can still select small models for fast results

## Files Modified

### Created
- `scraper-backend/src/context-manager.ts` (358 lines)
- `sdk-demo/src/components/ContextSelector.js` (220 lines)
- `sdk-demo/src/styles/context-selector.css` (369 lines)
- `scraper-backend/start-agent.bat` (startup script)

### Modified
- `scraper-backend/src/langchain-server.ts` (added 4 endpoints)
- `sdk-demo/src/components/ScraperAgentUI.js` (integrated ContextSelector)
- `sdk-demo/src/main-langchain.js` (imported context-selector.css)

## API Reference

### GET /contexts
**Response:**
```json
{
  "contexts": [
    {
      "id": "scraper-builder",
      "name": "Scraper Builder",
      "description": "Build web scrapers...",
      "systemPrompt": "...",
      "tools": ["execute_code", "fetch_url"],
      "modelRecommendation": "qwen2.5-coder:7b"
    }
  ],
  "models": [
    {
      "name": "qwen2.5-coder:7b",
      "vramRequired": 6,
      "speedTokSec": 30,
      "contextWindow": 32768,
      "description": "...",
      "recommended": ["Complex scraping", "Multi-step tasks"]
    }
  ]
}
```

### GET /vram-info
**Response:**
```json
{
  "totalGB": 8,
  "available": true,
  "recommended": [
    { "name": "qwen2.5-coder:7b", "vramRequired": 6, "speedTokSec": 30, ... }
  ],
  "tooLarge": [
    { "name": "deepseek-coder-v2:16b", "vramRequired": 12, ... }
  ]
}
```

### POST /scraper-context
**Request:**
```json
{
  "jsonTemplate": {
    "name": "",
    "date": "",
    "location": ""
  }
}
```

**Response:**
```json
{
  "enhancedPrompt": "System prompt with field mapping...",
  "recommendedModel": "qwen2.5-coder:7b",
  "context": { "id": "scraper-builder", ... }
}
```

### POST /test-model
**Request:**
```json
{
  "model": "qwen2.5-coder:7b",
  "prompt": "Say OK"
}
```

**Response:**
```json
{
  "success": true,
  "response": "OK",
  "tokens": 2,
  "timeMs": 1850
}
```

## Performance Targets

| System VRAM | Recommended Model | Expected Speed | Use Case |
|-------------|-------------------|----------------|----------|
| 2-4GB | qwen2.5-coder:3b | 40 tok/s | Basic scraping |
| 4-8GB | qwen2.5-coder:7b | 30 tok/s | Complex tasks |
| 8-12GB | mistral-nemo:12b | 18 tok/s | Balanced quality |
| 12GB+ | deepseek-coder-v2:16b | 15 tok/s | Expert coding |

## Troubleshooting

### Server Crashes
- Check if context-manager.ts has import errors
- Verify TypeScript compilation: `npx tsc --noEmit src/context-manager.ts`
- Run directly: `npx tsx src/langchain-server.ts`

### VRAM Not Detected
- Requires nvidia-smi (NVIDIA GPUs only)
- Falls back to 8GB assumption if detection fails
- Manual override: Edit `detectVRAM()` function

### Model Recommendations Empty
- Check VRAM detection returned valid number
- Verify AVAILABLE_MODELS array populated
- Test endpoint: `curl http://localhost:3003/vram-info`

### Context Selector Not Showing
- Check browser console for import errors
- Verify ContextSelector.js imported in ScraperAgentUI
- Ensure context-selector.css loaded in main-langchain.js

## Future Enhancements

1. **Dynamic Model Loading** - Pull models from Ollama API
2. **Custom Contexts** - Let users create/save their own templates
3. **Model Quantization** - Suggest Q4/Q5/Q8 variants based on VRAM
4. **Multi-GPU Support** - Detect and utilize multiple GPUs
5. **Cloud Fallback** - Use OpenAI/Anthropic if local model unavailable
6. **Performance History** - Track tok/s over time per model
7. **Auto-Switch** - Change model mid-conversation if stuck
8. **Prompt Libraries** - Save/share successful prompts by context
