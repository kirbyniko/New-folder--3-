# Compositional Architecture Vision

## Overview

The IAF (Iterative Agent Framework) is designed to support **recursive composition** of agents and workflows, allowing you to build complex multi-agent systems from simpler building blocks.

## Core Concept: Everything is Composable

```
┌─────────────────────────────────────────────┐
│         Master Workflow (Layer 0)           │
│                                             │
│  ┌───────────┐  ┌──────────────────────┐  │
│  │ Agent A   │  │ Sub-Workflow 1       │  │
│  │ (simple)  │  │                      │  │
│  └───────────┘  │  ┌────────┐ ┌─────┐ │  │
│                 │  │Agent B │ │Sub- │ │  │
│                 │  │        │ │Flow2│ │  │
│                 │  └────────┘ └─────┘ │  │
│                 └──────────────────────┘  │
└─────────────────────────────────────────────┘
```

## Architecture Levels

### Level 1: Standalone Agents
**Single agents with tools and iteration logic**

```javascript
{
  id: 'scraper-agent',
  name: 'Web Scraper',
  model: 'llama3.2:3b',
  tools: ['fetch_url', 'parse_html'],
  iterativeWrapper: {
    enabled: true,
    strategy: 'refinement',
    maxAttempts: 3
  }
}
```

**Usage:** Simple, focused tasks that don't need orchestration

### Level 2: Single-Layer Workflows
**Multiple agents working together in one layer**

```javascript
{
  name: 'Data Pipeline',
  agentRegistry: {
    'fetcher': { /* Agent A */ },
    'parser': { /* Agent B */ },
    'validator': { /* Agent C */ }
  },
  iterativeWrapper: {
    layers: [{
      name: 'Processing',
      agentRefs: ['fetcher', 'parser', 'validator'],
      strategy: 'sequential'
    }]
  }
}
```

**Usage:** Multi-step processes with specialized agents

### Level 3: Multi-Layer Workflows
**Multiple layers with different agent combinations**

```javascript
{
  name: 'Complex Pipeline',
  agentRegistry: {
    'scraper': { /* ... */ },
    'cleaner': { /* ... */ },
    'analyzer': { /* ... */ },
    'reporter': { /* ... */}
  },
  iterativeWrapper: {
    layers: [
      {
        name: 'Data Collection',
        agentRefs: ['scraper'],
        strategy: 'parallel',
        maxAttempts: 5
      },
      {
        name: 'Data Processing',
        agentRefs: ['cleaner', 'analyzer'],
        strategy: 'sequential',
        maxAttempts: 3
      },
      {
        name: 'Reporting',
        agentRefs: ['reporter'],
        strategy: 'sequential'
      }
    ]
  }
}
```

**Usage:** Complex pipelines with distinct phases

### Level 4: Workflow References (THE VISION 🎯)
**Workflows that reference other workflows as components**

```javascript
{
  name: 'Master Orchestration Workflow',
  
  // Include agents AND sub-workflows
  agentRegistry: {
    'coordinator': { /* Simple coordinator agent */ }
  },
  
  workflowRegistry: {
    'data-pipeline': {
      workflowId: 'workflow-123',  // Reference to existing workflow
      version: '2.0.0',
      timeout: 60000
    },
    'ml-processor': {
      workflowId: 'workflow-456',  // Another workflow
      version: '2.0.0'
    }
  },
  
  iterativeWrapper: {
    layers: [
      {
        name: 'Preparation',
        agentRefs: ['coordinator'],
        strategy: 'sequential'
      },
      {
        name: 'Sub-Processing',
        // Reference workflows as if they were agents
        workflowRefs: ['data-pipeline', 'ml-processor'],
        strategy: 'parallel',
        dataFlow: {
          'data-pipeline': {
            input: '$.preparation.output',
            output: '$.pipeline.result'
          },
          'ml-processor': {
            input: '$.preparation.output',
            output: '$.ml.predictions'
          }
        }
      },
      {
        name: 'Aggregation',
        agentRefs: ['coordinator'],
        strategy: 'sequential',
        context: {
          pipelineResult: '$.pipeline.result',
          mlPredictions: '$.ml.predictions'
        }
      }
    ]
  }
}
```

**Benefits:**
- ✅ Reuse entire workflows as building blocks
- ✅ Compose complex systems from tested components  
- ✅ Version control for sub-workflows
- ✅ Isolate failures to specific components
- ✅ Test workflows independently before composition

## Data Flow Between Components

### Agent → Agent (Same Layer)
```
Agent A output → Layer context → Agent B input
```

### Layer → Layer
```
Layer 1 final context → Layer 2 initial context
```

### Workflow → Workflow (Future)
```
Sub-workflow A output → Master workflow context → Sub-workflow B input
```

## Implementation Roadmap

### ✅ Phase 1: Agent Registry (COMPLETE)
- [x] Multiple agents per workflow
- [x] Per-agent tools
- [x] Per-agent iteration config
- [x] Agent metadata (cost, latency, capabilities)

### ✅ Phase 2: Tool Registry (COMPLETE)  
- [x] Shared tool definitions
- [x] Import from global tools
- [x] Real backend tool implementations
- [x] Tool assignment to specific agents

### ✅ Phase 3: Multi-Layer Iteration (COMPLETE)
- [x] Multiple layers per workflow
- [x] Layer-specific agent references
- [x] Layer strategies (sequential, parallel)
- [x] Layer retry/success logic

### 🔄 Phase 4: Unified Agent Editor (IN PROGRESS)
- [x] Comprehensive agent configuration modal
- [ ] Same UI for create and edit
- [ ] Visual tool selection
- [ ] Iteration config per agent
- [ ] Context configuration

### 📋 Phase 5: Workflow Registry (PLANNED)
- [ ] `workflowRegistry` property on workflows
- [ ] Workflow reference resolution
- [ ] Workflow versioning
- [ ] Nested execution engine
- [ ] Cross-workflow data flow

### 📋 Phase 6: Visual Composition UI (PLANNED)
- [ ] Drag-and-drop workflow builder
- [ ] Visual connections between components
- [ ] Data flow visualization
- [ ] Execution timeline view
- [ ] Real-time monitoring

### 📋 Phase 7: Advanced Features (PLANNED)
- [ ] Dynamic workflow loading
- [ ] Workflow marketplace/sharing
- [ ] A/B testing workflows
- [ ] Workflow optimization suggestions
- [ ] Cost/performance analytics

## Example Use Cases

### 1. Legislative Analysis System
```
Master Workflow: "Comprehensive Bill Analysis"
├── Sub-Workflow: "Bill Scraping" (Alaska, Juneau, BPDA...)
│   ├── Agent: Fetcher
│   ├── Agent: Parser  
│   └── Agent: Validator
├── Sub-Workflow: "NLP Processing"
│   ├── Agent: Summarizer
│   ├── Agent: Classifier
│   └── Agent: Sentiment Analyzer
└── Sub-Workflow: "Report Generation"
    ├── Agent: Report Writer
    └── Agent: PDF Generator
```

### 2. Multi-Source Data Aggregation
```
Master Workflow: "Daily Data Collection"
├── Parallel Sub-Workflows:
│   ├── "Weather Data Scraping"
│   ├── "News API Collection"  
│   ├── "Social Media Monitoring"
│   └── "Stock Price Fetching"
└── Agent: "Data Merger & Formatter"
```

### 3. Iterative Content Generation
```
Master Workflow: "Blog Post Pipeline"
├── Sub-Workflow: "Research Phase"
│   ├── Agent: Search Researcher
│   └── Agent: Source Validator
├── Sub-Workflow: "Writing Phase" (Iterative)
│   ├── Agent: Draft Writer
│   ├── Agent: Editor
│   └── Agent: Fact Checker (loops back)
└── Agent: "Publisher"
```

## Key Design Principles

### 1. **Everything is an Execution Unit**
Both agents and workflows can be treated as executable units with:
- Input context
- Processing logic
- Output result
- Failure handling

### 2. **Isolation & Encapsulation**
Sub-workflows run in isolated contexts:
- Can't accidentally modify parent state
- Clear input/output contracts
- Independent failure domains

### 3. **Versioning & Stability**
Referenced workflows have versions:
- Parent workflow pins to specific version
- Update sub-workflow without breaking parents
- Rollback capability

### 4. **Progressive Enhancement**
Start simple, grow complex:
1. Single agent
2. Multiple agents in one layer
3. Multiple layers with different agents
4. Workflows referencing workflows
5. Dynamic workflow composition

### 5. **Observable & Debuggable**
Every level provides observability:
- Agent-level logs
- Layer-level metrics
- Workflow-level traces
- Cross-workflow execution graphs

## Technical Considerations

### Execution Engine Changes
```typescript
// Current: Execute agent
async executeAgent(agentId, context) {
  const agent = this.agentRegistry[agentId];
  return await agent.run(context);
}

// Future: Execute agent OR workflow
async executeUnit(unitRef, context) {
  if (unitRef.type === 'agent') {
    return await this.executeAgent(unitRef.id, context);
  } else if (unitRef.type === 'workflow') {
    return await this.executeWorkflow(unitRef.id, context);
  }
}
```

### Context Passing
```typescript
interface LayerContext {
  input: any;           // Input to this layer
  agentOutputs: Map<string, any>;  // Agent results
  workflowOutputs: Map<string, any>;  // Workflow results
  shared: any;          // Shared data
  metadata: {
    startTime: number;
    costs: number[];
    errors: Error[];
  };
}
```

### Workflow Loading
```typescript
async loadWorkflow(workflowId: string, version?: string) {
  // Check local cache
  if (this.workflowCache.has(workflowId)) {
    return this.workflowCache.get(workflowId);
  }
  
  // Fetch from backend
  const workflow = await fetch(`/api/workflows/${workflowId}?version=${version}`);
  
  // Recursively load sub-workflows
  if (workflow.workflowRegistry) {
    for (const [id, ref] of Object.entries(workflow.workflowRegistry)) {
      await this.loadWorkflow(ref.workflowId, ref.version);
    }
  }
  
  this.workflowCache.set(workflowId, workflow);
  return workflow;
}
```

## Current Status & Next Steps

### ✅ What Works Today
- Multi-agent workflows
- Tool registry with backend integration
- Multi-layer iteration
- Agent-level retry logic
- Real tool execution (execute_code, fetch_url, test_scraper)

### 🔄 In Progress  
- Unified create/edit agent modal
- Validation tab clarification (scraper-specific)

### 📋 Next Priority
1. **Finish unified agent editor** - Same comprehensive form for create/edit
2. **Design workflowRegistry schema** - How workflows reference workflows
3. **Prototype execution engine** - Can a layer execute a workflow?
4. **Build simple workflow reference UI** - Dropdown to select workflows as layer units
5. **Test nested execution** - Run workflow A that calls workflow B

### 🎯 Long-term Vision
A fully compositional system where you can:
- Build tested, reusable workflow components
- Compose them into larger systems
- Version and update components independently  
- Visualize and monitor execution
- Share/import workflows from community

---

**This architecture enables:**
- 🎯 Maximum code reuse
- 🔧 Easy testing (test small, compose big)
- 📦 Modular development
- 🔄 Iterative refinement at every level
- 💰 Cost optimization (right agent for right job)
- 🚀 Scalability (parallelize sub-workflows)

**The goal:** Build once, reuse everywhere, compose infinitely.
