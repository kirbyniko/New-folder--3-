# 🎭 Multi-Agent Orchestration System Guide

## Overview

Your AI Agent Studio now includes a **modular neural network architecture** where specialized agents work together to solve complex tasks. Think of it as a team of AI specialists coordinated by a master orchestrator.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Agent Orchestrator                         │
│              (Master Coordinator / Router)                   │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
   ┌────▼────┐         ┌────▼────┐        ┌────▼────┐
   │ Planner │         │  Code   │        │ Scraper │
   │  Agent  │         │  Agent  │        │  Agent  │
   └────┬────┘         └────┬────┘        └────┬────┘
        │                   │                   │
   ┌────▼────┐         ┌────▼────┐        ┌────▼────┐
   │Analyst  │         │Research │        │  Tools  │
   │ Agent   │         │  Agent  │        │         │
   └─────────┘         └─────────┘        └─────────┘
```

## Specialized Agents

### 1. **Planner Agent** 🎯
- **Purpose**: Breaks complex tasks into actionable steps
- **Model**: qwen2.5:14b (reasoning-optimized)
- **Capabilities**:
  - Task decomposition
  - Workflow planning
  - Agent routing
  - Result synthesis

**Example**:
```javascript
User: "Build a web scraper for GitHub repos and analyze the data"

Planner output:
{
  "steps": [
    {"agent": "scraper", "task": "Generate GitHub scraper code"},
    {"agent": "code", "task": "Add data validation and error handling"},
    {"agent": "analyst", "task": "Analyze scraped data for patterns"}
  ]
}
```

### 2. **Code Generator Agent** 💻
- **Purpose**: Writes production-ready code
- **Model**: qwen2.5-coder:14b (code-specialized)
- **Capabilities**:
  - Generate clean, efficient code
  - Debug existing code
  - Optimize performance
  - Write unit tests

**Example**:
```javascript
Input: "Create a rate limiter function"
Output: Complete TypeScript class with retry logic, exponential backoff
```

### 3. **Web Scraper Agent** 🕷️
- **Purpose**: Generates robust web scrapers
- **Model**: qwen2.5-coder:14b
- **Capabilities**:
  - Puppeteer/Cheerio code generation
  - Selector extraction
  - Error handling for network failures
  - Rate limiting implementation

**Example**:
```javascript
Input: "Scrape product prices from Amazon"
Output: Puppeteer script with anti-bot detection, retries, data validation
```

### 4. **Data Analyst Agent** 📊
- **Purpose**: Analyzes data and generates insights
- **Model**: qwen2.5:14b (reasoning)
- **Capabilities**:
  - Statistical analysis
  - Pattern recognition
  - Chart generation
  - Report creation

**Example**:
```javascript
Input: "Analyze sales data and find trends"
Output: Statistical summary, insights, recommendations
```

### 5. **Research Agent** 🔍
- **Purpose**: Finds and synthesizes information
- **Model**: qwen2.5:14b
- **Capabilities**:
  - Information search
  - Knowledge synthesis
  - Fact checking
  - Source citation

## Tool System

Agents can **call external functions** to perform actions:

### Available Tools

#### 1. `execute_code`
Execute JavaScript code and return results
```javascript
{
  "code": "return [1,2,3].map(x => x * 2)",
  "timeout": 5000
}
// Returns: {success: true, result: [2, 4, 6]}
```

#### 2. `fetch_url`
Fetch content from a URL
```javascript
{
  "url": "https://api.github.com/repos/torvalds/linux",
  "method": "GET"
}
// Returns: {success: true, content: "...", status: 200}
```

#### 3. `query_templates`
Search scraper templates
```javascript
{
  "category": "News",
  "search": "article"
}
// Returns: {success: true, templates: [...]}
```

#### 4. `call_llm`
Call a specific LLM model
```javascript
{
  "model": "llama3.2:latest",
  "prompt": "Write a haiku about coding",
  "system": "You are a creative poet"
}
// Returns: {success: true, response: "Lines of code flow..."}
```

#### 5. `save_file`
Save content to file (simulated)
```javascript
{
  "filename": "output.json",
  "content": "{\"data\": [1,2,3]}"
}
// Returns: {success: true, path: "/output/output.json"}
```

## How It Works

### Step 1: User Request
```javascript
User: "Build a scraper for Hacker News and analyze top posts"
```

### Step 2: Planning
The **Planner Agent** analyzes the request:
```json
{
  "steps": [
    {
      "agent": "scraper",
      "task": "Generate Hacker News scraper",
      "dependencies": []
    },
    {
      "agent": "code",
      "task": "Add data persistence",
      "dependencies": [0]
    },
    {
      "agent": "analyst",
      "task": "Analyze posting patterns",
      "dependencies": [1]
    }
  ],
  "reasoning": "Need scraper first, then enhance with storage, then analyze"
}
```

### Step 3: Execution
Each agent executes its step:

**Step 1 - Scraper Agent**:
```javascript
// Generates Puppeteer code
const scraper = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('.athing')).map(el => ({
    title: el.querySelector('.titleline a').textContent,
    url: el.querySelector('.titleline a').href
  }));
});
```

**Step 2 - Code Agent** (uses output from Step 1):
```javascript
// Adds database storage
import { Database } from './db';
const db = new Database();
await db.insert('posts', scraper);
```

**Step 3 - Analyst Agent** (uses output from Step 2):
```javascript
// Analyzes data
const analysis = {
  totalPosts: scraper.length,
  topDomains: [...],
  avgPostsPerHour: 12.4
};
```

### Step 4: Synthesis
The **Planner Agent** combines all results into a final response.

## Using the System

### In the UI

1. **Enable Multi-Agent Mode**:
   - Toggle "🎭 Multi-Agent" in the sidebar
   - Agent status panel appears

2. **Send a Complex Request**:
   ```
   "Create a web scraper for Reddit's r/programming 
   and visualize posting frequency by hour"
   ```

3. **Watch the Workflow**:
   - See which agents are called (indicators light up)
   - View progress through each step
   - Final synthesized result displayed

### Programmatically

```javascript
import { AgentOrchestrator } from './src/agents/AgentOrchestrator.js';

const orchestrator = new AgentOrchestrator({
  url: 'http://localhost:11434',
  model: 'qwen2.5-coder:14b'
});

const result = await orchestrator.execute(
  "Build a data pipeline for API monitoring",
  {
    onProgress: (progress) => {
      console.log(`Step ${progress.step}: ${progress.currentTask}`);
    }
  }
);

console.log(result.result); // Final answer
console.log(result.agentsCalled); // ['planner', 'code', 'analyst']
console.log(result.toolsCalled); // ['fetch_url', 'save_file']
```

## Advanced Usage

### Adding Custom Agents

```javascript
orchestrator.registerAgent('translator', {
  name: 'Language Translator',
  model: 'llama3.2:latest',
  systemPrompt: 'You are a professional translator. Translate accurately while preserving tone and context.',
  capabilities: ['translate', 'detect_language', 'transliterate']
});
```

### Adding Custom Tools

```javascript
orchestrator.registerTool('query_database', {
  description: 'Query PostgreSQL database',
  parameters: {
    query: 'string - SQL query to execute',
    params: 'array - Query parameters'
  },
  handler: async (params) => {
    const client = await pool.connect();
    const result = await client.query(params.query, params.params);
    client.release();
    return { success: true, rows: result.rows };
  }
});
```

### Force Specific Agent

```javascript
// Skip planning, use specific agent
const result = await orchestrator.execute(
  "Write a sorting algorithm",
  { forceAgent: 'code' }
);
```

## Model Routing

The orchestrator automatically selects the best model for each task:

| Task Type | Model | Why |
|-----------|-------|-----|
| Code Generation | qwen2.5-coder:14b | Specialized for code |
| Reasoning/Planning | qwen2.5:14b | Strong reasoning |
| Fast Responses | qwen2.5:7b | Quick turnaround |
| Creative Writing | llama3.2:latest | Creative output |
| Vision Tasks | llava:latest | Image understanding |

You can customize this in `AgentOrchestrator.js`:
```javascript
this.modelRouter = {
  'code': 'your-preferred-model',
  'reasoning': 'another-model',
  // ...
};
```

## Real-World Examples

### Example 1: Research Paper Pipeline

**User Input**:
```
"Find recent papers on transformer models, 
summarize key findings, and create a comparison chart"
```

**Workflow**:
1. **Researcher Agent**: Searches academic databases
2. **Analyst Agent**: Extracts key findings
3. **Code Agent**: Generates chart code
4. **Planner Agent**: Synthesizes final report

### Example 2: Full-Stack Feature

**User Input**:
```
"Add a rate-limited API endpoint with Redis caching 
and write tests"
```

**Workflow**:
1. **Code Agent**: Generates Express.js endpoint
2. **Code Agent**: Adds Redis caching layer
3. **Code Agent**: Writes Jest tests
4. **Planner Agent**: Creates deployment guide

### Example 3: Data Pipeline

**User Input**:
```
"Scrape product data from 5 e-commerce sites, 
normalize the data, and find price discrepancies"
```

**Workflow**:
1. **Scraper Agent**: Generates 5 scrapers
2. **Code Agent**: Creates data normalization script
3. **Analyst Agent**: Identifies price patterns
4. **Code Agent**: Generates alert system
5. **Planner Agent**: Creates execution schedule

## Performance Metrics

Track agent performance in real-time:

```javascript
const stats = orchestrator.getStats();

console.log(stats);
// {
//   agents: [
//     {
//       id: 'code',
//       name: 'Code Generator',
//       calls: 42,
//       avgResponseTime: 1850,
//       capabilities: [...]
//     }
//   ],
//   tools: [
//     {
//       name: 'execute_code',
//       calls: 15
//     }
//   ],
//   totalExecutions: 12
// }
```

## Benefits

### 🎯 **Modularity**
- Each agent is independent
- Easy to add/remove/modify agents
- Swap models per agent

### 🔄 **Reusability**
- Agents are reusable across tasks
- Tools shared between agents
- Execution plans can be saved/replayed

### 📈 **Scalability**
- Add more agents without changing core logic
- Parallel execution (future enhancement)
- Load balancing across models

### 🧠 **Intelligence**
- Agents collaborate like human teams
- Context flows between agents
- Tools extend agent capabilities

### 🎨 **Flexibility**
- Mix different LLM models
- Custom prompts per agent
- Tool-calling for external actions

## Future Enhancements

### Planned Features

1. **Parallel Execution**
   ```javascript
   // Execute independent steps simultaneously
   await orchestrator.execute(task, { parallel: true });
   ```

2. **Agent Memory**
   ```javascript
   // Agents remember past interactions
   agent.memory.add(context);
   ```

3. **Human-in-the-Loop**
   ```javascript
   // Pause for human approval
   await orchestrator.execute(task, {
     requireApproval: ['deploy', 'delete']
   });
   ```

4. **External Model Support**
   ```javascript
   // Use OpenAI, Anthropic, etc.
   orchestrator.registerExternalModel('gpt-4', {
     provider: 'openai',
     apiKey: '...'
   });
   ```

5. **Workflow Templates**
   ```javascript
   // Reusable workflows
   const workflow = orchestrator.createWorkflow([
     { agent: 'scraper', task: '...' },
     { agent: 'analyst', task: '...', depends: [0] }
   ]);
   await workflow.execute();
   ```

## Troubleshooting

### Issue: Agents not loading
**Solution**: Check Ollama is running on port 11434
```bash
curl http://localhost:11434/api/tags
```

### Issue: Wrong agent selected
**Solution**: Be more specific in your request, or force an agent:
```javascript
orchestrator.execute(task, { forceAgent: 'code' });
```

### Issue: Tool calls failing
**Solution**: Check tool parameters match schema:
```javascript
// Wrong
{ "cod": "..." }  // typo

// Correct
{ "code": "..." }
```

### Issue: Slow performance
**Solution**: Use smaller models or skip planning:
```javascript
// Use fast model
orchestrator.modelRouter.reasoning = 'qwen2.5:7b';

// Skip planning for simple tasks
orchestrator.execute(task, { forceAgent: 'code' });
```

## Summary

You now have a **modular neural network of AI agents** that:

- ✅ Breaks complex tasks into steps (Planner)
- ✅ Routes to specialized agents (Orchestrator)
- ✅ Calls external tools (Tool System)
- ✅ Synthesizes final results (Synthesis)
- ✅ Tracks performance (Metrics)
- ✅ Supports custom agents/tools (Extensible)

This transforms your single-LLM interface into a **collaborative AI team** capable of handling complex, multi-step workflows.

**Next Steps**:
1. Try multi-agent mode in the UI
2. Watch agents collaborate on a complex task
3. Add your own custom agents
4. Create custom tools for your use case
5. Build workflow templates for repeated tasks
