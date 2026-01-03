 # Meta-Framework Planning Document
## Universal Iterative Wrapper + Tool Agent System

**Date:** January 2, 2026  
**Status:** Planning Phase  
**Goal:** Create a programmable, configurable system for building AI agent workflows with iterative validation

---

## Executive Summary

We've built a successful web scraper generator using:
- **2-level iterative wrapper** (Supervisor → Worker pattern)
- **Tool-based agent** (execute_code, fetch_url, search_web, test_scraper)
- **Pattern detection & auto-correction**
- **Human-in-the-loop refinement**

This pattern is **highly reusable** for other domains. We need a meta-framework that makes it easy to:
1. Define new tool agents for different tasks
2. Configure iterative wrappers with custom validation logic
3. Add new tools dynamically
4. Chain multiple agents together
5. Use different LLMs as tools themselves

---

## Current Architecture Analysis

### What We Have Now

```typescript
// Current Pattern (Scraper-Specific)
SUPERVISOR (langchain-server.ts lines 1180-1300)
  ├─ MAX_SUPERVISOR_ATTEMPTS = 3
  ├─ Pattern detection (NO_ITEMS, PARSE_ERROR, etc.)
  ├─ Fix application (use-alternative-selectors, etc.)
  └─ Calls runValidationLoop() for each iteration

WORKER (langchain-server.ts lines 200-520)
  ├─ MAX_ATTEMPTS = 5
  ├─ Heuristic attempt (fast, low accuracy)
  ├─ Ollama attempts 2-5 (slow, high accuracy)
  ├─ Test via execute server
  ├─ Validate results (field coverage)
  └─ Track best attempt

TOOLS (langchain-agent.ts lines 17-250)
  ├─ execute_code: Run JavaScript in VM
  ├─ fetch_url: HTTP GET
  ├─ search_web: DuckDuckGo search
  └─ test_scraper: Execute & validate scraper
```

### Core Components to Abstract

1. **Iterative Wrapper Engine**
   - Configurable layers (supervisor, worker, etc.)
   - Configurable max attempts per layer
   - Pattern detection system
   - Fix application strategies
   - Best result tracking

2. **Tool Registry System**
   - Register new tools dynamically
   - Tool schemas (Zod-based)
   - Tool execution contexts
   - Tool dependencies

3. **Validation System**
   - Custom validation logic per domain
   - Success/failure criteria
   - Partial success handling
   - Diagnostic generation

4. **Agent Configuration**
   - System prompts per domain
   - Tool selection per agent
   - Temperature & model settings
   - Context templates

5. **Progress Reporting**
   - SSE streaming
   - Progress callbacks
   - Error reporting
   - Diagnostics dashboard

---

## Research: Existing Frameworks

### 1. LangGraph (by LangChain)
**What it is:** State machine-based agent orchestration  
**Strengths:**
- Built-in cycles/loops
- State persistence
- Conditional edges (pattern-based routing)
- Checkpointing for recovery

**Weaknesses:**
- Complex API for simple loops
- No built-in validation wrappers
- Manual pattern detection

**Relevance:** ⭐⭐⭐⭐ (90% - very close to what we need)

**Key Features We Can Use:**
```python
from langgraph.graph import StateGraph

# Define state
class AgentState(TypedDict):
    attempts: int
    best_result: Any
    errors: List[str]

# Build graph
workflow = StateGraph(AgentState)
workflow.add_node("worker", worker_node)
workflow.add_node("supervisor", supervisor_node)
workflow.add_conditional_edges(
    "worker",
    should_continue,  # Our pattern detection
    {
        "continue": "worker",
        "escalate": "supervisor",
        "success": END
    }
)
```

### 2. CrewAI
**What it is:** Multi-agent orchestration with roles  
**Strengths:**
- Easy agent definition
- Built-in task delegation
- Role-based agents

**Weaknesses:**
- No built-in validation loops
- Limited tool system
- Opinionated workflow

**Relevance:** ⭐⭐ (40% - different paradigm)

### 3. AutoGen (Microsoft)
**What it is:** Multi-agent conversation framework  
**Strengths:**
- Agent-to-agent communication
- Code execution built-in
- Human-in-the-loop

**Weaknesses:**
- Conversation-focused (not task-focused)
- No validation wrappers
- Complex setup

**Relevance:** ⭐⭐⭐ (60% - similar goals, different approach)

### 4. LangChain Tools
**What it is:** Tool abstraction layer (what we're using)  
**Strengths:**
- Excellent tool system
- Zod schema validation
- Easy to extend

**Weaknesses:**
- No built-in iteration logic
- No validation system
- We have to build wrappers ourselves

**Relevance:** ⭐⭐⭐⭐⭐ (100% - already using it)

### 5. Semantic Kernel (Microsoft)
**What it is:** SDK for integrating LLMs into apps  
**Strengths:**
- Plugin system (similar to tools)
- Planner for multi-step tasks
- Enterprise-focused

**Weaknesses:**
- .NET/Python only (no Node.js)
- No built-in validation
- Heavyweight

**Relevance:** ⭐⭐ (40% - wrong stack)

---

## Conclusion from Research

**No existing framework does exactly what we need.**

Closest is **LangGraph**, but it's:
1. Python-focused (we're TypeScript)
2. Requires manual pattern detection
3. No built-in validation system
4. More complex than needed

**Our approach is unique and valuable:**
- Supervisor/Worker pattern with auto-correction
- Pattern detection → Fix application
- Best result tracking across attempts
- Human refinement integration
- 100% local, TypeScript-based

**Decision: Build our own meta-framework** on top of LangChain tools.

---

## Proposed Meta-Framework Architecture

### Name: `IterativeAgentFramework` (IAF)

### Core Principles

1. **Declarative Configuration** - Define workflows in JSON/YAML
2. **Pluggable Tools** - Add tools like npm packages
3. **Composable Layers** - Stack supervisor/worker/validator layers
4. **Pattern-Driven** - Auto-detect patterns, apply fixes
5. **Observable** - Full tracing, metrics, diagnostics

### File Structure

```
scraper-backend/src/
├── iaf/                          # Meta-framework core
│   ├── core/
│   │   ├── IterativeWrapper.ts   # Main wrapper engine
│   │   ├── LayerExecutor.ts      # Execute a single layer
│   │   ├── PatternDetector.ts    # Detect error patterns
│   │   ├── FixApplicator.ts      # Apply fixes based on patterns
│   │   └── ResultTracker.ts      # Track best results
│   │
│   ├── tools/
│   │   ├── ToolRegistry.ts       # Dynamic tool registration
│   │   ├── ToolExecutor.ts       # Execute tools safely
│   │   ├── ToolComposer.ts       # Compose tools into chains
│   │   └── builtin/              # Built-in tools
│   │       ├── execute-code.ts
│   │       ├── fetch-url.ts
│   │       ├── search-web.ts
│   │       └── llm-query.ts
│   │
│   ├── validators/
│   │   ├── ValidatorRegistry.ts  # Custom validators per domain
│   │   ├── FieldValidator.ts     # Field coverage validation
│   │   ├── SchemaValidator.ts    # JSON schema validation
│   │   └── CustomValidator.ts    # User-defined logic
│   │
│   ├── agents/
│   │   ├── AgentFactory.ts       # Create agents from config
│   │   ├── AgentExecutor.ts      # Execute agent tasks
│   │   └── AgentChain.ts         # Chain multiple agents
│   │
│   ├── config/
│   │   ├── WorkflowConfig.ts     # Workflow definitions
│   │   ├── AgentConfig.ts        # Agent definitions
│   │   └── ToolConfig.ts         # Tool configurations
│   │
│   └── utils/
│       ├── ProgressReporter.ts   # SSE & callbacks
│       ├── DiagnosticsBuilder.ts # Build diagnostics
│       └── Logger.ts             # Structured logging
│
├── workflows/                     # Specific workflow implementations
│   ├── scraper/
│   │   ├── scraper-workflow.yaml # Our scraper as config
│   │   ├── scraper-tools.ts      # Scraper-specific tools
│   │   └── scraper-validator.ts  # Field coverage validator
│   │
│   ├── data-processor/           # Example: Data processing workflow
│   │   ├── processor-workflow.yaml
│   │   └── processor-tools.ts
│   │
│   └── report-generator/         # Example: Report generation
│       ├── report-workflow.yaml
│       └── report-tools.ts
│
└── langchain-server.ts           # Now just loads IAF workflows
```

---

## Configuration Format

### Example: Scraper Workflow Definition

```yaml
# workflows/scraper/scraper-workflow.yaml
name: Web Scraper Generator
version: 1.0.0
description: Generate and validate web scrapers

# Iterative wrapper configuration
iterative_wrapper:
  layers:
    # Layer 1: Supervisor
    - name: supervisor
      max_attempts: 3
      strategy: pattern_detection
      patterns:
        - pattern: NO_ITEMS
          fix: use_alternative_selectors
          escalate: true
        
        - pattern: PARSE_ERROR
          fix: use_different_parser
          escalate: true
        
        - pattern: PARTIAL_SUCCESS
          fix: refine_missing_fields
          escalate: false
      
      on_success: return_best
      on_failure: return_best  # Always return best attempt
    
    # Layer 2: Worker
    - name: worker
      max_attempts: 5
      strategy: progressive_refinement
      attempts:
        - method: heuristic
          description: "Fast guess based on field names"
        
        - method: llm_analysis
          model: llama3-groq-tool-use
          description: "Deep HTML analysis with Ollama"
          repeat: 4  # Attempts 2-5
      
      on_success: escalate  # Return to supervisor
      on_failure: try_next  # Try next attempt

# Agent configuration
agent:
  name: ScraperBuilderAgent
  model: llama3-groq-tool-use
  temperature: 0.3
  
  system_prompt: |
    You are an expert web scraper generator.
    Build complete, working scrapers using the tools provided.
    Always test scrapers before returning.
  
  tools:
    - execute_code
    - fetch_url
    - test_scraper
    - find_selectors  # Custom tool
  
  context: scraper  # Reference to agent-contexts.ts

# Validation configuration
validation:
  name: ScraperValidator
  type: custom
  
  success_criteria:
    - itemCount > 0
    - missingFields.length === 0
  
  partial_success_criteria:
    - itemCount > 0
    - fieldCoverage >= 50%
  
  failure_criteria:
    - itemCount === 0
  
  diagnostics:
    - totalAttempts
    - bestAttemptNumber
    - itemsExtracted
    - fieldsWorking
    - fieldsTotal
    - missingFieldsList
    - errorTypes
    - suggestions

# Tools specific to this workflow
tools:
  - name: find_selectors
    type: llm_query
    description: "Use Ollama to find CSS selectors"
    schema:
      html: string
      field: string
      notes: string
    
    implementation:
      endpoint: http://localhost:11434/api/generate
      prompt_template: |
        Find CSS selector for field "{field}" in this HTML:
        {html}
        
        User notes: {notes}
        
        Return JSON: {"selector": "..."}

  - name: test_scraper
    type: execute_server
    description: "Execute scraper and validate results"
    schema:
      code: string
      url: string
      fieldsRequired: array
    
    implementation:
      endpoint: http://localhost:3002/run
      validation: field_coverage

# Human-in-the-loop configuration
human_feedback:
  enabled: true
  trigger: validation_failed
  
  interface:
    type: modal
    fields:
      - field_selection
      - issue_type
      - notes
      - correct_selector
  
  refinement:
    endpoint: /manual-agent-refine
    use_feedback_for: missing_fields

# Storage configuration
storage:
  type: file
  location: ./saved-scrapers
  format: json
  
  crud:
    - save
    - list
    - get
    - delete
```

---

## TypeScript API Design

### 1. Create Workflow from Config

```typescript
import { IterativeAgentFramework } from './iaf';

// Load workflow from YAML
const workflow = await IterativeAgentFramework.load(
  './workflows/scraper/scraper-workflow.yaml'
);

// Or define programmatically
const workflow = IterativeAgentFramework.create({
  name: 'Web Scraper Generator',
  layers: [
    {
      name: 'supervisor',
      maxAttempts: 3,
      patterns: [
        { pattern: 'NO_ITEMS', fix: 'use_alternative_selectors' }
      ]
    },
    {
      name: 'worker',
      maxAttempts: 5,
      strategy: 'progressive_refinement'
    }
  ],
  agent: {
    model: 'llama3-groq-tool-use',
    tools: ['execute_code', 'fetch_url', 'test_scraper']
  },
  validation: {
    success: (result) => result.itemCount > 0 && result.missingFields.length === 0
  }
});
```

### 2. Register Custom Tools

```typescript
import { ToolRegistry } from './iaf/tools/ToolRegistry';

// Register a new tool
ToolRegistry.register({
  name: 'analyze_sentiment',
  description: 'Analyze sentiment of text using local model',
  schema: z.object({
    text: z.string()
  }),
  execute: async ({ text }) => {
    // Call sentiment analysis API
    const result = await analyzeSentiment(text);
    return result;
  }
});

// Use other LLMs as tools
ToolRegistry.register({
  name: 'gemini_query',
  description: 'Query Gemini model for specific tasks',
  schema: z.object({
    prompt: z.string()
  }),
  execute: async ({ prompt }) => {
    // Could call Gemini API (if API key available)
    // Or another Ollama model
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      body: JSON.stringify({
        model: 'gemini-pro',  // If running locally
        prompt: prompt
      })
    });
    return await response.json();
  }
});
```

### 3. Define Custom Validators

```typescript
import { ValidatorRegistry } from './iaf/validators/ValidatorRegistry';

// Register field coverage validator
ValidatorRegistry.register({
  name: 'field_coverage',
  validate: (result, config) => {
    const { items, fieldsRequired } = result;
    
    if (!items || items.length === 0) {
      return {
        validated: false,
        error: 'No items extracted',
        itemCount: 0
      };
    }
    
    const firstItem = items[0];
    const missingFields = fieldsRequired.filter(field => !firstItem[field]);
    const fieldCoverage = ((fieldsRequired.length - missingFields.length) / fieldsRequired.length * 100).toFixed(0);
    
    return {
      validated: missingFields.length === 0,
      itemCount: items.length,
      fieldCoverage: `${fieldCoverage}%`,
      missingFields,
      sampleItems: items.slice(0, 5)
    };
  }
});

// Register schema validator
ValidatorRegistry.register({
  name: 'json_schema',
  validate: (result, schema) => {
    const valid = validateJsonSchema(result, schema);
    return {
      validated: valid,
      errors: valid ? [] : getSchemaErrors(result, schema)
    };
  }
});
```

### 4. Execute Workflow

```typescript
// Execute workflow with task
const result = await workflow.execute({
  task: 'Build scraper for https://example.com',
  config: {
    fieldsRequired: ['title', 'date', 'url'],
    startUrl: 'https://example.com'
  },
  onProgress: (progress) => {
    // SSE streaming or callback
    console.log(progress);
  }
});

// Result structure
console.log(result);
// {
//   success: true,
//   output: '... generated code ...',
//   validated: true,
//   attempts: 7,  // 2 supervisor + 5 worker
//   itemCount: 15,
//   fieldCoverage: '100%',
//   diagnostics: { ... }
// }
```

### 5. Chain Multiple Agents

```typescript
import { AgentChain } from './iaf/agents/AgentChain';

// Chain scraper → processor → reporter
const pipeline = AgentChain.create([
  {
    workflow: scraperWorkflow,
    input: { url: 'https://example.com' }
  },
  {
    workflow: processorWorkflow,
    input: (prevResult) => ({ data: prevResult.output })
  },
  {
    workflow: reporterWorkflow,
    input: (prevResult) => ({ processed: prevResult.output })
  }
]);

const finalResult = await pipeline.execute();
```

---

## Key Abstractions

### 1. IterativeWrapper

```typescript
interface LayerConfig {
  name: string;
  maxAttempts: number;
  strategy: 'pattern_detection' | 'progressive_refinement' | 'random_sampling';
  patterns?: PatternConfig[];
  onSuccess: 'return_best' | 'escalate' | 'continue';
  onFailure: 'return_best' | 'escalate' | 'fail';
}

interface PatternConfig {
  pattern: string;
  fix: string;
  escalate?: boolean;
}

class IterativeWrapper {
  constructor(config: LayerConfig[]) {}
  
  async execute(task: string, context: any): Promise<Result> {
    // Execute layers in order
    // Apply pattern detection & fixes
    // Track best result
    // Return when success or max attempts
  }
}
```

### 2. ToolRegistry

```typescript
interface ToolDefinition {
  name: string;
  description: string;
  schema: z.ZodObject<any>;
  execute: (params: any) => Promise<any>;
  dependencies?: string[];  // Other tools needed
}

class ToolRegistry {
  static register(tool: ToolDefinition): void {}
  static get(name: string): ToolDefinition {}
  static list(): ToolDefinition[] {}
  
  static createLangChainTool(name: string): Tool {
    // Convert ToolDefinition → LangChain Tool
  }
}
```

### 3. ValidatorRegistry

```typescript
interface ValidatorDefinition {
  name: string;
  validate: (result: any, config: any) => ValidationResult;
}

interface ValidationResult {
  validated: boolean;
  error?: string;
  itemCount?: number;
  fieldCoverage?: string;
  missingFields?: string[];
  diagnostics?: any;
}

class ValidatorRegistry {
  static register(validator: ValidatorDefinition): void {}
  static validate(name: string, result: any, config: any): ValidationResult {}
}
```

### 4. AgentFactory

```typescript
interface AgentConfig {
  name: string;
  model: string;
  temperature: number;
  systemPrompt: string;
  tools: string[];
  context?: string;
}

class AgentFactory {
  static create(config: AgentConfig): ReactAgent {
    // Get tools from registry
    const tools = config.tools.map(name => ToolRegistry.createLangChainTool(name));
    
    // Create LLM
    const llm = new ChatOllama({ model: config.model, temperature: config.temperature });
    
    // Create agent
    return createReactAgent({ llm, tools, systemPrompt: config.systemPrompt });
  }
}
```

---

## Example Use Cases

### 1. Data Pipeline Builder

```yaml
name: Data ETL Pipeline
layers:
  - name: extractor
    max_attempts: 3
    tools: [fetch_api, parse_json, validate_schema]
  
  - name: transformer
    max_attempts: 2
    tools: [clean_data, normalize_fields, enrich_data]
  
  - name: loader
    max_attempts: 1
    tools: [save_to_db, send_webhook]

validation:
  success: data_loaded && webhook_sent
```

### 2. Research Assistant

```yaml
name: Research Paper Analyzer
layers:
  - name: search
    max_attempts: 2
    tools: [search_arxiv, fetch_pdf, extract_text]
  
  - name: analysis
    max_attempts: 3
    tools: [summarize_abstract, extract_citations, analyze_methodology]
  
  - name: synthesis
    max_attempts: 1
    tools: [generate_summary, create_bibliography]

validation:
  success: summary_complete && citations_extracted
```

### 3. Multi-Model Orchestrator

```yaml
name: Multi-Model Query System
agent:
  model: llama3-groq-tool-use  # Orchestrator

tools:
  - name: query_gpt4
    type: llm_query
    model: gpt-4  # If API available
  
  - name: query_claude
    type: llm_query
    model: claude-3  # If API available
  
  - name: query_local_model
    type: llm_query
    model: mistral-nemo  # Local Ollama

layers:
  - name: orchestrator
    tools: [query_gpt4, query_claude, query_local_model, compare_responses]
    strategy: best_of_three
```

---

## Implementation Phases

### Phase 1: Core Framework (Week 1-2)
- [ ] IterativeWrapper engine
- [ ] LayerExecutor
- [ ] PatternDetector
- [ ] ResultTracker
- [ ] Basic ToolRegistry

### Phase 2: Tool System (Week 2-3)
- [ ] ToolRegistry with dynamic registration
- [ ] Built-in tools (execute_code, fetch_url, etc.)
- [ ] LLM-as-tool support
- [ ] Tool composition

### Phase 3: Validation System (Week 3-4)
- [ ] ValidatorRegistry
- [ ] Common validators (field_coverage, schema, etc.)
- [ ] Custom validator support
- [ ] Diagnostics builder

### Phase 4: Configuration System (Week 4-5)
- [ ] YAML/JSON config parser
- [ ] Workflow loader
- [ ] AgentFactory
- [ ] Config validation

### Phase 5: Migration (Week 5-6)
- [ ] Convert scraper workflow to config
- [ ] Test backward compatibility
- [ ] Update langchain-server.ts
- [ ] Documentation

### Phase 6: New Workflows (Week 6-8)
- [ ] Create data processor workflow
- [ ] Create report generator workflow
- [ ] Create multi-model orchestrator
- [ ] Community examples

---

## Benefits of Meta-Framework

### 1. Rapid Development
```typescript
// Before (1000+ lines of custom code)
// langchain-server.ts with hardcoded logic

// After (50 lines of config)
const workflow = IterativeAgentFramework.load('scraper-workflow.yaml');
app.post('/scraper', (req, res) => workflow.execute(req.body, res));
```

### 2. Reusability
```typescript
// Create new workflow in minutes
const dataProcessor = IterativeAgentFramework.create({
  layers: [...],
  agent: {...},
  validation: {...}
});
```

### 3. Composability
```typescript
// Chain workflows
const pipeline = AgentChain.create([
  scraperWorkflow,
  processorWorkflow,
  reporterWorkflow
]);
```

### 4. Extensibility
```typescript
// Add custom tools
ToolRegistry.register(myCustomTool);

// Add custom validators
ValidatorRegistry.register(myCustomValidator);

// Add new patterns
PatternDetector.register('MY_PATTERN', myPatternDetector);
```

### 5. Observability
```typescript
// Built-in tracing
workflow.on('layer:start', (layer) => console.log(`Starting ${layer}`));
workflow.on('attempt:fail', (error) => logError(error));
workflow.on('pattern:detected', (pattern) => alertOps(pattern));
```

---

## Technical Decisions

### 1. Configuration Format
**Decision:** YAML for workflows, TypeScript for tools  
**Rationale:**
- YAML is human-readable
- TypeScript for type safety in tool implementations
- Best of both worlds

### 2. Tool System
**Decision:** Extend LangChain tools, not replace  
**Rationale:**
- LangChain tools are excellent
- Adds dynamic registration layer
- Maintains compatibility

### 3. Validation System
**Decision:** Custom validators, not JSON Schema only  
**Rationale:**
- Flexibility for complex logic (field coverage)
- JSON Schema for simple cases
- Both supported

### 4. State Management
**Decision:** In-memory state, optional persistence  
**Rationale:**
- Simple for local use
- Optional Redis/DB for production
- Stateless by default

### 5. Model Support
**Decision:** Ollama primary, others as tools  
**Rationale:**
- 100% local philosophy
- Other models (GPT, Claude) as optional tools
- Future: Multi-model orchestration

---

## Risk Assessment

### Technical Risks

1. **Over-abstraction**
   - Risk: Framework too complex, harder than custom code
   - Mitigation: Start simple, add features incrementally
   - Escape hatch: Can always drop down to custom code

2. **Performance Overhead**
   - Risk: Extra layers slow down execution
   - Mitigation: Optimize hot paths, lazy loading
   - Benchmark: Should be <5% slower than custom

3. **Configuration Complexity**
   - Risk: YAML becomes unreadable for complex workflows
   - Mitigation: TypeScript API as alternative
   - Validation: Schema validation with helpful errors

### Adoption Risks

1. **Learning Curve**
   - Risk: Users prefer simple custom code
   - Mitigation: Excellent docs, examples, templates
   - Quick wins: 5-minute tutorial

2. **Migration Effort**
   - Risk: Existing scraper code hard to migrate
   - Mitigation: Backward compatibility layer
   - Gradual: Can migrate piece by piece

---

## Success Metrics

### Development Metrics
- [ ] Time to create new workflow: < 30 minutes
- [ ] Lines of code reduction: > 80%
- [ ] Test coverage: > 90%

### Performance Metrics
- [ ] Overhead vs custom: < 5%
- [ ] Startup time: < 1 second
- [ ] Memory usage: < +50MB

### Usability Metrics
- [ ] Tutorial completion time: < 15 minutes
- [ ] Community workflows: > 10 in first month
- [ ] GitHub stars: > 100 in first quarter

---

## Open Questions

1. **Should we support Python agents?**
   - Pro: Wider ecosystem
   - Con: Adds complexity, maintenance
   - Decision: Start TypeScript-only, consider later

2. **Should patterns be user-definable?**
   - Pro: Maximum flexibility
   - Con: Complex API
   - Decision: Predefined patterns first, custom later

3. **Should we build a GUI workflow builder?**
   - Pro: Non-coders can build workflows
   - Con: Significant effort
   - Decision: Future enhancement after V1

4. **Should we support distributed execution?**
   - Pro: Scale across machines
   - Con: Complex coordination
   - Decision: Future enhancement, local first

5. **Should we integrate with LangSmith/other tracers?**
   - Pro: Professional observability
   - Con: Breaks 100% local philosophy
   - Decision: Optional integration, keep local tracer

---

## Next Steps

### Immediate (This Week)
1. Review this planning doc with team
2. Validate architecture decisions
3. Choose implementation approach:
   - Option A: Build IAF from scratch
   - Option B: Extend LangGraph for TypeScript
   - Option C: Hybrid (IAF for iteration, LangGraph for state)

### Short-term (Next 2 Weeks)
1. Build prototype with scraper workflow
2. Create 2-3 example workflows
3. Write core abstractions
4. Test performance vs current system

### Medium-term (Next Month)
1. Complete Phase 1-3 (core, tools, validation)
2. Migrate scraper to IAF
3. Write documentation
4. Open source release

### Long-term (Next Quarter)
1. Community workflows
2. GUI builder
3. Multi-model orchestration
4. Enterprise features (distributed, monitoring)

---

## Conclusion

We've built something valuable that deserves to be abstracted into a reusable framework. The iterative wrapper pattern with tool agents is powerful and applicable to many domains beyond scraping.

**Recommendation: Build the Meta-Framework**

It will:
- ✅ Make future workflows 10x faster to build
- ✅ Enable non-experts to create complex agents
- ✅ Maintain our 100% local philosophy
- ✅ Create a unique open-source offering
- ✅ Position us as thought leaders in local AI orchestration

**The pattern we've discovered is worth sharing with the world.**

---

## Appendix A: Comparison with Existing Tools

| Feature | Our IAF | LangGraph | CrewAI | AutoGen | LangChain |
|---------|---------|-----------|---------|---------|-----------|
| Iterative Wrappers | ✅ Built-in | 🟡 Manual | ❌ No | ❌ No | ❌ No |
| Pattern Detection | ✅ Yes | ❌ No | ❌ No | ❌ No | ❌ No |
| Auto-Correction | ✅ Yes | ❌ No | ❌ No | ❌ No | ❌ No |
| Tool System | ✅ Dynamic | ✅ Good | 🟡 Limited | ✅ Good | ✅ Excellent |
| Config-Based | ✅ YAML/JSON | 🟡 Code | 🟡 Code | 🟡 Code | ❌ Code |
| TypeScript | ✅ Native | ❌ Python | ❌ Python | ❌ Python | ✅ Yes |
| 100% Local | ✅ Yes | ✅ Yes | 🟡 Mixed | 🟡 Mixed | 🟡 Mixed |
| Human-in-Loop | ✅ Built-in | 🟡 Manual | ❌ No | ✅ Yes | ❌ No |
| Best Result Tracking | ✅ Yes | ❌ No | ❌ No | ❌ No | ❌ No |

**Legend:**
- ✅ Excellent/Native Support
- 🟡 Partial/Manual/Requires Work
- ❌ Not Supported/Not Applicable

---

## Appendix B: Sample Workflows

### Workflow 1: Code Generator & Tester

```yaml
name: Code Generator with Auto-Testing
layers:
  - name: generator
    max_attempts: 3
    tools: [write_code, analyze_requirements]
  
  - name: tester
    max_attempts: 5
    tools: [run_tests, debug_failures, fix_code]
  
  - name: validator
    max_attempts: 1
    tools: [run_linter, check_coverage]

validation:
  success: all_tests_pass && coverage > 80%
```

### Workflow 2: Content Aggregator

```yaml
name: Multi-Source Content Aggregator
layers:
  - name: fetcher
    max_attempts: 2
    tools: [fetch_rss, scrape_website, query_api]
  
  - name: processor
    max_attempts: 1
    tools: [deduplicate, extract_entities, summarize]
  
  - name: enricher
    max_attempts: 1
    tools: [fetch_metadata, add_images, tag_content]

validation:
  success: itemCount > 5 && all_enriched
```

### Workflow 3: Local AI Assistant

```yaml
name: Multi-Model AI Assistant
agent:
  model: llama3-groq-tool-use  # Orchestrator

tools:
  - name: query_code_model
    type: llm_query
    model: deepseek-coder
  
  - name: query_chat_model
    type: llm_query
    model: mistral-nemo
  
  - name: query_vision_model
    type: llm_query
    model: llava
  
  - name: execute_code
    type: code_execution
  
  - name: search_docs
    type: rag_search

layers:
  - name: router
    tools: [analyze_intent, select_model]
  
  - name: executor
    tools: [query_code_model, query_chat_model, query_vision_model]
  
  - name: synthesizer
    tools: [combine_responses, format_output]

validation:
  success: response_generated && user_satisfied
```

---

**END OF PLANNING DOCUMENT**

*This document will evolve as we build and learn. Feedback welcome!*
