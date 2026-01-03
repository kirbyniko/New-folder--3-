# IAF Hierarchical Agent Architecture - Implementation Complete

## Overview

Successfully implemented hierarchical agent architecture for the Iterative Agent Framework (IAF), enabling multi-agent workflows with specialized agents, tool registries, and nested iterative wrappers.

## What Was Implemented

### 1. Enhanced Type Definitions (`types.ts`)

**New Interfaces:**
- `AgentIterativeWrapper` - Agent-level iteration configuration
- `AgentContextConfig` - Agent memory and context management
- `AgentMetadata` - Cost, latency, and capability tracking
- `ToolRestrictions` - Access control and rate limiting
- `ToolReference` - Shared tool references
- `WorkflowSettings` - Workflow-level configuration

**Enhanced Interfaces:**
- `AgentConfig` - Now owns tools, has iterative wrapper, context management
- `LayerConfig` - Can reference multiple agents (inline or from registry)
- `WorkflowConfig` - Added `agentRegistry`, `toolRegistry`, optional settings
- `ToolConfig` - Added `id`, `restrictions` for access control

**Backward Compatibility:**
- Old fields kept optional: `agent`, `tools`, `validation`
- Workflows using old structure continue to work
- Runner automatically detects and adapts legacy workflows

### 2. AgentRegistry Class (`AgentRegistry.ts`)

**Core Features:**
```typescript
register(agent: AgentConfig): void
get(id: string): AgentConfig | undefined
update(id: string, updates): void
remove(id: string): boolean
```

**Advanced Features:**
- `loadFromRegistry()` - Import from workflow config
- `exportToRegistry()` - Export to workflow format
- `findByTag()`, `findByCapability()`, `findByModel()` - Search
- `clone()` - Clone agent with new ID
- `getStats()` - Usage analytics

**Validation:**
- Checks required fields (name, model, systemPrompt)
- Validates temperature range (0-1)
- Validates tool configurations
- Validates iterative wrapper settings

### 3. ToolRegistry Class (`ToolRegistry.ts`)

**Core Features:**
```typescript
register(tool: ToolConfig): void
get(id: string): ToolConfig | undefined
checkAccess(toolId: string, agentId: string): boolean
checkRateLimit(toolId: string): { allowed, reason? }
recordCall(toolId: string, success: boolean): void
```

**Access Control:**
- Per-tool agent restrictions (`allowedAgents` list)
- Rate limiting (`maxCallsPerMinute`)
- Authentication requirements (`requiresAuth`)

**Usage Tracking:**
```typescript
interface ToolUsageStats {
  totalCalls: number
  lastCalled?: Date
  callsPerMinute: number
  errors: number
}
```

**Advanced Features:**
- `findByType()` - Filter by tool type
- `findAccessibleTools()` - Get tools for specific agent
- `getSummaryStats()` - Aggregate statistics
- `resetStats()` - Clear usage data

### 4. Enhanced IAFWorkflowRunner (`IAFWorkflowRunner.ts`)

**Initialization:**
```typescript
constructor() {
  this.agentRegistry = new AgentRegistry();
  this.toolRegistry = new ToolRegistry();
}
```

**Registry Loading:**
- Auto-loads agents from `workflow.agentRegistry`
- Auto-loads tools from `workflow.toolRegistry`
- Backward compatible with legacy single-agent workflows
- Reports registry stats on load

**Layer Execution Strategies:**

1. **Sequential** (default):
```typescript
executeAgentsSequentially(agents, context, layerConfig)
// Runs agents one after another
// Output of agent N becomes input to agent N+1
```

2. **Parallel**:
```typescript
executeAgentsInParallel(agents, context, layerConfig)
// Runs all agents simultaneously
// Returns array of all outputs
```

3. **Consensus**:
```typescript
executeAgentsWithConsensus(agents, context, layerConfig)
// Runs all agents, finds most common output
// Returns majority result
```

**Agent-Level Iteration:**
```typescript
executeAgentWithIteration(agent, context)
// If agent.iterativeWrapper.enabled
// Supports strategies: 'retry', 'refinement', 'validation'
// Max attempts: agent.iterativeWrapper.maxAttempts
```

**Tool Access Control:**
- Checks `toolRegistry.checkAccess(toolId, agentId)`
- Enforces rate limits before execution
- Records tool usage after execution
- Logs warnings for restricted tools

## Architecture Examples

### Example 1: Job Scraper with Specialized Agents

```typescript
{
  name: "Job Scraper Workflow",
  version: "2.0.0",
  
  agentRegistry: {
    "scraper-agent": {
      id: "scraper-agent",
      name: "Web Scraper",
      model: "llama3.2:3b",
      temperature: 0.1,
      systemPrompt: "You are a web scraping specialist...",
      tools: [
        { id: "http-client", name: "HTTP Client", type: "http", ... },
        { id: "html-parser", name: "HTML Parser", type: "custom", ... }
      ],
      metadata: { cost: 0.001, latency: 500, capabilities: ["scraping"] }
    },
    
    "validator-agent": {
      id: "validator-agent",
      name: "Data Validator",
      model: "mistral-nemo:12b",
      temperature: 0.3,
      systemPrompt: "You validate scraped data...",
      tools: [
        { id: "schema-validator", name: "Schema Validator", type: "custom", ... }
      ],
      iterativeWrapper: {
        enabled: true,
        maxAttempts: 3,
        strategy: "validation"
      },
      metadata: { cost: 0.01, latency: 1500, capabilities: ["validation"] }
    },
    
    "enrichment-agent": {
      id: "enrichment-agent",
      name: "Data Enricher",
      model: "qwen2.5:14b",
      temperature: 0.5,
      systemPrompt: "You enrich job data...",
      tools: [
        { id: "geocoding-api", name: "Geocoding API", type: "http", 
          restrictions: { maxCallsPerMinute: 60 }, ... },
        { id: "salary-estimator", name: "Salary Estimator", type: "custom", ... }
      ],
      metadata: { cost: 0.02, latency: 2000, capabilities: ["enrichment"] }
    },
    
    "export-agent": {
      id: "export-agent",
      name: "JSON Exporter",
      model: "llama3.2:1b",
      temperature: 0.1,
      systemPrompt: "You format data as JSON...",
      tools: [
        { id: "json-formatter", name: "JSON Formatter", type: "custom", ... }
      ],
      metadata: { cost: 0.0005, latency: 200, capabilities: ["formatting"] }
    }
  },
  
  toolRegistry: {
    "shared-cache": {
      id: "shared-cache",
      name: "Redis Cache",
      type: "custom",
      description: "Shared caching layer",
      restrictions: {
        allowedAgents: ["scraper-agent", "enrichment-agent"],
        maxCallsPerMinute: 1000
      },
      implementation: { type: "built-in", endpoint: "redis://localhost:6379" }
    }
  },
  
  iterativeWrapper: {
    layers: [
      {
        name: "Scraping Layer",
        agentRefs: ["scraper-agent"],
        maxAttempts: 3,
        strategy: "pattern_detection",
        onSuccess: "continue",
        onFailure: "retry"
      },
      {
        name: "Validation Layer",
        agentRefs: ["validator-agent"],
        maxAttempts: 2,
        strategy: "sequential",
        onSuccess: "continue",
        onFailure: "escalate"
      },
      {
        name: "Enrichment Layer",
        agentRefs: ["enrichment-agent"],
        maxAttempts: 1,
        strategy: "sequential",
        onSuccess: "continue",
        onFailure: "continue" // Optional enrichment
      },
      {
        name: "Export Layer",
        agentRefs: ["export-agent"],
        maxAttempts: 1,
        strategy: "sequential",
        onSuccess: "return",
        onFailure: "fail"
      }
    ]
  }
}
```

### Example 2: Consensus Voting with Multiple Models

```typescript
{
  name: "Multi-Model Consensus",
  
  agentRegistry: {
    "llama-analyst": {
      id: "llama-analyst",
      model: "llama3.2:3b",
      name: "Llama Analyst",
      tools: [...]
    },
    "mistral-analyst": {
      id: "mistral-analyst",
      model: "mistral-nemo:12b",
      name: "Mistral Analyst",
      tools: [...]
    },
    "qwen-analyst": {
      id: "qwen-analyst",
      model: "qwen2.5:14b",
      name: "Qwen Analyst",
      tools: [...]
    }
  },
  
  iterativeWrapper: {
    layers: [
      {
        name: "Consensus Analysis",
        agentRefs: ["llama-analyst", "mistral-analyst", "qwen-analyst"],
        strategy: "consensus", // Run all, pick majority
        maxAttempts: 1,
        onSuccess: "return",
        onFailure: "retry"
      }
    ]
  }
}
```

### Example 3: Agent with Own Iterative Wrapper

```typescript
{
  name: "Self-Refining Agent",
  
  agentRegistry: {
    "refining-writer": {
      id: "refining-writer",
      model: "mistral-nemo:12b",
      name: "Self-Refining Writer",
      systemPrompt: "You write and refine content...",
      
      // This agent refines its own output internally
      iterativeWrapper: {
        enabled: true,
        maxAttempts: 5,
        strategy: "refinement",
        patterns: [
          { pattern: "vague", fix: "Be more specific" },
          { pattern: "too short", fix: "Add more detail" }
        ]
      },
      
      tools: [
        { id: "grammar-checker", name: "Grammar Checker", type: "custom", ... },
        { id: "readability-scorer", name: "Readability Scorer", type: "custom", ... }
      ]
    }
  },
  
  iterativeWrapper: {
    layers: [
      {
        name: "Writing Layer",
        agentRefs: ["refining-writer"],
        maxAttempts: 1, // Agent handles its own iteration
        strategy: "sequential",
        onSuccess: "return",
        onFailure: "fail"
      }
    ]
  }
}
```

## Migration Guide

### From Old Structure to New

**Old (Flat) Structure:**
```typescript
{
  name: "Old Workflow",
  agent: {
    name: "Single Agent",
    model: "llama3.2:3b",
    tools: ["tool1", "tool2"] // Just references
  },
  tools: [
    { name: "tool1", type: "http", ... },
    { name: "tool2", type: "custom", ... }
  ],
  iterativeWrapper: {
    layers: [
      { name: "Layer 1", maxAttempts: 3, ... }
    ]
  }
}
```

**New (Hierarchical) Structure:**
```typescript
{
  name: "New Workflow",
  
  agentRegistry: {
    "agent-1": {
      id: "agent-1",
      name: "Specialized Agent",
      model: "llama3.2:3b",
      tools: [ // Full definitions
        { id: "tool1", name: "Tool 1", type: "http", ... },
        { id: "tool2", name: "Tool 2", type: "custom", ... }
      ]
    }
  },
  
  iterativeWrapper: {
    layers: [
      { 
        name: "Layer 1", 
        agentRefs: ["agent-1"], // Reference registry
        maxAttempts: 3 
      }
    ]
  }
}
```

**Auto-Migration:**
The runner automatically handles old workflows:
1. Detects legacy structure (no `agentRegistry`)
2. Creates synthetic agent with ID `default-agent`
3. Registers workflow-level tools
4. Logs warning: "Using legacy single-agent workflow structure"

## Benefits Achieved

### 1. Agent Specialization
- Different models for different tasks (cost optimization)
- Small fast models (1B) for simple tasks
- Large powerful models (14B) for complex reasoning
- Specialized system prompts per agent

### 2. Tool Management
- Tools owned by agents (encapsulation)
- Shared tools via toolRegistry (DRY principle)
- Access control per agent (security)
- Rate limiting per tool (API quota management)

### 3. Composability
- Agents defined once, used many times
- Mix and match agents across workflows
- Clone and customize agents easily
- Share tool definitions across agents

### 4. Cost Optimization
- Use cheap models for simple tasks
- Reserve expensive models for complex reasoning
- Track cost per agent via metadata
- Optimize by analyzing usage stats

### 5. Reliability
- Agent-level retries with iterative wrapper
- Fallback agents on layer failure
- Consensus strategies for critical decisions
- Parallel execution for redundancy

### 6. Observability
- Track tool usage per agent
- Monitor rate limits in real-time
- Analyze agent performance by model
- Debug with detailed execution logs

## Usage Statistics

The system tracks comprehensive statistics:

**Agent Registry Stats:**
```typescript
{
  total: 4,
  byModel: { "llama3.2:3b": 2, "mistral-nemo:12b": 1, "qwen2.5:14b": 1 },
  byCapability: { "scraping": 1, "validation": 1, "enrichment": 1 },
  withIterativeWrapper: 2,
  averageToolCount: 2.5
}
```

**Tool Registry Stats:**
```typescript
{
  total: 8,
  byType: { "http": 3, "custom": 4, "scraper": 1 },
  withRestrictions: 3,
  totalCalls: 1247,
  totalErrors: 23
}
```

**Per-Tool Usage:**
```typescript
{
  "http-client": {
    totalCalls: 453,
    lastCalled: "2024-01-15T10:30:45Z",
    callsPerMinute: 12,
    errors: 5
  }
}
```

## Next Steps

### Frontend UI Updates (TODO)

1. **Agent Management Panel:**
   - List all registered agents
   - Create/edit/delete agents
   - Configure agent iterative wrappers
   - Set agent metadata (cost, capabilities)
   - Clone agents with modifications

2. **Tool Management Panel:**
   - List all registered tools
   - Create/edit/delete tools
   - Configure tool restrictions
   - Set rate limits
   - View usage statistics

3. **Layer Editor Enhancement:**
   - Dropdown to select agents from registry
   - Multi-select for parallel/consensus strategies
   - Visual indicator for agent count per layer
   - Drag-and-drop agent ordering

4. **Workflow Visualization:**
   - Flowchart showing agent flow
   - Color-code by model type
   - Show tool dependencies
   - Display cost estimates

### AI Generator Updates (TODO)

Update `generateWorkflowWithAI()` prompt to include:
- Agent registry structure
- Tool registry structure
- Multi-agent layer configuration
- Agent-specific tool assignments

Example prompt addition:
```
Generate a workflow with these specialized agents:
1. Scraper Agent (cheap, fast) - Uses HTTP and parsing tools
2. Validator Agent (medium) - Uses validation tools, has iterative wrapper
3. Enrichment Agent (expensive) - Uses external APIs
4. Export Agent (cheap) - Formats final output

Structure with agentRegistry, toolRegistry, and layers referencing agents.
```

### Testing Requirements

1. **Unit Tests:**
   - AgentRegistry CRUD operations
   - ToolRegistry access control
   - Rate limiting enforcement
   - Validation logic

2. **Integration Tests:**
   - Workflow execution with multiple agents
   - Sequential vs parallel vs consensus strategies
   - Agent iterative wrapper behavior
   - Backward compatibility with legacy workflows

3. **Performance Tests:**
   - Large agent registries (100+ agents)
   - High-frequency tool calls (rate limiting)
   - Parallel agent execution scaling
   - Memory usage with nested iterations

## Files Modified

1. **`scraper-backend/src/iaf/core/types.ts`** (127 → 254 lines)
   - Enhanced AgentConfig, LayerConfig, WorkflowConfig
   - Added AgentIterativeWrapper, AgentContextConfig, ToolRestrictions
   - Maintained backward compatibility

2. **`scraper-backend/src/iaf/core/AgentRegistry.ts`** (NEW - 256 lines)
   - Complete agent lifecycle management
   - Validation, search, cloning
   - Statistics and analytics

3. **`scraper-backend/src/iaf/core/ToolRegistry.ts`** (NEW - 315 lines)
   - Tool access control
   - Rate limiting enforcement
   - Usage tracking and statistics

4. **`scraper-backend/src/iaf/IAFWorkflowRunner.ts`** (70 → 447 lines)
   - Registry initialization
   - Multi-agent layer execution
   - Sequential/parallel/consensus strategies
   - Agent-level iteration support
   - Tool access enforcement
   - Backward compatibility

## Summary

Successfully transformed IAF from a single-agent framework into a hierarchical multi-agent system. The architecture now supports:
- ✅ Multiple specialized agents per workflow
- ✅ Agent-level tool ownership
- ✅ Shared tool registries
- ✅ Agent-level iterative wrappers
- ✅ Multiple execution strategies (sequential/parallel/consensus)
- ✅ Tool access control and rate limiting
- ✅ Comprehensive usage tracking
- ✅ Backward compatibility with legacy workflows

The foundation is complete. Next phase focuses on frontend UI and AI generator integration.
