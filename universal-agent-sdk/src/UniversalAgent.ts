/**
 * Universal Agent SDK - Core Agent Implementation
 * 
 * World-class AI agent with:
 * - Hardware-aware optimization
 * - Multi-model orchestration
 * - Built-in RAG & learning
 * - Adaptive context management
 * - Real-time performance monitoring
 */

import { AgentConfig, AgentMode, ExecuteOptions, AgentResponse, ProgressEvent } from './types';
import { SystemCapabilityDetector } from './SystemCapabilityDetector';
import { AgentConfigManager } from './AgentConfigManager';
import { RAGMemory } from './RAGMemory';
import { KnowledgeBase } from './KnowledgeBase';
import { ConversationMemory } from './ConversationMemory';
import { PromptOptimizer } from './PromptOptimizer';
import { ModelOrchestrator } from './ModelOrchestrator';
import { PRESETS, MODE_PROMPTS } from './constants';

export class UniversalAgent {
  private config: AgentConfig;
  private capabilityDetector: SystemCapabilityDetector;
  private configManager: AgentConfigManager;
  private ragMemory: RAGMemory;
  private knowledgeBase: KnowledgeBase;
  private conversationMemory: ConversationMemory;
  private promptOptimizer: PromptOptimizer;
  private modelOrchestrator: ModelOrchestrator;
  private isInitialized: boolean = false;
  private sessionId: string;
  private metrics: any[] = [];

  constructor(config: AgentConfig) {
    this.config = this.validateAndMergeConfig(config);
    this.sessionId = this.generateSessionId();
    
    // Initialize core systems
    this.capabilityDetector = new SystemCapabilityDetector();
    this.configManager = new AgentConfigManager(this.config.intelligence, this.config.preset);
    this.ragMemory = new RAGMemory();
    this.knowledgeBase = new KnowledgeBase();
    this.conversationMemory = new ConversationMemory();
    this.promptOptimizer = new PromptOptimizer();
    this.modelOrchestrator = new ModelOrchestrator(this.config.models?.primary || 'qwen2.5-coder:32b');
    
    // Auto-detect hardware and optimize
    this.initialize();
  }

  private async initialize() {
    try {
      // Detect system capabilities
      const capabilities = await this.capabilityDetector.detectAll();
      this.logInfo('System capabilities detected:', capabilities);
      
      // Auto-adjust configuration based on hardware
      await this.autoOptimizeConfig(capabilities);
      
      // Initialize model orchestrator
      // Model orchestrator initialized
      
      this.isInitialized = true;
      this.logSuccess('Agent initialized successfully');
      
      // Trigger callback if provided
      if (this.config.onComplete) {
        this.config.onComplete({
          response: 'Agent ready',
          confidence: 1.0,
          model: 'initialization',
          tokensUsed: 0,
          latency: 0
        });
      }
    } catch (error) {
      this.logError('Agent initialization failed:', error);
      if (this.config.onError) {
        this.config.onError(error as Error, 0);
      }
      throw error;
    }
  }

  /**
   * Execute a one-time task
   */
  async execute(options: ExecuteOptions): Promise<AgentResponse> {
    await this.ensureInitialized();
    
    const startTime = Date.now();
    let attempt = 0;
    const maxRetries = this.config.maxRetries || 3;
    
    while (attempt < maxRetries) {
      try {
        attempt++;
        this.emitProgress({
          stage: 'preparing',
          progress: 0,
          message: `Attempt ${attempt}/${maxRetries}: Preparing context...`
        });
        
        // Build context with intelligence systems
        const context = await this.buildContext(options);
        
        this.emitProgress({
          stage: 'executing',
          progress: 50,
          message: 'Executing with AI model...'
        });
        
        // Execute with model orchestrator
        const response = await this.modelOrchestrator.execute(context);
        
        // Learn from success
        await this.learnFromSuccess(options, response);
        
        // Calculate metrics
        const latency = Date.now() - startTime;
        const result: AgentResponse = {
          response: response.text,
          confidence: response.confidence || 0.9,
          model: response.model,
          tokensUsed: response.tokensUsed || 0,
          latency,
          metadata: {
            attempt,
            sessionId: this.sessionId,
            timestamp: new Date().toISOString()
          }
        };
        
        // Store metrics
        this.recordMetrics(result);
        
        this.emitProgress({
          stage: 'complete',
          progress: 100,
          message: 'Task completed successfully'
        });
        
        if (this.config.onComplete) {
          this.config.onComplete(result);
        }
        
        return result;
        
      } catch (error) {
        this.logError(`Attempt ${attempt} failed:`, error);
        
        if (this.config.onError) {
          this.config.onError(error as Error, attempt);
        }
        
        if (attempt >= maxRetries) {
          throw new Error(`Failed after ${maxRetries} attempts: ${(error as Error).message}`);
        }
        
        // Wait before retry
        await this.sleep(this.config.retryDelay || 1000);
      }
    }
    
    throw new Error('Execution failed');
  }

  /**
   * Chat interface with conversation memory
   */
  async chat(message: string, context?: Record<string, any>): Promise<AgentResponse> {
    await this.ensureInitialized();
    
    const userId = context?.userId || 'default';
    
    // Add message to conversation memory
    this.conversationMemory.addMessage(userId, {
      role: 'user',
      content: message,
      timestamp: Date.now()
    });
    
    // Get conversation history
    const history = this.conversationMemory.getHistory(userId);
    
    // Execute with conversation context
    const response = await this.execute({
      task: message,
      context: {
        ...context,
        conversationHistory: history
      },
      userId
    });
    
    // Add response to conversation memory
    this.conversationMemory.addMessage(userId, {
      role: 'assistant',
      content: response.response,
      timestamp: Date.now()
    });
    
    return response;
  }

  /**
   * Analyze data and answer questions
   */
  async analyze(data: any, question: string): Promise<AgentResponse> {
    return this.execute({
      task: `Analyze this data and answer: ${question}`,
      context: {
        data: JSON.stringify(data, null, 2)
      }
    });
  }

  /**
   * Extract structured data
   */
  async extract(fields: string[], context?: Record<string, any>): Promise<AgentResponse> {
    return this.execute({
      task: `Extract the following fields: ${fields.join(', ')}`,
      context
    });
  }

  /**
   * Build context with all intelligence systems
   */
  private async buildContext(options: ExecuteOptions): Promise<string> {
    const parts: string[] = [];
    const genConfig = this.configManager.getGenerationConfig();
    
    // System prompt
    const systemPrompt = this.config.systemPrompt || MODE_PROMPTS[this.config.mode];
    if (systemPrompt) {
      parts.push(`<system>${systemPrompt}</system>`);
    }
    
    // RAG: Retrieve similar past successes
    if (genConfig.useRAG) {
      const episodes = await this.ragMemory.recall(options.task, genConfig.ragEpisodes);
      if (episodes.length > 0) {
        parts.push(`<past_successes>\n${episodes.map(e => e.content).join('\n\n')}\n</past_successes>`);
      }
    }
    
    // Knowledge Base: Domain-specific patterns
    if (genConfig.useKnowledge) {
      const knowledge = await this.knowledgeBase.query(options.task);
      if (knowledge.length > 0) {
        parts.push(`<knowledge>\n${knowledge.map(k => k.content).join('\n\n')}\n</knowledge>`);
      }
    }
    
    // Context Guides
    if (genConfig.useContextGuides && genConfig.enabledGuides.length > 0) {
      const guides = await this.loadContextGuides(genConfig.enabledGuides);
      if (guides) {
        parts.push(`<guides>\n${guides}\n</guides>`);
      }
    }
    
    // HTML Context (if provided)
    if (genConfig.useHTMLContext && options.context?.htmlSnapshot) {
      let html = options.context.htmlSnapshot;
      if (html.length > genConfig.htmlMaxChars) {
        html = html.substring(0, genConfig.htmlMaxChars) + '\n... (truncated)';
      }
      parts.push(`<html_snapshot>\n${html}\n</html_snapshot>`);
    }
    
    // Page Analysis (if available)
    if (genConfig.usePageAnalysis && options.context?.pageAnalysis) {
      parts.push(`<page_analysis>\n${JSON.stringify(options.context.pageAnalysis, null, 2)}\n</page_analysis>`);
    }
    
    // Attempt History (for iterative fixes)
    if (genConfig.useAttemptHistory && options.context?.attemptHistory) {
      const history = options.context.attemptHistory.slice(-genConfig.maxHistoryAttempts);
      parts.push(`<previous_attempts>\n${JSON.stringify(history, null, 2)}\n</previous_attempts>`);
    }
    
    // Conversation History (for chat mode)
    if (options.context?.conversationHistory) {
      parts.push(`<conversation>\n${JSON.stringify(options.context.conversationHistory, null, 2)}\n</conversation>`);
    }
    
    // Additional context
    if (options.context) {
      const additionalContext = { ...options.context };
      delete additionalContext.htmlSnapshot;
      delete additionalContext.pageAnalysis;
      delete additionalContext.attemptHistory;
      delete additionalContext.conversationHistory;
      
      if (Object.keys(additionalContext).length > 0) {
        parts.push(`<context>\n${JSON.stringify(additionalContext, null, 2)}\n</context>`);
      }
    }
    
    // Task/Question
    parts.push(`<task>${options.task}</task>`);
    
    // Join all parts
    let prompt = parts.join('\n\n');
    
    // Apply prompt optimization if enabled
    if (genConfig.usePromptOptimizer) {
      prompt = this.promptOptimizer.optimize(prompt, 4096);
    }
    
    return prompt;
  }

  /**
   * Auto-optimize configuration based on detected hardware
   */
  private async autoOptimizeConfig(capabilities: any) {
    const recommendations = this.capabilityDetector.getSummary().recommendations;
    
    // If Ollama available with good model, prefer it
    if (capabilities.ollama.available) {
      this.logInfo('Ollama detected, using for maximum context');
      this.config.modelPreferences = {
        primary: 'ollama',
        fallback: 'webgpu',
        ...this.config.modelPreferences
      };
    }
    
    // If only WebGPU available, enable compression
    if (!capabilities.ollama.available && capabilities.webgpu.available) {
      this.logInfo('WebGPU only, enabling prompt compression');
      if (this.config.intelligence) {
        this.config.intelligence.promptCompression = { enabled: true, targetReduction: 2000 };
      }
    }
    
    // Adjust token limits based on GPU VRAM
    const limits = this.capabilityDetector.getRecommendedLimits();
    this.logInfo('Token limits adjusted:', limits);
    
    // Update config manager with new limits
    this.configManager.updateFromCapabilities(capabilities, limits);
  }

  /**
   * Learn from successful execution
   */
  private async learnFromSuccess(options: ExecuteOptions, response: any) {
    // Store in RAG memory
    await this.ragMemory.store({
      task: options.task,
      context: options.context,
      response: response.text,
      success: true,
      timestamp: Date.now(),
      confidence: response.confidence || 0.9
    });
    
    // Update knowledge base
    await this.knowledgeBase.learn(options.task, response.text, response.confidence || 0.9);
  }

  /**
   * Load context guides
   */
  private async loadContextGuides(guideNames: string[]): Promise<string> {
    // This would load from files or embedded resources
    // For now, return placeholder
    return guideNames.map(name => `Guide: ${name}`).join('\n');
  }

  /**
   * Configuration updates
   */
  updateConfig(newConfig: Partial<AgentConfig>) {
    this.config = { ...this.config, ...newConfig };
    this.configManager.updateConfig(newConfig.intelligence, newConfig.preset);
  }

  /**
   * Get current token estimates
   */
  async getTokenEstimates() {
    return await this.configManager.calculateTokenEstimates();
  }

  /**
   * Reset agent state
   */
  reset() {
    this.ragMemory.clear();
    this.conversationMemory.clear();
    this.metrics = [];
    this.sessionId = this.generateSessionId();
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    return {
      totalRequests: this.metrics.length,
      avgLatency: this.metrics.reduce((sum, m) => sum + m.latency, 0) / this.metrics.length || 0,
      avgTokens: this.metrics.reduce((sum, m) => sum + m.tokensUsed, 0) / this.metrics.length || 0,
      avgConfidence: this.metrics.reduce((sum, m) => sum + m.confidence, 0) / this.metrics.length || 0,
      models: [...new Set(this.metrics.map(m => m.model))],
      sessionId: this.sessionId
    };
  }

  // Private utility methods
  
  private validateAndMergeConfig(config: AgentConfig): AgentConfig {
    // Apply preset if specified
    if (config.preset && PRESETS[config.preset]) {
      config.intelligence = {
        ...PRESETS[config.preset].intelligence,
        ...config.intelligence
      };
    }
    
    // Set defaults
    return {
      name: config.name || 'UniversalAgent',
      mode: config.mode,
      systemPrompt: config.systemPrompt,
      intelligence: config.intelligence || {},
      preset: config.preset,
      modelPreferences: config.modelPreferences || { primary: 'ollama', fallback: 'webgpu' },
      modelConfig: config.modelConfig || {},
      hardware: config.hardware,
      tools: config.tools || [],
      onProgress: config.onProgress,
      onError: config.onError,
      onComplete: config.onComplete,
      onToken: config.onToken,
      streaming: config.streaming || false,
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      monitoring: config.monitoring || { enabled: false }
    };
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  private emitProgress(progress: ProgressEvent) {
    if (this.config.onProgress) {
      this.config.onProgress(progress);
    }
  }

  private recordMetrics(result: AgentResponse) {
    this.metrics.push(result);
    
    if (this.config.monitoring?.enabled && this.config.monitoring.onMetrics) {
      this.config.monitoring.onMetrics({
        latency: result.latency,
        tokensUsed: result.tokensUsed,
        model: result.model,
        timestamp: Date.now()
      });
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private logInfo(...args: any[]) {
    console.log(`[${this.config.name}]`, ...args);
  }

  private logSuccess(...args: any[]) {
    console.log(`✅ [${this.config.name}]`, ...args);
  }

  private logError(...args: any[]) {
    console.error(`❌ [${this.config.name}]`, ...args);
  }
}
