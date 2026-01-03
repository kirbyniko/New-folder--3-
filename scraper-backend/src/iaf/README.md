# Iterative Agent Framework (IAF)

A powerful, flexible framework for building iterative AI agent workflows with automatic pattern detection, validation, and self-correction capabilities.

## Features

- ✅ **Iterative Wrappers**: Multi-layer execution with configurable retry strategies
- ✅ **Pattern Detection**: Automatic detection of error patterns (NO_ITEMS, PARSE_ERROR, etc.)
- ✅ **Auto-Correction**: Apply fixes based on detected patterns
- ✅ **Best Result Tracking**: Always return the best attempt even on failure
- ✅ **Dynamic Tool Registry**: Register custom tools at runtime
- ✅ **Custom Validators**: Domain-specific validation logic
- ✅ **Config-Driven**: Define workflows in YAML or JSON
- ✅ **TypeScript Native**: Full type safety and IDE support
- ✅ **100% Local**: No external API dependencies required

## Installation

```bash
npm install @your-org/iaf
```

## Quick Start

### 1. Initialize IAF

```typescript
import { IterativeAgentFramework } from './iaf';

// Initialize with built-in tools and validators
IterativeAgentFramework.initialize({
  executeEndpoint: 'http://localhost:3002/run'
});
```

### 2. Load a Workflow

```typescript
// From YAML file
const workflow = await IterativeAgentFramework.load('./workflows/scraper/scraper-workflow.yaml');

// Or create programmatically
const workflow = IterativeAgentFramework.create({
  name: 'My Workflow',
  iterativeWrapper: {
    layers: [
      {
        name: 'worker',
        maxAttempts: 5,
        strategy: 'progressive_refinement',
        onSuccess: 'return_best',
        onFailure: 'return_best'
      }
    ]
  },
  agent: {
    name: 'MyAgent',
    model: 'llama3-groq-tool-use',
    temperature: 0.3,
    systemPrompt: 'You are a helpful assistant',
    tools: ['execute_code', 'fetch_url']
  },
  validation: {
    name: 'field_coverage',
    type: 'custom'
  }
});
```

### 3. Register Custom Tools

```typescript
import { ToolRegistry } from './iaf';
import { z } from 'zod';

ToolRegistry.register({
  name: 'my_custom_tool',
  description: 'Does something useful',
  schema: z.object({
    input: z.string()
  }),
  execute: async ({ input }) => {
    // Your tool logic here
    return { result: 'success' };
  }
});
```

### 4. Register Custom Validators

```typescript
import { ValidatorRegistry } from './iaf';

ValidatorRegistry.register({
  name: 'my_validator',
  description: 'Validates my specific requirements',
  validate: (result, config) => {
    // Your validation logic
    return {
      validated: true,
      itemCount: result.items.length
    };
  }
});
```

## Architecture

```
iaf/
├── core/
│   ├── IterativeWrapper.ts      # Main execution engine
│   ├── LayerExecutor.ts         # Single layer execution
│   ├── PatternDetector.ts       # Pattern detection
│   ├── ResultTracker.ts         # Best result tracking
│   └── types.ts                 # Core TypeScript types
├── tools/
│   ├── ToolRegistry.ts          # Dynamic tool registration
│   └── builtin/                 # Built-in tools
│       └── index.ts
├── validators/
│   ├── ValidatorRegistry.ts     # Validator management
│   └── builtin.ts               # Built-in validators
└── index.ts                     # Main entry point
```

## Built-in Tools

### execute_code
Execute JavaScript code in a secure VM.

```typescript
{
  code: string;
  timeout?: number;
}
```

### fetch_url
Fetch HTML content from a URL.

```typescript
{
  url: string;
  headers?: Record<string, string>;
}
```

### test_scraper
Execute and validate a web scraper.

```typescript
{
  code: string;
  url: string;
  fieldsRequired: string[];
}
```

## Built-in Validators

### field_coverage
Validates that all required fields are present in extracted items.

### json_schema
Validates result against a JSON schema.

### item_count
Validates minimum number of items extracted.

## Pattern Detection

IAF automatically detects common error patterns:

- **NO_ITEMS**: No data extracted
- **PARSE_ERROR**: Parsing failed
- **PARTIAL_SUCCESS**: Some fields missing
- **TIMEOUT**: Operation timed out
- **NETWORK_ERROR**: Network connectivity issue
- **INVALID_SELECTOR**: Selector not working

When a pattern is detected, IAF can automatically apply fixes or escalate to the next layer.

## Configuration Format

### YAML Example

```yaml
name: Web Scraper Generator
version: 1.0.0
description: Generate and validate web scrapers

iterativeWrapper:
  layers:
    - name: supervisor
      maxAttempts: 3
      strategy: pattern_detection
      patterns:
        - pattern: NO_ITEMS
          fix: use_alternative_selectors
          escalate: true
      onSuccess: return_best
      onFailure: return_best
    
    - name: worker
      maxAttempts: 5
      strategy: progressive_refinement
      onSuccess: escalate
      onFailure: try_next

agent:
  name: ScraperBuilderAgent
  model: llama3-groq-tool-use
  temperature: 0.3
  systemPrompt: |
    You are an expert web scraper generator.
  tools:
    - execute_code
    - fetch_url
    - test_scraper

validation:
  name: field_coverage
  type: custom
  successCriteria:
    - itemCount > 0
    - missingFields.length === 0
```

## API Reference

### IterativeAgentFramework

Main class for working with workflows.

#### Methods

- `static load(filePath: string): Promise<IterativeAgentFramework>`
- `static create(config: WorkflowConfig): IterativeAgentFramework`
- `static initialize(options?: { executeEndpoint?: string }): void`
- `getConfig(): WorkflowConfig`
- `validateTools(): { valid: boolean; missing: string[] }`
- `validateValidator(): { valid: boolean; error?: string }`

### ToolRegistry

Manages tool registration and execution.

#### Methods

- `static register(tool: ToolDefinition): void`
- `static get(name: string): ToolDefinition | undefined`
- `static list(): ToolDefinition[]`
- `static execute(name: string, params: any): Promise<any>`
- `static createLangChainTool(name: string): Tool`

### ValidatorRegistry

Manages validator registration and execution.

#### Methods

- `static register(validator: ValidatorDefinition): void`
- `static get(name: string): ValidatorDefinition | undefined`
- `static list(): ValidatorDefinition[]`
- `static validate(name: string, result: any, config: any): Promise<ValidationResult>`

## License

MIT
