/**
 * Type definitions for Universal Agent SDK
 */

export type AgentMode = 'scraper' | 'chat' | 'analysis' | 'custom';

export interface AgentConfig {
  // Basic settings
  name?: string;
  mode: AgentMode;
  systemPrompt?: string;
  
  // Intelligence configuration
  intelligence?: IntelligenceConfig;
  preset?: 'maximum' | 'balanced' | 'gpu' | 'minimal';
  
  // Model preferences
  modelPreferences?: ModelPreferences;
  modelConfig?: ModelConfig;
  
  // Hardware overrides
  hardware?: {
    gpuVRAM?: number;
    maxTokens?: number;
  };
  
  // Tools & capabilities
  tools?: AgentTool[];
  
  // Callbacks
  onProgress?: (progress: ProgressEvent) => void;
  onError?: (error: Error, attempt: number) => void;
  onComplete?: (result: AgentResponse) => void;
  onToken?: (token: string) => void;
  
  // Advanced options
  streaming?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  monitoring?: {
    enabled: boolean;
    onMetrics?: (metrics: Metrics) => void;
  };
}

export interface IntelligenceConfig {
  rag?: boolean | {
    enabled: boolean;
    maxResults?: number;
    tokenBudget?: number;
  };
  knowledgeBase?: boolean | {
    enabled: boolean;
    tokenBudget?: number;
  };
  contextGuides?: boolean | {
    enabled: boolean;
    guides?: string[];
    tokenBudget?: number;
  };
  htmlSnapshot?: boolean | {
    enabled: boolean;
    maxSize?: number;
    tokenBudget?: number;
  };
  pageAnalysis?: boolean | {
    enabled: boolean;
    tokenBudget?: number;
  };
  promptCompression?: boolean | {
    enabled: boolean;
    targetReduction?: number;
  };
  attemptHistory?: boolean | {
    enabled: boolean;
    maxAttempts?: number;
    tokenBudget?: number;
  };
  conversationMemory?: boolean | {
    enabled: boolean;
    tokenBudget?: number;
  };
}

export interface ModelPreferences {
  primary: 'ollama' | 'webgpu' | 'openai' | 'anthropic';
  fallback?: 'ollama' | 'webgpu' | 'openai';
  cloudFallback?: 'openai' | 'anthropic';
}

export interface ModelConfig {
  ollama?: {
    baseURL?: string;
    model?: string;
    timeout?: number;
  };
  webgpu?: {
    modelSize?: string;
    quantization?: string;
  };
  openai?: {
    apiKey?: string;
    model?: string;
    maxTokens?: number;
  };
  anthropic?: {
    apiKey?: string;
    model?: string;
    maxTokens?: number;
  };
}

export interface AgentTool {
  name: string;
  description: string;
  parameters?: Record<string, string>;
  fn: (...args: any[]) => Promise<any>;
}

export interface ExecuteOptions {
  task: string;
  context?: Record<string, any>;
  userId?: string;
}

export interface AgentResponse {
  response: string;
  confidence: number;
  model: string;
  tokensUsed: number;
  latency: number;
  metadata?: Record<string, any>;
}

export interface SystemCapabilities {
  ollama: {
    available: boolean;
    models?: any[];
    contextLimits?: Record<string, number>;
    detectedAt?: string;
  };
  gpu: {
    detected: boolean;
    vendor?: string;
    vramMB?: number;
    estimatedVRAM?: number;
    detectedAt?: string;
  };
  webgpu: {
    available: boolean;
    maxBufferSize?: number;
    maxComputeWorkgroupStorageSize?: number;
  };
}

export interface TokenEstimates {
  total: number;
  breakdown: Record<string, number>;
  fitsInGPU: boolean;
  cpuRisk: 'none' | 'low' | 'medium' | 'high';
}

export interface ProgressEvent {
  stage: string;
  progress: number;
  message: string;
}

export interface Metrics {
  latency: number;
  tokensUsed: number;
  model: string;
  timestamp: number;
}
