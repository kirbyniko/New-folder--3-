/**
 * Core types for the Iterative Agent Framework (IAF)
 * Enhanced with hierarchical agent architecture
 */

export interface PatternConfig {
  pattern: string;
  fix: string;
  escalate?: boolean;
}

/**
 * Agent-level iterative wrapper configuration
 */
export interface AgentIterativeWrapper {
  enabled: boolean;
  maxAttempts: number;
  strategy: 'retry' | 'refinement' | 'validation';
  patterns?: PatternConfig[];
}

/**
 * Agent memory/context configuration
 */
export interface AgentContextConfig {
  type: 'shared' | 'isolated' | 'inherited';
  data?: Record<string, any>;
  memory?: any;
}

/**
 * Agent metadata for tracking capabilities and costs
 */
export interface AgentMetadata {
  cost?: number;
  latency?: number;
  capabilities?: string[];
  tags?: string[];
}

/**
 * Enhanced AgentConfig with own tools and iterative wrapper
 */
export interface AgentConfig {
  id: string;
  name: string;
  model: string;
  temperature: number;
  systemPrompt: string;
  
  // Agent owns its tools (not just references)
  tools: ToolConfig[];
  
  // Optional: Agent can have its own iterative wrapper
  iterativeWrapper?: AgentIterativeWrapper;
  
  // Context/memory for this agent
  context?: AgentContextConfig;
  
  // Metadata
  metadata?: AgentMetadata;
}

/**
 * Tool reference (for shared tools from registry)
 */
export interface ToolReference {
  ref: string;  // ID of tool in toolRegistry
}

/**
 * Tool access restrictions
 */
export interface ToolRestrictions {
  maxCallsPerMinute?: number;
  requiresAuth?: boolean;
  allowedAgents?: string[];
}

/**
 * Enhanced ToolConfig with access control
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
    endpoint?: string;
    code?: string;
    config?: Record<string, any>;
  };
  
  // Access control
  restrictions?: ToolRestrictions;
}

/**
 * Enhanced LayerConfig with agent references
 */
export interface LayerConfig {
  name: string;
  description?: string;
  
  // Each layer can have agents defined inline or referenced
  agents?: AgentConfig[];
  agentRefs?: string[];  // IDs of agents from agentRegistry
  
  // Layer-level iteration (wrapper around agent(s))
  maxAttempts: number;
  strategy: 'sequential' | 'parallel' | 'consensus' | 'pattern_detection' | 'progressive_refinement' | 'random_sampling';
  patterns?: PatternConfig[];
  
  // Validation after layer completes
  validation?: ValidationConfig;
  
  // Control flow
  onSuccess: 'continue' | 'return' | 'branch' | 'return_best' | 'escalate';
  onFailure: 'retry' | 'escalate' | 'fail' | 'fallback' | 'return_best';
  
  // Fallback agent if primary fails
  fallbackAgent?: AgentConfig;
}

/**
 * Enhanced WorkflowConfig with agent and tool registries
 */
export interface WorkflowConfig {
  name: string;
  version?: string;
  description?: string;
  
  // Pre-define reusable agents (optional)
  agentRegistry?: {
    [agentId: string]: AgentConfig;
  };
  
  // Pre-define reusable tools (optional)
  toolRegistry?: {
    [toolId: string]: ToolConfig;
  };
  
  // Workflow-level iterative wrapper
  iterativeWrapper: {
    layers: LayerConfig[];
    globalValidation?: ValidationConfig;
  };
  
  // DEPRECATED: Keep for backward compatibility
  agent?: AgentConfig;
  tools?: ToolConfig[];
  validation?: ValidationConfig;
  
  // Optional settings
  humanFeedback?: HumanFeedbackConfig;
  storage?: StorageConfig;
  settings?: WorkflowSettings;
}

/**
 * Workflow-level settings
 */
export interface WorkflowSettings {
  timeout?: number;
  maxCost?: number;
  parallelism?: number;
}

export interface ValidationConfig {
  name: string;
  type: 'custom' | 'schema' | 'field_coverage';
  successCriteria?: string[];
  partialSuccessCriteria?: string[];
  failureCriteria?: string[];
  diagnostics?: string[];
}

export interface HumanFeedbackConfig {
  enabled: boolean;
  trigger: 'validation_failed' | 'manual' | 'always';
  interface: {
    type: 'modal' | 'cli' | 'api';
    fields: string[];
  };
  refinement?: {
    endpoint: string;
    use_feedback_for: string;
  };
}

export interface StorageConfig {
  type: 'file' | 'database' | 'memory';
  location?: string;
  format?: 'json' | 'yaml';
  crud?: string[];
}

export interface ValidationResult {
  validated: boolean;
  error?: string;
  itemCount?: number;
  fieldCoverage?: string;
  missingFields?: string[];
  diagnostics?: any;
  partial?: boolean;
  sampleData?: any[];
  output?: string;
}

export interface LayerResult {
  success: boolean;
  output: any;
  validated: boolean;
  attempts: number;
  bestAttempt?: number;
  diagnostics?: any;
  error?: string;
  pattern?: string;
  fixApplied?: string;
}

export interface ExecutionContext {
  task: string;
  config: any;
  metadata?: Record<string, any>;
  onProgress?: (progress: ProgressUpdate) => void;
}

export interface ProgressUpdate {
  layer?: string;
  attempt?: number;
  status: 'started' | 'progress' | 'completed' | 'failed';
  message: string;
  data?: any;
}

export interface AttemptResult {
  success: boolean;
  output: any;
  validated: boolean;
  error?: string;
  score?: number;
  metadata?: Record<string, any>;
}
