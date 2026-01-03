# IAF Agent & Tool Architecture

## Current Architecture Analysis

### Current Structure (Flat)

```typescript
interface WorkflowConfig {
  name: string;
  version: string;
  description: string;
  
  iterativeWrapper: {
    layers: LayerConfig[];  // Workflow-level iteration
  };
  
  agent: AgentConfig;      // Single agent for entire workflow
  validation: ValidationConfig;
  tools: ToolConfig[];     // Tools defined at workflow level ❌
}

interface AgentConfig {
  name: string;
  model: string;
  temperature: number;
  systemPrompt: string;
  tools: string[];         // Just references tool names ❌
  context?: string;
}
```

**Problems:**
1. ❌ Tools are workflow-scoped, not agent-scoped
2. ❌ Only ONE agent per workflow (limiting)
3. ❌ Agent can't have its own iterative wrapper
4. ❌ No way to compose sub-agents into workflow steps
5. ❌ Tools can't be managed per-agent

---

## Proposed Architecture (Nested Agents)

### Hierarchical Structure

```
Workflow (Iterative Wrapper)
  ├─ Layer 1: Data Collection
  │   └─ Agent 1 (Scraper Agent)
  │       ├─ Iterative Wrapper (own retry logic)
  │       ├─ Tools: [webScraper, htmlParser, cookieManager]
  │       ├─ Model: llama3.2:3b (lightweight)
  │       └─ Context: "Extract product data"
  │
  ├─ Layer 2: Data Transformation
  │   └─ Agent 2 (Parser Agent)
  │       ├─ Iterative Wrapper (validation loop)
  │       ├─ Tools: [jsonTransformer, dataValidator, dateParser]
  │       ├─ Model: mistral-nemo:12b (complex reasoning)
  │       └─ Context: "Normalize and validate"
  │
  ├─ Layer 3: Quality Check
  │   └─ Agent 3 (Supervisor Agent)
  │       ├─ Iterative Wrapper (review cycle)
  │       ├─ Tools: [compareResults, generateReport]
  │       ├─ Model: qwen2.5:14b (analytical)
  │       └─ Context: "Verify completeness"
  │
  └─ Layer 4: Output
      └─ Agent 4 (Export Agent)
          ├─ No iteration (single shot)
          ├─ Tools: [csvExporter, jsonExporter, emailSender]
          ├─ Model: llama3.2:1b (simple formatting)
          └─ Context: "Format and deliver"
```

---

## Enhanced Type Definitions

### New Types

```typescript
/**
 * Agent with its own tools and iterative wrapper
 */
export interface AgentConfig {
  id: string;                    // Unique agent identifier
  name: string;                  // Human-readable name
  model: string;                 // LLM model to use
  temperature: number;
  systemPrompt: string;
  
  // Agent-specific tools (not workflow-level!)
  tools: ToolConfig[];           // Full tool definitions
  
  // Optional: Agent's own iterative wrapper
  iterativeWrapper?: {
    enabled: boolean;
    maxAttempts: number;
    strategy: 'retry' | 'refinement' | 'validation';
    patterns?: PatternConfig[];
  };
  
  // Context/memory for this agent
  context?: {
    type: 'shared' | 'isolated' | 'inherited';
    data?: Record<string, any>;
    memory?: AgentMemory;
  };
  
  // Metadata
  metadata?: {
    cost?: number;              // Estimated cost per invocation
    latency?: number;           // Expected latency (ms)
    capabilities?: string[];    // What this agent is good at
  };
}

/**
 * Layer now contains an agent (or multiple agents)
 */
export interface LayerConfig {
  name: string;
  description?: string;
  
  // Each layer can have one or more agents
  agents: AgentConfig[];        // Multiple agents can collaborate
  
  // Or reference pre-defined agents
  agentRefs?: string[];         // IDs of agents defined elsewhere
  
  // Layer-level iteration (wrapper around agent(s))
  maxAttempts: number;
  strategy: 'sequential' | 'parallel' | 'consensus';
  
  // Validation after layer completes
  validation?: ValidationConfig;
  
  // Pass output to next layer or stop
  onSuccess: 'continue' | 'return' | 'branch';
  onFailure: 'retry' | 'escalate' | 'fail' | 'fallback';
  
  // Fallback agent if primary fails
  fallbackAgent?: AgentConfig;
}

/**
 * Workflow is a container for agents and layers
 */
export interface WorkflowConfig {
  name: string;
  version: string;
  description: string;
  
  // Pre-define reusable agents (optional)
  agentRegistry?: {
    [agentId: string]: AgentConfig;
  };
  
  // Pre-define reusable tools (optional)
  toolRegistry?: {
    [toolId: string]: ToolConfig;
  };
  
  // Workflow-level iterative wrapper (outer loop)
  iterativeWrapper: {
    layers: LayerConfig[];      // Each layer has agent(s)
    globalValidation?: ValidationConfig;
  };
  
  // Workflow-level settings
  settings?: {
    timeout?: number;
    maxCost?: number;
    parallelism?: number;
  };
}

/**
 * Tool definition (now agent-scoped)
 */
export interface ToolConfig {
  id: string;
  name: string;
  type: 'llm_query' | 'execute_server' | 'http' | 'scraper' | 'custom';
  description: string;
  
  // Input/output schema
  schema: {
    input: Record<string, any>;
    output: Record<string, any>;
  };
  
  // Implementation details
  implementation: {
    type: 'built-in' | 'remote' | 'custom';
    endpoint?: string;          // For remote tools
    code?: string;              // For custom tools
    config?: Record<string, any>;
  };
  
  // Access control
  restrictions?: {
    maxCallsPerMinute?: number;
    requiresAuth?: boolean;
    allowedAgents?: string[];   // Which agents can use this
  };
}
```

---

## Example: Multi-Agent Workflow

### Job Listing Scraper with 4 Specialized Agents

```json
{
  "name": "Job Board Scraper with Specialized Agents",
  "version": "2.0.0",
  "description": "Uses 4 specialized agents with different tools and capabilities",
  
  "agentRegistry": {
    "scraper-agent": {
      "id": "scraper-agent",
      "name": "Web Scraper Agent",
      "model": "llama3.2:3b",
      "temperature": 0.3,
      "systemPrompt": "You are a web scraping specialist. Extract data from HTML.",
      
      "tools": [
        {
          "id": "web-scraper",
          "name": "webScraper",
          "type": "execute_server",
          "description": "Executes Playwright scraper code",
          "schema": {
            "input": { "url": "string", "code": "string" },
            "output": { "data": "array", "html": "string" }
          },
          "implementation": {
            "type": "remote",
            "endpoint": "http://localhost:3002/execute"
          }
        },
        {
          "id": "html-parser",
          "name": "htmlParser",
          "type": "custom",
          "description": "Parses HTML with Cheerio",
          "schema": {
            "input": { "html": "string", "selector": "string" },
            "output": { "elements": "array" }
          },
          "implementation": {
            "type": "built-in",
            "config": { "library": "cheerio" }
          }
        }
      ],
      
      "iterativeWrapper": {
        "enabled": true,
        "maxAttempts": 3,
        "strategy": "retry",
        "patterns": [
          { "pattern": "timeout", "fix": "increase_wait_time" },
          { "pattern": "selector_not_found", "fix": "try_alternative_selector" }
        ]
      },
      
      "metadata": {
        "cost": 0.01,
        "latency": 2000,
        "capabilities": ["web-scraping", "html-parsing", "dynamic-content"]
      }
    },
    
    "validator-agent": {
      "id": "validator-agent",
      "name": "Data Validator Agent",
      "model": "mistral-nemo:12b",
      "temperature": 0.1,
      "systemPrompt": "You validate scraped data for completeness and accuracy.",
      
      "tools": [
        {
          "id": "field-checker",
          "name": "fieldChecker",
          "type": "custom",
          "description": "Checks required fields are present",
          "schema": {
            "input": { "data": "array", "requiredFields": "array" },
            "output": { "valid": "boolean", "missing": "array" }
          },
          "implementation": {
            "type": "built-in"
          }
        },
        {
          "id": "format-validator",
          "name": "formatValidator",
          "type": "custom",
          "description": "Validates data formats (dates, emails, URLs)",
          "schema": {
            "input": { "field": "string", "format": "string" },
            "output": { "valid": "boolean", "corrected": "string" }
          },
          "implementation": {
            "type": "built-in"
          }
        }
      ],
      
      "iterativeWrapper": {
        "enabled": true,
        "maxAttempts": 2,
        "strategy": "validation"
      },
      
      "metadata": {
        "cost": 0.05,
        "latency": 1500,
        "capabilities": ["validation", "data-quality", "error-detection"]
      }
    },
    
    "enrichment-agent": {
      "id": "enrichment-agent",
      "name": "Data Enrichment Agent",
      "model": "qwen2.5:14b",
      "temperature": 0.5,
      "systemPrompt": "You enrich job listings with additional context.",
      
      "tools": [
        {
          "id": "company-lookup",
          "name": "companyLookup",
          "type": "http",
          "description": "Looks up company info from API",
          "schema": {
            "input": { "companyName": "string" },
            "output": { "info": "object" }
          },
          "implementation": {
            "type": "remote",
            "endpoint": "https://api.clearbit.com/v2/companies/find"
          }
        },
        {
          "id": "salary-estimator",
          "name": "salaryEstimator",
          "type": "llm_query",
          "description": "Estimates salary range based on job description",
          "schema": {
            "input": { "title": "string", "location": "string" },
            "output": { "minSalary": "number", "maxSalary": "number" }
          },
          "implementation": {
            "type": "built-in",
            "config": { "model": "qwen2.5:14b" }
          }
        }
      ],
      
      "metadata": {
        "cost": 0.15,
        "latency": 3000,
        "capabilities": ["enrichment", "api-calls", "estimation"]
      }
    },
    
    "export-agent": {
      "id": "export-agent",
      "name": "Export Agent",
      "model": "llama3.2:1b",
      "temperature": 0.0,
      "systemPrompt": "You export data to various formats.",
      
      "tools": [
        {
          "id": "csv-exporter",
          "name": "csvExporter",
          "type": "custom",
          "description": "Exports data to CSV",
          "schema": {
            "input": { "data": "array", "columns": "array" },
            "output": { "csv": "string", "path": "string" }
          },
          "implementation": {
            "type": "built-in"
          }
        },
        {
          "id": "json-exporter",
          "name": "jsonExporter",
          "type": "custom",
          "description": "Exports data to JSON",
          "schema": {
            "input": { "data": "array" },
            "output": { "json": "string", "path": "string" }
          },
          "implementation": {
            "type": "built-in"
          }
        },
        {
          "id": "email-sender",
          "name": "emailSender",
          "type": "http",
          "description": "Sends results via email",
          "schema": {
            "input": { "to": "string", "subject": "string", "body": "string" },
            "output": { "sent": "boolean" }
          },
          "implementation": {
            "type": "remote",
            "endpoint": "https://api.sendgrid.com/v3/mail/send"
          }
        }
      ],
      
      "metadata": {
        "cost": 0.001,
        "latency": 500,
        "capabilities": ["export", "formatting", "delivery"]
      }
    }
  },
  
  "iterativeWrapper": {
    "layers": [
      {
        "name": "Layer 1: Scrape Job Listings",
        "description": "Use lightweight agent to scrape multiple job boards",
        "agentRefs": ["scraper-agent"],
        "maxAttempts": 3,
        "strategy": "sequential",
        "onSuccess": "continue",
        "onFailure": "retry"
      },
      {
        "name": "Layer 2: Validate Data Quality",
        "description": "Use powerful agent to validate completeness",
        "agentRefs": ["validator-agent"],
        "maxAttempts": 2,
        "strategy": "sequential",
        "validation": {
          "type": "field_coverage",
          "successCriteria": ["coverage > 80%"]
        },
        "onSuccess": "continue",
        "onFailure": "escalate"
      },
      {
        "name": "Layer 3: Enrich with Context",
        "description": "Use analytical agent to add company info and estimates",
        "agentRefs": ["enrichment-agent"],
        "maxAttempts": 1,
        "strategy": "sequential",
        "onSuccess": "continue",
        "onFailure": "continue"
      },
      {
        "name": "Layer 4: Export Results",
        "description": "Use simple agent to format and deliver",
        "agentRefs": ["export-agent"],
        "maxAttempts": 1,
        "strategy": "sequential",
        "onSuccess": "return",
        "onFailure": "fail"
      }
    ]
  }
}
```

---

## How to Manage Tools Per Agent

### 1. Define Tools in Agent Registry

```typescript
// Tool is defined with the agent that uses it
const scraperAgent: AgentConfig = {
  id: 'scraper-agent',
  name: 'Web Scraper',
  model: 'llama3.2:3b',
  tools: [
    {
      id: 'web-scraper',
      name: 'webScraper',
      type: 'execute_server',
      // ... tool definition
    }
  ]
};
```

### 2. Share Tools Across Agents (Tool Registry)

```typescript
// Define tools once in workflow.toolRegistry
const workflow: WorkflowConfig = {
  toolRegistry: {
    'web-scraper': {
      id: 'web-scraper',
      name: 'webScraper',
      // ... definition
    },
    'html-parser': {
      id: 'html-parser',
      name: 'htmlParser',
      // ... definition
    }
  },
  
  agentRegistry: {
    'scraper-agent': {
      // Reference tools by ID
      tools: [
        { ref: 'web-scraper' },  // References toolRegistry['web-scraper']
        { ref: 'html-parser' }
      ]
    },
    'validator-agent': {
      tools: [
        { ref: 'html-parser' }   // Same tool, different agent
      ]
    }
  }
};
```

### 3. Restrict Tool Access

```typescript
const sensitiveApiTool: ToolConfig = {
  id: 'payment-api',
  name: 'paymentAPI',
  type: 'http',
  description: 'Processes payments',
  
  restrictions: {
    allowedAgents: ['payment-agent'],  // Only this agent can use
    maxCallsPerMinute: 10,
    requiresAuth: true
  }
};
```

---

## Implementation Guide

### Step 1: Update Type Definitions

**File: `src/iaf/core/types.ts`**

Add the enhanced types above.

### Step 2: Create Agent Registry Manager

**File: `src/iaf/core/AgentRegistry.ts`**

```typescript
export class AgentRegistry {
  private agents: Map<string, AgentConfig> = new Map();
  
  register(agent: AgentConfig): void {
    this.agents.set(agent.id, agent);
  }
  
  get(agentId: string): AgentConfig | undefined {
    return this.agents.get(agentId);
  }
  
  listAgents(): AgentConfig[] {
    return Array.from(this.agents.values());
  }
  
  getAgentTools(agentId: string): ToolConfig[] {
    const agent = this.get(agentId);
    return agent?.tools || [];
  }
}
```

### Step 3: Update Workflow Runner

**File: `src/iaf/IAFWorkflowRunner.ts`**

```typescript
export class IAFWorkflowRunner {
  private agentRegistry: AgentRegistry;
  private toolRegistry: ToolRegistry;
  
  async executeLayer(layer: LayerConfig, context: ExecutionContext) {
    // Get agent(s) for this layer
    const agents = layer.agentRefs?.map(id => 
      this.agentRegistry.get(id)
    ) || layer.agents;
    
    // Execute with each agent
    for (const agent of agents) {
      // Load agent's tools
      const tools = this.loadToolsForAgent(agent);
      
      // Check if agent has its own iterative wrapper
      if (agent.iterativeWrapper?.enabled) {
        // Run agent's iteration loop
        const result = await this.runAgentWithIteration(
          agent, 
          tools, 
          context
        );
      } else {
        // Single execution
        const result = await this.runAgent(agent, tools, context);
      }
    }
  }
  
  private async runAgentWithIteration(
    agent: AgentConfig,
    tools: ToolConfig[],
    context: ExecutionContext
  ) {
    const maxAttempts = agent.iterativeWrapper!.maxAttempts;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const result = await this.runAgent(agent, tools, context);
      
      if (result.success) return result;
      
      // Apply agent's retry strategy
      await this.applyAgentStrategy(agent, result);
    }
  }
}
```

### Step 4: UI for Managing Agents

**File: `sdk-demo/src/components/IAFWorkflowBuilder.js`**

Add sections for:
1. **Agent Registry** - Define reusable agents
2. **Tool Registry** - Define reusable tools
3. **Layer Configuration** - Assign agents to layers
4. **Agent Editor** - Edit agent's tools and wrapper

```javascript
renderAgentRegistry() {
  return `
    <div class="agent-registry">
      <h3>🤖 Agent Registry</h3>
      <button onclick="addAgent()">➕ Add Agent</button>
      
      ${this.workflow.agentRegistry?.map(agent => `
        <div class="agent-card">
          <h4>${agent.name}</h4>
          <p>Model: ${agent.model}</p>
          <p>Tools: ${agent.tools.length}</p>
          <p>Has iteration: ${agent.iterativeWrapper?.enabled ? '✅' : '❌'}</p>
          <button onclick="editAgent('${agent.id}')">✏️ Edit</button>
        </div>
      `).join('')}
    </div>
  `;
}

renderToolRegistry() {
  return `
    <div class="tool-registry">
      <h3>🛠️ Tool Registry</h3>
      <button onclick="addTool()">➕ Add Tool</button>
      
      ${this.workflow.toolRegistry?.map(tool => `
        <div class="tool-card">
          <h4>${tool.name}</h4>
          <p>Type: ${tool.type}</p>
          <p>Used by: ${this.getAgentsUsingTool(tool.id).length} agents</p>
          <button onclick="editTool('${tool.id}')">✏️ Edit</button>
        </div>
      `).join('')}
    </div>
  `;
}
```

---

## Benefits of This Architecture

### 1. **Agent Specialization**
- ✅ Use lightweight models for simple tasks (llama3.2:1b for formatting)
- ✅ Use powerful models for complex reasoning (qwen2.5:14b for analysis)
- ✅ Each agent has exactly the tools it needs

### 2. **Reusability**
- ✅ Define agent once, use in multiple workflows
- ✅ Share tools across agents
- ✅ Build library of specialized agents

### 3. **Isolation**
- ✅ Agent failures don't affect other agents
- ✅ Tools can't be accessed by unauthorized agents
- ✅ Separate memory/context per agent

### 4. **Composability**
- ✅ Mix and match agents in layers
- ✅ Nest agent iterations within workflow iterations
- ✅ Create agent pipelines (output of one → input of next)

### 5. **Cost Optimization**
- ✅ Use cheap models where possible
- ✅ Track cost per agent
- ✅ Set spending limits per agent

### 6. **Debugging**
- ✅ See which agent produced which output
- ✅ Trace tool usage per agent
- ✅ Isolate failures to specific agents

---

## Migration Path

### Phase 1: Backward Compatible
Keep existing flat structure working, add optional nested structure.

### Phase 2: Gradual Adoption
Allow mixing old (workflow.tools) and new (agent.tools) patterns.

### Phase 3: Full Migration
Deprecate workflow-level tools, make agents mandatory containers.

---

## Summary

**Current:** Workflow → Agent (references tools by name)  
**Proposed:** Workflow → Layers → Agents (each with own tools & iteration)

**Key Changes:**
1. Tools move from workflow-level to agent-level
2. Agents can have their own iterative wrappers
3. Layers reference agents (not just use one global agent)
4. Agent registry for reusable agents
5. Tool registry for shared tools
6. Access control on tools

This makes IAF truly composable - you can build complex workflows from specialized, reusable agents, each with their own tools and iteration logic!
