/**
 * Universal Agent SDK
 * 
 * Browser-native AI agent framework with hardware-aware RAG,
 * multi-model support, and adaptive context management.
 */

export { UniversalAgent } from './UniversalAgent';
export { SystemCapabilityDetector } from './SystemCapabilityDetector';
export { AgentConfigManager } from './AgentConfigManager';
export { RAGMemory } from './RAGMemory';
export { KnowledgeBase } from './KnowledgeBase';

// Types
export type {
  AgentConfig,
  AgentMode,
  IntelligenceConfig,
  ModelPreferences,
  ModelConfig,
  ExecuteOptions,
  AgentResponse,
  SystemCapabilities,
  TokenEstimates
} from './types';

// Constants
export { PRESETS } from './constants';
