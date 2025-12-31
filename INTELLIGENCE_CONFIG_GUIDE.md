# Agent Intelligence Configuration System

## Overview

The Agent Intelligence Configuration System allows you to **enable/disable individual AI systems** and **estimate token usage** before generation. This gives you precise control over context size, GPU compatibility, and generation quality.

## 🧠 Available Intelligence Systems

### 1. **RAG Episodic Memory** (800 tokens)
- **What it does**: Retrieves 3 similar successful scraper patterns from localStorage
- **Provides**: Past success patterns, code snippets, success factors
- **When to enable**: Always (unless using GPU with <4K context)
- **Configurable**: Episode count (0-10)

### 2. **Domain Knowledge Base** (400 tokens)
- **What it does**: Learned patterns organized by domain and template type
- **Provides**: Domain-specific best practices, common pitfalls
- **When to enable**: For domains/templates with past experience
- **Configurable**: On/Off

### 3. **Context Guides** (1450 tokens total)
- **What it does**: Proven scraping patterns and tactics
- **Provides**: Selector patterns, Puppeteer tactics, error handling, date parsing
- **When to enable**: Always (or individually select guides)
- **Configurable**: Individual guide selection (5 guides)
  - Scraper Guide (600 tokens)
  - Basic Selectors (200 tokens)
  - Puppeteer Tactics (300 tokens)
  - Error Handling (200 tokens)
  - Date Parsing (150 tokens)

### 4. **Live HTML Snapshot** (2500 tokens)
- **What it does**: Fetches actual page HTML for selector validation
- **Provides**: Real DOM structure, actual IDs/classes, page layout
- **When to enable**: Always (most critical for selector accuracy)
- **Configurable**: HTML size (0-50,000 chars)

### 5. **Page Structure Analysis** (200 tokens)
- **What it does**: Analyzes framework, IDs, classes before generation
- **Provides**: Framework detection, relevant IDs/classes, container hints
- **When to enable**: Always (minimal overhead, huge benefit)
- **Configurable**: On/Off

### 6. **Prompt Compression** (-2000 tokens)
- **What it does**: Compresses prompts to fit GPU token limits
- **Provides**: Fits prompts into 4K GPU context window
- **When to enable**: Only for WebGPU inference (4K limit)
- **Configurable**: On/Off

### 7. **Previous Attempt History** (600 tokens)
- **What it does**: Includes past failed attempts in fix prompts
- **Provides**: What was tried, what failed, error patterns
- **When to enable**: During iterative fixing (not first generation)
- **Configurable**: Max attempts (0-5)

### 8. **Conversation Memory** (0 tokens currently)
- **What it does**: Retains chat context across sessions
- **Provides**: User feedback patterns, interaction history
- **Status**: Available but not yet used in generation prompts
- **Future**: Will provide user preference learning

## 📊 Token Estimation

### Context Window Limits
- **WebGPU/WebLLM**: 4,096 tokens (~16KB text)
- **Ollama (empirical safe)**: 6,144 tokens (~24KB text) - 0% CPU
- **Ollama 32K context**: 32,768 tokens (~128KB text)

### Token Calculation
```
Total Tokens = Base Prompt (800) 
             + Enabled Systems 
             + HTML Snapshot 
             + RAG Episodes
             + Context Guides
             + Expected Response (2000)
```

### CPU Risk Levels
- **0% CPU**: ≤2048 tokens (GPU only, perfect)
- **5-10% CPU**: 2048-4096 tokens (acceptable)
- **10-20% CPU**: 4096-6144 tokens (noticeable)
- **>20% CPU**: >6144 tokens (significant slowdown)

## 🎯 Quick Presets

### Maximum Intelligence (8-12K tokens)
**Best for: Ollama with 32K context, complex pages**
- ✅ All systems enabled
- ✅ 3 RAG episodes
- ✅ All 5 context guides
- ✅ 10KB HTML snapshot
- ✅ Full attempt history

**Result**: Highest quality, learns from everything

### Balanced (5-7K tokens)
**Best for: Most models, standard pages**
- ✅ Core systems only
- ✅ 2 RAG episodes
- ✅ 3 essential guides (selectors, Puppeteer, errors)
- ✅ 5KB HTML snapshot
- ✅ Limited attempt history

**Result**: Good quality, moderate context

### GPU Optimized (3-4K tokens)
**Best for: WebGPU inference, 4K context limit**
- ✅ Minimal systems
- ✅ 1 RAG episode
- ✅ 2 essential guides (selectors, errors)
- ✅ 2KB HTML snapshot
- ✅ Prompt compression enabled
- ❌ No attempt history

**Result**: Fits in GPU, acceptable quality

### Minimal (2-3K tokens)
**Best for: Fastest generation, simple pages**
- ❌ No RAG
- ❌ No knowledge base
- ✅ 2 guides (selectors, errors)
- ✅ 3KB HTML snapshot
- ❌ No attempt history

**Result**: Fastest, basic quality

## 🔧 How to Use

### Method 1: UI Configuration Panel
1. Open extension popup
2. Click "⚙️ Intelligence Config" button
3. Use presets or configure individual systems
4. See real-time token estimates
5. Save configuration

### Method 2: Programmatic Configuration
```javascript
// Get config manager
const configManager = new AgentConfigManager();

// Apply preset
configManager.applyPreset('balanced');

// Or configure manually
configManager.setEnabled('enhancedMemory', true);
configManager.setRAGEpisodeCount(2);
configManager.setHtmlContextSize(5000);
configManager.setContextGuideEnabled('scraper-guide', false);

// Get generation config
const genConfig = configManager.getGenerationConfig();
console.log('Token estimate:', genConfig.estimatedTokens);
```

### Method 3: localStorage Override
```javascript
// Set configuration
localStorage.setItem('agentIntelligenceConfig', JSON.stringify({
  enhancedMemory: { enabled: true, maxEpisodes: 2 },
  htmlContext: { enabled: true, maxChars: 5000 },
  // ... other systems
}));
```

## 📈 Real-World Examples

### Example 1: Complex Government Site
**Configuration**: Maximum Intelligence
```
RAG Memory: 3 episodes (800 tokens)
Knowledge Base: Enabled (400 tokens)
Context Guides: All 5 (1450 tokens)
HTML Snapshot: 10KB (2500 tokens)
Page Analysis: Enabled (200 tokens)
Attempt History: 3 attempts (600 tokens)
Base Prompt: 800 tokens
Expected Response: 2000 tokens
--------------------------------------------
Total: ~8,750 tokens
Fits in: Ollama 32K ✓
CPU Risk: Medium (10-15%)
```

### Example 2: Simple Calendar Page
**Configuration**: Balanced
```
RAG Memory: 2 episodes (500 tokens)
Knowledge Base: Enabled (400 tokens)
Context Guides: 3 selected (700 tokens)
HTML Snapshot: 5KB (1250 tokens)
Page Analysis: Enabled (200 tokens)
Base Prompt: 800 tokens
Expected Response: 2000 tokens
--------------------------------------------
Total: ~5,850 tokens
Fits in: Ollama 32K ✓, Safe 6K ✓
CPU Risk: Low (5-10%)
```

### Example 3: WebGPU Inference
**Configuration**: GPU Optimized
```
RAG Memory: 1 episode (250 tokens)
Context Guides: 2 selected (400 tokens)
HTML Snapshot: 2KB (500 tokens)
Page Analysis: Enabled (200 tokens)
Prompt Compression: -2000 tokens
Base Prompt: 800 tokens
Expected Response: 2000 tokens
--------------------------------------------
Total: ~2,150 tokens (after compression)
Fits in: GPU 4K ✓
CPU Risk: None (0%)
```

## 🎓 Best Practices

### 1. Start with Balanced
Use the "Balanced" preset for most scrapers. It provides good quality without excessive context.

### 2. Increase for Complex Pages
If generation fails or produces poor results:
- Increase HTML snapshot size (5KB → 10KB)
- Enable more context guides
- Increase RAG episode count

### 3. Decrease for Speed
If generation is too slow:
- Use "GPU Optimized" or "Minimal" preset
- Reduce HTML snapshot size
- Disable RAG memory
- Select fewer context guides

### 4. Monitor Token Usage
Watch the token gauge and CPU risk indicator. Stay under 6K tokens for best performance.

### 5. Use Presets Initially
Don't manually configure until you understand each system's impact. Presets are well-tested.

## 🔍 Debugging

### Check Current Configuration
```javascript
const configManager = new AgentConfigManager();
console.log(configManager.getSummary());
```

### View Token Breakdown
```javascript
const estimates = configManager.tokenEstimates;
console.log('Total tokens:', estimates.total);
console.log('Fits in GPU:', estimates.fitsInGPU);
console.log('CPU risk:', estimates.cpuRisk);
```

### Export Configuration
```javascript
const json = configManager.exportConfig();
console.log(json); // Copy to save
```

### Verify Systems Are Working
Open browser console during generation:
```
🧠 Retrieved 2 similar episodes from memory  ← RAG working
📄 HTML snippet prepared: 5432 chars        ← HTML fetch working
📚 Included 3 context guides                ← Guides included
📊 Total context size: 6234 chars (~1558 tokens) ← Size tracking
```

## 📦 Files

- `agent-config-manager.js` - Core configuration logic
- `agent-config-panel.html` - UI panel HTML/CSS
- `agent-config-ui.js` - UI controller
- `ai-agent.js` - Integration with generation (modified)
- `manifest.json` - Extension manifest (modified)

## 🚀 Future Enhancements

1. **Automatic Optimization**: AI learns optimal config per domain
2. **Conversation Memory Integration**: Use chat history in prompts
3. **Semantic Embeddings**: Replace keyword RAG with semantic search
4. **Adaptive Context**: Dynamically adjust based on page complexity
5. **Performance Profiling**: Track actual CPU usage per configuration
6. **Cloud Sync**: Save configs across devices

## 💡 Tips

- **First time setup**: Use "Maximum Intelligence" to build strong memory
- **After 10+ scrapers**: Switch to "Balanced" - RAG memory is now valuable
- **GPU inference**: Use "GPU Optimized" for fastest local inference
- **Debugging fails**: Enable all systems temporarily for maximum context
- **Production use**: Use "Balanced" for reliability and speed balance

---

## Quick Reference Card

| System | Tokens | Always Enable? | Configurable |
|--------|--------|----------------|--------------|
| RAG Memory | 800 | ✓ (unless GPU) | Episode count |
| Knowledge Base | 400 | ✓ | On/Off |
| Context Guides | 1450 | ✓ | Individual guides |
| HTML Snapshot | 2500 | ✓ (critical) | Size (0-50K) |
| Page Analysis | 200 | ✓ | On/Off |
| Prompt Compression | -2000 | GPU only | On/Off |
| Attempt History | 600 | During fixes | Max attempts |
| Conversation Memory | 0 | Not yet | Future |

**Default Total**: ~8,000 tokens (Maximum Intelligence)  
**Recommended**: ~6,000 tokens (Balanced)  
**GPU Safe**: ~3,500 tokens (GPU Optimized)  
**Minimal**: ~2,500 tokens (Minimal)
