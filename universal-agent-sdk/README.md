# Universal Agent SDK

**Build AI agents with hardware-aware RAG, multi-model support, and adaptive context management - all in the browser or Node.js.**

## Why Universal Agent SDK?

Unlike server-side frameworks (LangChain, LangGraph), this SDK is designed for **client-side AI** with:

- ✅ **Browser-native** - Works in Chrome extensions, web apps, Electron apps
- ✅ **Hardware-aware** - Auto-detects GPU VRAM, Ollama availability, adjusts token limits
- ✅ **Multi-model** - Seamlessly switch between Ollama (32K context), WebGPU (4K), or cloud APIs
- ✅ **Built-in RAG** - Episodic memory, knowledge base, context guides out-of-the-box
- ✅ **Zero backend** - No servers required, runs entirely on user's machine
- ✅ **Privacy-first** - All processing local, no data leaves user's device

## Quick Start

### Installation

```bash
npm install universal-agent-sdk
# or
<script src="https://cdn.jsdelivr.net/npm/universal-agent-sdk/dist/bundle.js"></script>
```

### Basic Usage

```javascript
import { UniversalAgent } from 'universal-agent-sdk';

// Create an agent for web scraping
const scraperAgent = new UniversalAgent({
  name: 'WebScraperAgent',
  mode: 'scraper',
  intelligence: {
    rag: true,
    knowledgeBase: true,
    htmlSnapshot: { maxSize: 30 } // 30KB
  }
});

// Execute with context
const result = await scraperAgent.execute({
  task: 'Extract all product prices from this page',
  context: {
    url: 'https://example.com/products',
    htmlSnapshot: document.documentElement.outerHTML
  }
});

console.log(result.response); // "Found 24 products: [$19.99, $24.99, ...]"
console.log(result.confidence); // 0.95
```

### Advanced: Custom Agent Modes

```javascript
// Create a customer support agent
const supportAgent = new UniversalAgent({
  name: 'SupportAgent',
  mode: 'custom',
  systemPrompt: `You are a helpful customer support agent. 
                 Use past conversation history to provide personalized responses.`,
  intelligence: {
    rag: true, // Enable conversation memory
    knowledgeBase: true, // Learn from successful responses
    contextGuides: {
      enabled: true,
      guides: ['customer-interaction', 'troubleshooting']
    }
  },
  modelPreferences: {
    primary: 'ollama',
    fallback: 'webgpu',
    model: 'qwen2.5-coder:14b'
  }
});

// Chat with memory
await supportAgent.chat('My order #12345 is delayed');
// Agent remembers context from previous conversations with this user
```

## Core Features

### 1. Hardware Detection & Auto-Optimization

The SDK automatically detects your hardware and optimizes accordingly:

```javascript
import { SystemCapabilityDetector } from 'universal-agent-sdk';

const detector = new SystemCapabilityDetector();
const capabilities = await detector.detectAll();

console.log(capabilities);
// {
//   ollama: { available: true, models: ['qwen2.5-coder:32b'], contextLimits: 32768 },
//   gpu: { detected: true, vram: 24576, vendor: 'nvidia' },
//   webgpu: { available: true }
// }
```

### 2. Intelligent Context Management

Configure exactly what context your agent uses:

```javascript
const agent = new UniversalAgent({
  intelligence: {
    rag: {
      enabled: true,
      maxResults: 3,
      tokenBudget: 800
    },
    knowledgeBase: {
      enabled: true,
      tokenBudget: 400
    },
    contextGuides: {
      enabled: true,
      guides: ['dom-navigation', 'error-handling'],
      tokenBudget: 1450
    },
    htmlSnapshot: {
      enabled: true,
      maxSize: 50, // KB
      tokenBudget: 2500
    },
    attemptHistory: {
      enabled: true,
      maxAttempts: 3,
      tokenBudget: 600
    }
  }
});

// Get current token usage
const estimates = agent.getTokenEstimates();
console.log(estimates);
// { total: 5750, fitsInGPU: true, cpuRisk: 'low' }
```

### 3. Multi-Model Orchestration

Seamlessly switch between inference providers:

```javascript
const agent = new UniversalAgent({
  modelPreferences: {
    primary: 'ollama',      // Try Ollama first (32K context)
    fallback: 'webgpu',     // Fall back to WebGPU (4K context)
    cloudFallback: 'openai' // Final fallback (cloud API)
  },
  modelConfig: {
    ollama: {
      baseURL: 'http://localhost:11434',
      model: 'qwen2.5-coder:32b',
      timeout: 600000 // 10 minutes
    },
    webgpu: {
      modelSize: '4GB',
      quantization: 'q4f16'
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4-turbo'
    }
  }
});

// Agent automatically selects best available model
const response = await agent.execute({ task: '...' });
```

### 4. Built-in Learning & Memory

Agents learn from successes and failures:

```javascript
// RAG automatically stores successful attempts
await agent.execute({ task: 'Extract product prices' });
// Success stored in episodic memory

// Future attempts retrieve similar successes
await agent.execute({ task: 'Extract product names' });
// Agent retrieves price extraction as reference

// Knowledge base learns patterns
agent.kb.learn('price-extraction', {
  pattern: 'Look for $ or .price class',
  confidence: 0.95
});

// Later retrievals use learned knowledge
const knowledge = agent.kb.query('price');
```

## Preset Configurations

### Maximum Intelligence (32GB+ GPU)

```javascript
const agent = new UniversalAgent({
  preset: 'maximum',
  // Enables all intelligence systems
  // Total tokens: ~11,000
  // Requires: Ollama with 24GB+ GPU
});
```

### Balanced (16GB GPU)

```javascript
const agent = new UniversalAgent({
  preset: 'balanced',
  // Moderate intelligence, good quality
  // Total tokens: ~6,000
  // Works with: Most modern GPUs
});
```

### GPU-Optimized (8GB GPU)

```javascript
const agent = new UniversalAgent({
  preset: 'gpu',
  // Minimal context, pure GPU
  // Total tokens: ~2,000
  // Works with: Entry-level GPUs, WebGPU
});
```

### Minimal (Any Hardware)

```javascript
const agent = new UniversalAgent({
  preset: 'minimal',
  // Essential features only
  // Total tokens: ~800
  // Works with: Any hardware, cloud APIs
});
```

## Agent Modes

### Scraper Mode

Specialized for web scraping:

```javascript
const scraper = new UniversalAgent({
  mode: 'scraper',
  context: {
    url: 'https://example.com',
    domStructure: document.querySelector('.content').outerHTML
  }
});

const data = await scraper.extract({
  fields: ['title', 'price', 'description']
});
```

### Chat Mode

Conversational agent with memory:

```javascript
const chatbot = new UniversalAgent({
  mode: 'chat',
  systemPrompt: 'You are a helpful assistant.'
});

await chatbot.chat('What is the weather?');
await chatbot.chat('What about tomorrow?'); // Remembers context
```

### Analysis Mode

Data analysis and insights:

```javascript
const analyzer = new UniversalAgent({
  mode: 'analysis'
});

const insights = await analyzer.analyze({
  data: salesData,
  question: 'What are the top 3 revenue drivers?'
});
```

### Custom Mode

Build your own agent type:

```javascript
const custom = new UniversalAgent({
  mode: 'custom',
  systemPrompt: '...',
  tools: [
    { name: 'search', fn: searchFunction },
    { name: 'calculate', fn: calculateFunction }
  ]
});
```

## Configuration API

### Full Configuration Object

```javascript
{
  // Basic settings
  name: 'MyAgent',
  mode: 'scraper' | 'chat' | 'analysis' | 'custom',
  systemPrompt: 'Custom instructions...',
  
  // Intelligence configuration
  intelligence: {
    rag: boolean | { enabled, maxResults, tokenBudget },
    knowledgeBase: boolean | { enabled, tokenBudget },
    contextGuides: boolean | { enabled, guides[], tokenBudget },
    htmlSnapshot: boolean | { enabled, maxSize, tokenBudget },
    pageAnalysis: boolean | { enabled, tokenBudget },
    promptCompression: boolean | { enabled, targetReduction },
    attemptHistory: boolean | { enabled, maxAttempts, tokenBudget },
    conversationMemory: boolean | { enabled, tokenBudget }
  },
  
  // Model preferences
  modelPreferences: {
    primary: 'ollama' | 'webgpu' | 'openai' | 'anthropic',
    fallback: 'ollama' | 'webgpu' | 'openai',
    cloudFallback: 'openai' | 'anthropic'
  },
  
  // Model-specific config
  modelConfig: {
    ollama: { baseURL, model, timeout },
    webgpu: { modelSize, quantization },
    openai: { apiKey, model, maxTokens },
    anthropic: { apiKey, model, maxTokens }
  },
  
  // Hardware overrides
  hardware: {
    gpuVRAM: 24576, // MB (manual override)
    maxTokens: 32768 // Force max context
  },
  
  // Tools & capabilities
  tools: [
    { name: string, description: string, fn: function }
  ],
  
  // Callbacks
  onProgress: (progress) => {},
  onError: (error) => {},
  onComplete: (result) => {}
}
```

## Use Cases

### 1. Chrome Extension (Web Scraping)

```javascript
// content-script.js
import { UniversalAgent } from 'universal-agent-sdk';

const scraper = new UniversalAgent({
  mode: 'scraper',
  preset: 'balanced'
});

chrome.runtime.onMessage.addListener(async (request) => {
  if (request.action === 'scrape') {
    const result = await scraper.execute({
      task: request.task,
      context: {
        url: window.location.href,
        html: document.documentElement.outerHTML
      }
    });
    return result;
  }
});
```

### 2. Electron App (Data Analysis)

```javascript
// main.js
const { UniversalAgent } = require('universal-agent-sdk');

const analyzer = new UniversalAgent({
  mode: 'analysis',
  modelPreferences: { primary: 'ollama' }
});

ipcMain.handle('analyze-data', async (event, data) => {
  return await analyzer.analyze({
    data: data,
    question: 'Summarize key trends'
  });
});
```

### 3. Web App (Customer Support)

```javascript
// app.js
import { UniversalAgent } from 'universal-agent-sdk';

const support = new UniversalAgent({
  mode: 'chat',
  preset: 'maximum',
  intelligence: {
    rag: true,
    knowledgeBase: true,
    conversationMemory: true
  }
});

// Handle user messages
async function handleMessage(userId, message) {
  const response = await support.chat(message, {
    userId: userId, // Separate memory per user
    context: await loadUserHistory(userId)
  });
  
  return response;
}
```

### 4. CLI Tool (Code Generation)

```javascript
// cli.js
#!/usr/bin/env node
const { UniversalAgent } = require('universal-agent-sdk');

const coder = new UniversalAgent({
  mode: 'custom',
  systemPrompt: 'You are an expert programmer.',
  modelPreferences: { primary: 'ollama' }
});

const task = process.argv[2];
const result = await coder.execute({ task });
console.log(result.response);
```

## API Reference

### `UniversalAgent`

Main agent class.

#### Constructor

```typescript
new UniversalAgent(config: AgentConfig)
```

#### Methods

- `execute(options)` - Execute a one-time task
- `chat(message, context?)` - Conversational interaction
- `analyze(data, question)` - Analyze data and answer questions
- `extract(fields)` - Extract structured data
- `getTokenEstimates()` - Get current token usage
- `updateConfig(config)` - Update agent configuration
- `reset()` - Clear memory and reset state

### `SystemCapabilityDetector`

Hardware detection utility.

#### Methods

- `detectAll()` - Detect all capabilities (Ollama, GPU, WebGPU)
- `detectOllama()` - Check Ollama availability
- `detectGPU()` - Detect GPU VRAM
- `detectWebGPU()` - Check WebGPU support
- `getRecommendedLimits()` - Get token limits for detected hardware
- `getSummary()` - Get human-readable capability summary

### `AgentConfigManager`

Context and token management.

#### Methods

- `getConfig()` - Get current configuration
- `updateConfig(config)` - Update configuration
- `getTokenEstimates()` - Get token usage breakdown
- `estimateCPURisk(tokens)` - Estimate CPU usage risk
- `getSummary()` - Get configuration summary
- `applyPreset(name)` - Apply preset configuration

## Advanced Topics

### Custom Tools

Add custom capabilities to your agent:

```javascript
const agent = new UniversalAgent({
  mode: 'custom',
  tools: [
    {
      name: 'searchDatabase',
      description: 'Search the product database',
      parameters: {
        query: 'string',
        limit: 'number'
      },
      fn: async (query, limit) => {
        const results = await db.search(query, limit);
        return results;
      }
    }
  ]
});
```

### Streaming Responses

Get real-time token generation:

```javascript
const agent = new UniversalAgent({
  mode: 'chat',
  streaming: true,
  onToken: (token) => {
    process.stdout.write(token);
  }
});

await agent.chat('Tell me a story');
```

### Error Handling

Robust error handling with fallbacks:

```javascript
const agent = new UniversalAgent({
  modelPreferences: {
    primary: 'ollama',
    fallback: 'webgpu'
  },
  onError: (error, attempt) => {
    console.log(`Attempt ${attempt} failed:`, error);
  },
  maxRetries: 3,
  retryDelay: 1000
});
```

### Performance Monitoring

Track agent performance:

```javascript
const agent = new UniversalAgent({
  monitoring: {
    enabled: true,
    onMetrics: (metrics) => {
      console.log('Metrics:', metrics);
      // { latency: 1234, tokensUsed: 5600, model: 'ollama' }
    }
  }
});
```

## Comparison with Other Frameworks

| Feature | Universal Agent SDK | LangChain | LangGraph | AutoGPT |
|---------|-------------------|-----------|-----------|---------|
| Browser-native | ✅ Yes | ❌ No | ❌ No | ❌ No |
| Hardware detection | ✅ Auto | ❌ Manual | ❌ Manual | ❌ Manual |
| Local inference | ✅ Ollama/WebGPU | ⚠️ Limited | ⚠️ Limited | ❌ Cloud only |
| Built-in RAG | ✅ Yes | ⚠️ Complex | ⚠️ Complex | ❌ No |
| Zero backend | ✅ Yes | ❌ Requires server | ❌ Requires server | ❌ Requires server |
| Privacy-first | ✅ All local | ⚠️ Depends | ⚠️ Depends | ❌ Cloud-based |
| Simple API | ✅ 5 min setup | ⚠️ Steep learning | ⚠️ Very complex | ⚠️ Complex |

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- 📖 [Documentation](https://docs.universal-agent-sdk.dev)
- 💬 [Discord Community](https://discord.gg/universal-agent)
- 🐛 [Issue Tracker](https://github.com/yourusername/universal-agent-sdk/issues)
- 📧 Email: support@universal-agent-sdk.dev

---

**Built with ❤️ for the future of client-side AI**
