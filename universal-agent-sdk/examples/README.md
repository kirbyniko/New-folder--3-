# Universal Agent SDK Examples

## Quick Start

```javascript
// Install
npm install universal-agent-sdk

// Basic usage
import { UniversalAgent } from 'universal-agent-sdk';

const agent = new UniversalAgent({
  mode: 'chat',
  preset: 'balanced'
});

await agent.initialize();
const response = await agent.chat('Hello!');
console.log(response.response);
```

## Example 1: Web Scraper Agent

```javascript
import { UniversalAgent } from 'universal-agent-sdk';

const agent = new UniversalAgent({
  mode: 'scraper',
  preset: 'maximum',
  intelligence: {
    rag: { enabled: true, maxEpisodes: 5 },
    guides: { enabled: true, selected: ['basic-selectors', 'error-handling'] }
  }
});

await agent.initialize();

const result = await agent.execute({
  task: 'Extract court calendar events',
  context: 'https://example.com/calendar'
});

console.log('Scraped data:', result.response);
```

## Example 2: Customer Support Chatbot

```javascript
import { UniversalAgent } from 'universal-agent-sdk';

const agent = new UniversalAgent({
  mode: 'chat',
  preset: 'balanced',
  intelligence: {
    conversation: { enabled: true, maxMessages: 20 }
  }
});

await agent.initialize();

// User conversation loop
const userId = 'user123';

const response1 = await agent.chat('How do I reset my password?', { userId });
console.log(response1.response);

const response2 = await agent.chat('What if I forgot my email too?', { userId });
console.log(response2.response); // Agent remembers context
```

## Example 3: Data Analysis Agent

```javascript
import { UniversalAgent } from 'universal-agent-sdk';

const agent = new UniversalAgent({
  mode: 'analysis',
  preset: 'maximum'
});

await agent.initialize();

const data = {
  sales: [
    { month: 'Jan', revenue: 100000 },
    { month: 'Feb', revenue: 120000 },
    { month: 'Mar', revenue: 95000 }
  ]
};

const insights = await agent.analyze(
  data,
  'What are the key trends and what should we focus on?'
);

console.log(insights.response);
```

## Example 4: Hardware-Aware Configuration

```javascript
import { UniversalAgent, SystemCapabilityDetector } from 'universal-agent-sdk';

// Detect hardware capabilities
const detector = new SystemCapabilityDetector();
const capabilities = await detector.detectAll();

console.log('Ollama available:', capabilities.ollama.available);
console.log('GPU VRAM:', capabilities.gpu.estimatedVRAM, 'MB');
console.log('WebGPU available:', capabilities.webgpu.available);

// Auto-optimize based on hardware
const agent = new UniversalAgent({
  mode: 'chat',
  hardware: {
    autoDetect: true,
    preferOllama: true // Prefer Ollama if available (32K context vs 4K WebGPU)
  }
});

await agent.initialize(); // Will auto-select best model and optimize token limits
```

## Example 5: Custom Tools

```javascript
import { UniversalAgent } from 'universal-agent-sdk';

const agent = new UniversalAgent({
  mode: 'custom',
  tools: {
    enabled: true,
    custom: {
      searchDatabase: async (query) => {
        // Your custom database search
        return await db.search(query);
      },
      sendEmail: async (to, subject, body) => {
        // Your custom email sender
        return await mailer.send({ to, subject, body });
      }
    }
  }
});

await agent.initialize();

const response = await agent.execute({
  task: 'Find all users with overdue invoices and send them reminders',
  context: { source: 'accounting_db' }
});
```

## Example 6: Progress Callbacks

```javascript
import { UniversalAgent } from 'universal-agent-sdk';

const agent = new UniversalAgent({
  mode: 'scraper',
  preset: 'balanced',
  callbacks: {
    onProgress: (event) => {
      console.log(`[${event.stage}] ${event.progress}% - ${event.message}`);
    },
    onComplete: (response) => {
      console.log('Done!', {
        model: response.model,
        tokens: response.tokensUsed,
        latency: response.latency
      });
    },
    onError: (error) => {
      console.error('Agent error:', error.message);
    }
  }
});

await agent.execute({ task: 'Extract data from complex page' });
```

## Example 7: Preset Comparison

```javascript
import { UniversalAgent, AgentConfigManager } from 'universal-agent-sdk';

// Maximum Intelligence (11K tokens, needs Ollama 32K)
const maxAgent = new UniversalAgent({ preset: 'maximum' });
await maxAgent.initialize();
console.log('Max tokens:', (await maxAgent.configManager.calculateTokenEstimates()).total);

// Balanced (6K tokens, works on most GPUs)
const balancedAgent = new UniversalAgent({ preset: 'balanced' });
await balancedAgent.initialize();
console.log('Balanced tokens:', (await balancedAgent.configManager.calculateTokenEstimates()).total);

// GPU Optimized (2K tokens, fits WebGPU 4K limit)
const gpuAgent = new UniversalAgent({ preset: 'gpu' });
await gpuAgent.initialize();
console.log('GPU tokens:', (await gpuAgent.configManager.calculateTokenEstimates()).total);

// Minimal (800 tokens, works anywhere)
const minimalAgent = new UniversalAgent({ preset: 'minimal' });
await minimalAgent.initialize();
console.log('Minimal tokens:', (await minimalAgent.configManager.calculateTokenEstimates()).total);
```

## Example 8: Extract Structured Data

```javascript
import { UniversalAgent } from 'universal-agent-sdk';

const agent = new UniversalAgent({ mode: 'analysis', preset: 'balanced' });
await agent.initialize();

const htmlContent = `
  <div class="profile">
    <h1>John Doe</h1>
    <p>Email: john@example.com</p>
    <p>Phone: 555-1234</p>
  </div>
`;

const structured = await agent.extract([
  { name: 'fullName', type: 'string', description: 'Person's full name' },
  { name: 'email', type: 'email', description: 'Email address' },
  { name: 'phone', type: 'string', description: 'Phone number' }
], htmlContent);

console.log(structured);
// Output: { fullName: 'John Doe', email: 'john@example.com', phone: '555-1234' }
```

## Building & Running

```bash
# Install dependencies
npm install universal-agent-sdk

# Use in Node.js
node your-app.js

# Use in browser (via bundler)
# Import as ES module
import { UniversalAgent } from 'universal-agent-sdk';

# Use via CDN (for quick prototyping)
<script src="https://cdn.jsdelivr.net/npm/universal-agent-sdk/dist/bundle.min.js"></script>
<script>
  const agent = new UniversalAgent.UniversalAgent({ mode: 'chat' });
</script>
```

## Next Steps

- Read the [full documentation](../README.md)
- Check [VISION.md](../VISION.md) for advanced features
- Explore the [Chrome extension example](../../chrome-extension/)
- Join our community (coming soon)
