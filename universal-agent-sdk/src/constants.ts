/**
 * Preset configurations for common use cases
 */

export const PRESETS = {
  maximum: {
    intelligence: {
      rag: { enabled: true, maxResults: 3, tokenBudget: 800 },
      knowledgeBase: { enabled: true, tokenBudget: 400 },
      contextGuides: { enabled: true, tokenBudget: 1450 },
      htmlSnapshot: { enabled: true, maxSize: 50, tokenBudget: 2500 },
      pageAnalysis: { enabled: true, tokenBudget: 200 },
      promptCompression: { enabled: false },
      attemptHistory: { enabled: true, maxAttempts: 3, tokenBudget: 600 },
      conversationMemory: { enabled: false }
    },
    description: 'Maximum intelligence - 32GB+ GPU recommended',
    totalTokens: 11000
  },
  
  balanced: {
    intelligence: {
      rag: { enabled: true, maxResults: 2, tokenBudget: 600 },
      knowledgeBase: { enabled: true, tokenBudget: 300 },
      contextGuides: { enabled: true, tokenBudget: 1000 },
      htmlSnapshot: { enabled: true, maxSize: 30, tokenBudget: 1500 },
      pageAnalysis: { enabled: true, tokenBudget: 150 },
      promptCompression: { enabled: false },
      attemptHistory: { enabled: true, maxAttempts: 2, tokenBudget: 400 },
      conversationMemory: { enabled: false }
    },
    description: 'Balanced performance - 16GB GPU recommended',
    totalTokens: 6000
  },
  
  gpu: {
    intelligence: {
      rag: { enabled: false },
      knowledgeBase: { enabled: false },
      contextGuides: { enabled: false },
      htmlSnapshot: { enabled: true, maxSize: 10, tokenBudget: 500 },
      pageAnalysis: { enabled: false },
      promptCompression: { enabled: true, targetReduction: 2000 },
      attemptHistory: { enabled: false },
      conversationMemory: { enabled: false }
    },
    description: 'GPU-optimized - 8GB+ GPU or WebGPU',
    totalTokens: 2000
  },
  
  minimal: {
    intelligence: {
      rag: { enabled: false },
      knowledgeBase: { enabled: false },
      contextGuides: { enabled: false },
      htmlSnapshot: { enabled: false },
      pageAnalysis: { enabled: false },
      promptCompression: { enabled: true, targetReduction: 3000 },
      attemptHistory: { enabled: false },
      conversationMemory: { enabled: false }
    },
    description: 'Minimal context - any hardware',
    totalTokens: 800
  }
};

export const DEFAULT_MODEL_CONFIG = {
  ollama: {
    baseURL: 'http://localhost:11434',
    model: 'qwen2.5-coder:14b',
    timeout: 600000 // 10 minutes
  },
  webgpu: {
    modelSize: '4GB',
    quantization: 'q4f16'
  }
};

export const MODE_PROMPTS = {
  scraper: `You are an expert web scraper. Extract structured data from HTML with high accuracy.
Focus on finding the requested information efficiently.`,
  
  chat: `You are a helpful AI assistant. Provide clear, concise, and accurate responses.
Use conversation history to maintain context.`,
  
  analysis: `You are a data analyst. Analyze the provided data and answer questions with insights.
Provide specific numbers and trends when possible.`,
  
  custom: '' // User provides their own prompt
};
