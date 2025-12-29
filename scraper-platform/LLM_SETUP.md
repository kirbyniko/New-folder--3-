# LLM-Powered Scraper Setup Guide

## Overview

The scraper platform uses a **hybrid execution model**:

1. **Generic Engine** (Fast, free) - Tries first
2. **Local LLM** (Free, requires setup) - Fallback for complex sites
3. **Cached Scripts** (Instant) - Reuses successful LLM-generated code

## Prerequisites

### Install Ollama (One-time setup)

**Windows:**
```powershell
# Download and install from:
https://ollama.ai/download/windows

# Or use winget:
winget install Ollama.Ollama
```

**Mac:**
```bash
brew install ollama
```

**Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### Pull the Model (3.8GB download)

```bash
ollama pull deepseek-coder:6.7b
```

**Why DeepSeek Coder?**
- Small (6.7B parameters, 3.8GB)
- Excellent code generation
- Fast inference (~2-5 seconds on modern CPU)
- 100% free, runs offline

### Start Ollama Server

```bash
ollama serve
```

Leave this running in the background.

---

## How It Works

### Flow Diagram

```
User clicks "Run Scraper"
         ↓
[1] Try Generic Engine (Puppeteer + your selectors)
         ↓
   ✅ Success? → Done (save data)
         ↓ ❌ Failed
[2] Check if cached LLM script exists
         ↓
   ✅ Exists? → Run cached script
         ↓ ❌ No cache
[3] Generate new script with Ollama
    - Fetch HTML snapshot
    - Send to DeepSeek Coder with context
    - Receive custom Puppeteer script
         ↓
[4] Execute generated script
         ↓
   ✅ Success? → Cache script, save data
   ❌ Failed? → Log error, try again with more context
```

### What Gets Sent to the LLM

```json
{
  "targetUrl": "https://example.gov/calendar",
  "description": "Legislative calendar scraper",
  "fieldsToExtract": [
    {
      "name": "event_name",
      "selector": ".event-title",
      "type": "text"
    },
    {
      "name": "event_date",
      "selector": ".event-date",
      "type": "date"
    }
  ],
  "htmlSnapshot": "<html>... (actual page structure)</html>",
  "previousError": "Timeout waiting for .next-button"
}
```

### What the LLM Generates

```javascript
async function scrapeData(page, config) {
  const results = [];
  
  // Wait for content to load
  await page.waitForSelector('.event-item', { timeout: 10000 });
  
  // Extract all events
  const events = await page.$$eval('.event-item', (items) => {
    return items.map(item => ({
      event_name: item.querySelector('.event-title')?.textContent.trim(),
      event_date: item.querySelector('.event-date')?.textContent.trim(),
      event_url: item.querySelector('a')?.href
    }));
  });
  
  results.push(...events);
  
  // Handle pagination
  while (true) {
    const nextBtn = await page.$('.next-button');
    if (!nextBtn) break;
    
    await nextBtn.click();
    await page.waitForTimeout(1000);
    await page.waitForSelector('.event-item');
    
    const moreEvents = await page.$$eval('.event-item', (items) => {
      return items.map(item => ({
        event_name: item.querySelector('.event-title')?.textContent.trim(),
        event_date: item.querySelector('.event-date')?.textContent.trim(),
        event_url: item.querySelector('a')?.href
      }));
    });
    
    results.push(...moreEvents);
  }
  
  return results;
}
```

---

## Usage

### Via Web UI

1. Import your scraper JSON (from extension)
2. Click "▶️ Run"
3. Platform automatically:
   - Tries generic engine
   - Falls back to LLM if needed
   - Shows execution mode in logs

### Via API

**Run with hybrid mode (default):**
```bash
curl -X POST http://localhost:3001/api/scrapers/1/run
```

**Run generic engine only:**
```bash
curl -X POST http://localhost:3001/api/scrapers/1/run \
  -H "Content-Type: application/json" \
  -d '{"hybrid": false}'
```

**Check Ollama status:**
```bash
curl http://localhost:3001/api/ollama/status
```

---

## Performance

### Typical Execution Times

| Method | First Run | Cached | Notes |
|--------|-----------|--------|-------|
| Generic Engine | 5-30s | 5-30s | Fast, but limited |
| LLM Generation | 30-60s | - | Includes HTML fetch + model inference |
| Cached LLM Script | 5-30s | 5-30s | Same as generic, but custom code |

### Model Inference Speed

On a modern CPU (Intel i7 / Ryzen 7):
- **DeepSeek Coder 6.7B**: ~3-5 seconds per generation
- **CodeLlama 13B**: ~8-12 seconds per generation

On GPU (if available):
- **DeepSeek Coder 6.7B**: <1 second

---

## Cost Analysis

### Traditional Approach (Cloud LLM)
- GPT-4: $30-60/million tokens
- Claude: $15-75/million tokens
- **Cost for 100 scraper generations**: ~$5-20

### Our Approach (Local LLM)
- Ollama: **FREE**
- One-time 3.8GB download
- Runs offline
- No API limits
- **Cost for unlimited generations**: $0

### Hardware Requirements

**Minimum:**
- CPU: 4 cores
- RAM: 8GB
- Disk: 4GB free
- Speed: ~5-10 seconds per generation

**Recommended:**
- CPU: 8+ cores
- RAM: 16GB
- GPU: Optional (8GB VRAM = 10x faster)
- Speed: ~2-3 seconds per generation

---

## Troubleshooting

### "Ollama not available"

```bash
# Check if running
curl http://localhost:11434/api/tags

# Start Ollama
ollama serve

# Pull model
ollama pull deepseek-coder:6.7b
```

### "Model generation too slow"

Try a smaller model:
```bash
ollama pull qwen2.5-coder:3b  # Only 2GB, faster but less capable
```

### "Generated script doesn't work"

The platform will:
1. Log the error
2. Regenerate with error context
3. Try up to 3 times
4. Fall back to generic engine

You can manually regenerate by clicking "Run" again.

### "Out of memory"

Reduce model size:
```bash
ollama pull deepseek-coder:1.3b  # Smallest, 1GB
```

Or increase timeout in code:
```typescript
// src/llm/ollama-client.ts
{ timeout: 300000 } // 5 minutes instead of 2
```

---

## Alternative Models

| Model | Size | Speed | Quality | Use Case |
|-------|------|-------|---------|----------|
| **deepseek-coder:6.7b** | 3.8GB | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | **Recommended** |
| qwen2.5-coder:7b | 4.7GB | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Best quality |
| codellama:13b | 7.3GB | ⭐⭐ | ⭐⭐⭐⭐ | High quality |
| qwen2.5-coder:3b | 2GB | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | Low memory |
| deepseek-coder:1.3b | 1GB | ⭐⭐⭐⭐⭐ | ⭐⭐ | Ultra low memory |

Switch models:
```typescript
// src/llm/ollama-client.ts
constructor(model: string = 'qwen2.5-coder:7b', baseUrl: string = 'http://localhost:11434')
```

---

## Advanced: Script Caching

The platform automatically caches successful LLM-generated scripts:

- **Cache location**: In-memory (lost on restart)
- **Cache criteria**: >70% success rate over 5+ runs
- **Cache duration**: 30 days since last use
- **Cache invalidation**: <30% success rate

**Future enhancement**: Persist cache to database for permanent storage.

---

## Next Steps

1. ✅ Install Ollama
2. ✅ Pull deepseek-coder:6.7b
3. ✅ Start ollama serve
4. ✅ Import scrapers via extension
5. ✅ Click "Run" and watch hybrid execution!

The platform will show execution mode in the UI:
- 🔧 Generic Engine
- 🤖 LLM-Generated
- 🎯 Cached Script
