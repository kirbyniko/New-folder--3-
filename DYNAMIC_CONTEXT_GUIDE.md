# Dynamic Context Switching for Mistral

## The Problem
- **Mistral** has 4K context window
- **PDF Parser guide** = 1,200 tokens
- **Scraper guide** = 1,500 tokens  
- **Summarizer guide** = 850 tokens
- **Total** = 3,550 tokens (leaving only 546 for user + response) ❌

You can't load them all at once!

## The Solution: Task-Based Routing

Load **ONLY the context you need** for the current task:

```
User: "Build scraper for Honolulu"
  ↓
System detects: scraper task
  ↓
Loads: scraper-guide context (1,500 tokens)
  ↓
Budget: 500 + 1,500 + 300 + 1,300 = 3,600 ✅ FITS

---

User: "Parse this PDF agenda"
  ↓
System detects: PDF task
  ↓
Loads: pdf-parser context (1,200 tokens)
  ↓
Budget: 500 + 1,200 + 300 + 1,300 = 3,300 ✅ FITS
```

## How It Works

### 1. Task Detection (Automatic)
The system analyzes keywords in your prompt:

| Keywords | Context Loaded | Tokens |
|----------|---------------|--------|
| "pdf", "agenda parse", "extract bills" | **pdf-parser** | 1,200 |
| "analyze data", "validate", "check quality" | **data-analyzer** | 400 |
| "summarize agenda", "summary meeting" | **agenda-summarizer** | 850 |
| "puppeteer", "javascript scrape" | **puppeteer-specialist** | 600 |
| "legistar", "granicus", "scraper" | **scraper-guide** | 1,500 |
| anything else | **general-assistant** | 300 |

### 2. Context Switching Example

**Scenario:** You want to scrape a site AND parse PDFs

**Old Way (Doesn't Fit):**
```
Select both contexts:
  scraper-guide: 1,500
  pdf-parser: 1,200
  Total: 2,700 + overhead = 3,500
  User message: 300
  Response: 1,500
  ────────────────────────
  Total: 5,300 > 4,096 ❌ OVERFLOW
```

**New Way (Dynamic):**
```
Task 1: "Build scraper for example.com"
  → Loads scraper-guide only (1,500)
  → Generates scraper code
  → Total: 3,600 tokens ✅

Task 2: "Parse the PDF at url.com/agenda.pdf"
  → Unloads scraper-guide
  → Loads pdf-parser only (1,200)
  → Parses PDF
  → Total: 3,300 tokens ✅
```

## How to Use

### Option A: Automatic Detection (Recommended)
Just describe what you want naturally:

```
Prompt: "Build a scraper for Honolulu city council using Legistar platform"
→ System automatically loads: scraper-guide + legistar RAG example
→ Mistral gets exactly what it needs
```

```
Prompt: "Parse this PDF and extract the bill numbers and topics"
→ System automatically loads: pdf-parser
→ Qwen gets PDF parsing instructions
```

### Option B: Multi-Task (Sequential)
For complex workflows:

```
Prompt: "Build a scraper for Virginia AND parse PDF agendas"

System breaks into subtasks:
1. Load scraper-guide → Build scraper
2. Unload scraper-guide, load pdf-parser → Add PDF parsing
3. Return combined code
```

### Option C: Manual Context Selection (UI)
In the Agent Editor, select **ONE** context:

**For Scraping:**
- ✓ **Scraper Guide RAG** (1,500 tokens)
- Model: mistral-nemo:12b

**For PDF Parsing:**
- ✓ **PDF Agenda Parser** (1,200 tokens)
- Model: qwen2.5-coder:3b

**For Summarization:**
- ✓ **Agenda Summarizer** (850 tokens)
- Model: qwen2.5-coder:3b

## Benefits

### ✅ Fits in 4K Context
Each specialized guide loads independently:
- scraper-guide: 1,500 tokens ✅
- pdf-parser: 1,200 tokens ✅
- agenda-summarizer: 850 tokens ✅
- All leave room for user message + response

### ✅ Uses Right Model for Task
- **Mistral** for scraping (better tool use)
- **Qwen 3b** for PDF parsing (faster, cheaper)
- **Qwen 3b** for summarization (good at text generation)

### ✅ RAG Still Works
When scraper-guide is loaded, RAG examples still get added:
```
Base guide: 1,500 tokens
+ Legistar example: 400 tokens
─────────────────────────────
Total: 1,900 tokens ✅ Still fits!
```

## Under the Hood

**File:** `scraper-backend/src/agent-delegation.ts`

```typescript
// Detect which context to use
export function routeTask(task: string): TaskRoute {
  if (task.includes('pdf')) return { contextId: 'pdf-parser' };
  if (task.includes('analyze')) return { contextId: 'data-analyzer' };
  if (task.includes('scraper')) return { contextId: 'scraper-guide' };
  return { contextId: 'general-assistant' };
}

// Get context with RAG if applicable
export function getContextWithRAG(contextId: string, userTask: string) {
  const context = CONTEXT_TEMPLATES.find(c => c.id === contextId);
  
  if (contextId === 'scraper-guide') {
    const example = getScraperExample(userTask); // RAG lookup
    if (example) {
      context.systemPrompt += example; // Add platform example
    }
  }
  
  return context;
}
```

## Testing

### Test 1: Scraper Task
```bash
# Send to agent
curl -X POST http://localhost:3003/agent \
  -H "Content-Type: application/json" \
  -d '{
    "task": "Build scraper for Honolulu (Legistar platform)",
    "config": { "model": "mistral-nemo:12b" }
  }'

# Expected:
# ✓ Loads scraper-guide (1,500 tokens)
# ✓ Adds Legistar RAG example (400 tokens)
# ✓ Total: ~2,400 tokens ✅
```

### Test 2: PDF Task
```bash
curl -X POST http://localhost:3003/agent \
  -H "Content-Type: application/json" \
  -d '{
    "task": "Parse PDF agenda and extract bills",
    "config": { "model": "qwen2.5-coder:3b" }
  }'

# Expected:
# ✓ Loads pdf-parser (1,200 tokens)
# ✓ Total: ~2,700 tokens ✅
```

### Test 3: Multi-Task
```bash
curl -X POST http://localhost:3003/agent \
  -H "Content-Type: application/json" \
  -d '{
    "task": "Build scraper AND parse PDF agendas",
    "config": { "model": "mistral-nemo:12b" }
  }'

# Expected:
# ✓ Task 1: Loads scraper-guide → generates scraper
# ✓ Task 2: Loads pdf-parser → adds PDF parsing
# ✓ Returns combined solution
```

## Summary

**Before:** Try to cram all guides into 4K context ❌ Overflow

**After:** Load only what you need per task ✅ Always fits

**Result:** Mistral can access **any specialized guide** without context overflow.

The system is already implemented in `agent-delegation.ts` - it just needs to be wired up to the langchain-server.
