// Agent Configuration Manager - Enable/disable intelligence systems with token estimation
class AgentConfigManager {
  constructor() {
    this.configKey = 'agentIntelligenceConfig';
    this.config = this.loadConfig();
    this.tokenEstimates = this.calculateTokenEstimates();
  }

  // Default configuration
  getDefaultConfig() {
    return {
      // RAG Memory Systems
      enhancedMemory: {
        enabled: true,
        name: 'RAG Episodic Memory',
        description: 'Retrieves similar past successful patterns',
        avgTokens: 800,
        maxEpisodes: 3,
        provides: 'Past success patterns, code snippets, success factors'
      },
      
      conversationMemory: {
        enabled: false, // Currently not used in generation, but available
        name: 'Conversation History',
        description: 'Retains chat context across sessions',
        avgTokens: 0, // Not included in prompts yet
        maxMessages: 10,
        provides: 'User feedback patterns, interaction history'
      },
      
      knowledgeBase: {
        enabled: true,
        name: 'Domain Knowledge Base',
        description: 'Learned patterns by domain and template type',
        avgTokens: 400,
        provides: 'Domain-specific best practices, common pitfalls'
      },
      
      // Context Guides
      contextGuides: {
        enabled: true,
        name: 'Context Guides (5 guides)',
        description: 'Proven scraping patterns and tactics',
        avgTokens: 1450,
        guides: {
          'scraper-guide': { enabled: true, tokens: 600 },
          'basic-selectors': { enabled: true, tokens: 200 },
          'puppeteer-tactics': { enabled: true, tokens: 300 },
          'error-handling': { enabled: true, tokens: 200 },
          'date-parsing': { enabled: true, tokens: 150 }
        },
        provides: 'Selector patterns, Puppeteer tactics, error handling, date parsing'
      },
      
      // HTML Context
      htmlContext: {
        enabled: true,
        name: 'Live HTML Snapshot',
        description: 'Fetches actual page HTML for selector validation',
        avgTokens: 2500, // 10KB HTML ≈ 2500 tokens
        maxChars: 10000,
        optimizable: true,
        provides: 'Real DOM structure, actual IDs/classes, page layout'
      },
      
      // Prompt Optimizer
      promptOptimizer: {
        enabled: false, // Enable for GPU inference (4K limit)
        name: 'Prompt Compression',
        description: 'Compresses prompts to fit GPU token limits',
        avgTokens: -2000, // Saves ~2000 tokens
        provides: 'Fits prompts into 4K GPU context window'
      },
      
      // Page Structure Analysis
      pageStructureAnalysis: {
        enabled: true,
        name: 'Page Structure Analysis',
        description: 'Analyzes framework, IDs, classes before generation',
        avgTokens: 200,
        provides: 'Framework detection, relevant IDs/classes, container hints'
      },
      
      // Previous Attempt History
      attemptHistory: {
        enabled: true,
        name: 'Previous Attempt History',
        description: 'Includes past failed attempts in fix prompts',
        avgTokens: 600, // Per iteration
        maxAttempts: 3,
        provides: 'What was tried, what failed, error patterns'
      }
    };
  }

  loadConfig() {
    const stored = localStorage.getItem(this.configKey);
    if (stored) {
      try {
        const parsedConfig = JSON.parse(stored);
        // Merge with defaults to handle new features
        return this.mergeWithDefaults(parsedConfig);
      } catch (e) {
        console.warn('Failed to load config, using defaults:', e);
      }
    }
    return this.getDefaultConfig();
  }

  mergeWithDefaults(stored) {
    const defaults = this.getDefaultConfig();
    const merged = { ...defaults };
    
    // Override with stored values
    for (const [key, value] of Object.entries(stored)) {
      if (merged[key]) {
        merged[key] = { ...merged[key], ...value };
      }
    }
    
    return merged;
  }

  saveConfig() {
    localStorage.setItem(this.configKey, JSON.stringify(this.config));
    this.tokenEstimates = this.calculateTokenEstimates();
  }

  // Enable/disable a system
  setEnabled(systemName, enabled) {
    if (this.config[systemName]) {
      this.config[systemName].enabled = enabled;
      this.saveConfig();
      return true;
    }
    return false;
  }

  // Set HTML context size
  setHtmlContextSize(chars) {
    this.config.htmlContext.maxChars = Math.max(0, Math.min(50000, chars));
    this.config.htmlContext.avgTokens = Math.floor(chars / 4); // ~4 chars per token
    this.saveConfig();
  }

  // Set RAG episode count
  setRAGEpisodeCount(count) {
    this.config.enhancedMemory.maxEpisodes = Math.max(0, Math.min(10, count));
    this.config.enhancedMemory.avgTokens = count * 250; // ~250 tokens per episode
    this.saveConfig();
  }

  // Enable/disable individual context guide
  setContextGuideEnabled(guideName, enabled) {
    if (this.config.contextGuides.guides[guideName]) {
      this.config.contextGuides.guides[guideName].enabled = enabled;
      this.recalculateContextGuidesTotal();
      this.saveConfig();
      return true;
    }
    return false;
  }

  recalculateContextGuidesTotal() {
    let total = 0;
    for (const guide of Object.values(this.config.contextGuides.guides)) {
      if (guide.enabled) {
        total += guide.tokens;
      }
    }
    this.config.contextGuides.avgTokens = total;
  }

  // Calculate total token usage
  calculateTokenEstimates() {
    let basePrompt = 800; // Base generation prompt
    let withContexts = basePrompt;
    let optimized = basePrompt;

    // Add enabled systems
    for (const [key, system] of Object.entries(this.config)) {
      if (system.enabled && system.avgTokens) {
        withContexts += system.avgTokens;
      }
    }

    // If optimizer enabled, apply reduction
    if (this.config.promptOptimizer.enabled) {
      optimized = Math.floor(withContexts * 0.5); // ~50% reduction
    } else {
      optimized = withContexts;
    }

    return {
      basePrompt,
      withContexts,
      optimized,
      maxResponse: 2000, // Expected response size
      total: optimized + 2000,
      fitsInGPU: (optimized + 2000) <= 4096,
      fitsInOllama32K: (optimized + 2000) <= 32768,
      cpuRisk: this.estimateCPURisk(optimized + 2000)
    };
  }

  async estimateCPURisk(totalTokens) {
    // Estimate CPU usage risk based on token count and detected hardware
    
    // Try to get dynamic limits from system detection
    if (window.SystemCapabilityDetector) {
      try {
        const detector = new window.SystemCapabilityDetector();
        await detector.detectAll();
        const limits = detector.getRecommendedLimits();
        
        // Use detected limits
        if (totalTokens <= limits.gpuSafe) return 'none'; // Pure GPU
        if (totalTokens <= limits.balanced) return 'low'; // 5-10% CPU
        if (totalTokens <= limits.ollama32K) return 'medium'; // 10-20% CPU
        return 'high'; // >20% CPU
      } catch (error) {
        console.warn('Failed to detect capabilities, using fallback:', error);
      }
    }
    
    // Fallback to conservative static thresholds
    if (totalTokens <= 2048) return 'none'; // 0% CPU
    if (totalTokens <= 4096) return 'low';  // 5-10% CPU
    if (totalTokens <= 6144) return 'medium'; // 10-20% CPU
    return 'high'; // >20% CPU
  }

  // Get configuration for generation
  getGenerationConfig() {
    return {
      useRAG: this.config.enhancedMemory.enabled,
      ragEpisodes: this.config.enhancedMemory.maxEpisodes,
      useKnowledge: this.config.knowledgeBase.enabled,
      useContextGuides: this.config.contextGuides.enabled,
      enabledGuides: Object.entries(this.config.contextGuides.guides)
        .filter(([_, guide]) => guide.enabled)
        .map(([key, _]) => key),
      useHTMLContext: this.config.htmlContext.enabled,
      htmlMaxChars: this.config.htmlContext.maxChars,
      usePromptOptimizer: this.config.promptOptimizer.enabled,
      usePageAnalysis: this.config.pageStructureAnalysis.enabled,
      useAttemptHistory: this.config.attemptHistory.enabled,
      maxHistoryAttempts: this.config.attemptHistory.maxAttempts,
      estimatedTokens: this.tokenEstimates
    };
  }

  // Get preset configurations
  getPresets() {
    return {
      'maximum-intelligence': {
        name: 'Maximum Intelligence',
        description: 'All systems enabled (8-12K tokens) - best for Ollama 32K context',
        config: {
          enhancedMemory: { enabled: true, maxEpisodes: 3 },
          knowledgeBase: { enabled: true },
          contextGuides: { 
            enabled: true,
            guides: {
              'scraper-guide': { enabled: true },
              'basic-selectors': { enabled: true },
              'puppeteer-tactics': { enabled: true },
              'error-handling': { enabled: true },
              'date-parsing': { enabled: true }
            }
          },
          htmlContext: { enabled: true, maxChars: 10000 },
          promptOptimizer: { enabled: false },
          pageStructureAnalysis: { enabled: true },
          attemptHistory: { enabled: true, maxAttempts: 3 }
        },
        estimatedTokens: 10000
      },
      
      'balanced': {
        name: 'Balanced',
        description: 'Core systems only (5-7K tokens) - good for most models',
        config: {
          enhancedMemory: { enabled: true, maxEpisodes: 2 },
          knowledgeBase: { enabled: true },
          contextGuides: { 
            enabled: true,
            guides: {
              'scraper-guide': { enabled: false },
              'basic-selectors': { enabled: true },
              'puppeteer-tactics': { enabled: true },
              'error-handling': { enabled: true },
              'date-parsing': { enabled: false }
            }
          },
          htmlContext: { enabled: true, maxChars: 5000 },
          promptOptimizer: { enabled: false },
          pageStructureAnalysis: { enabled: true },
          attemptHistory: { enabled: true, maxAttempts: 2 }
        },
        estimatedTokens: 6000
      },
      
      'gpu-optimized': {
        name: 'GPU Optimized',
        description: 'Compressed for 4K GPU inference (3-4K tokens) - WebGPU/WebLLM',
        config: {
          enhancedMemory: { enabled: true, maxEpisodes: 1 },
          knowledgeBase: { enabled: false },
          contextGuides: { 
            enabled: true,
            guides: {
              'scraper-guide': { enabled: false },
              'basic-selectors': { enabled: true },
              'puppeteer-tactics': { enabled: false },
              'error-handling': { enabled: true },
              'date-parsing': { enabled: false }
            }
          },
          htmlContext: { enabled: true, maxChars: 2000 },
          promptOptimizer: { enabled: true },
          pageStructureAnalysis: { enabled: true },
          attemptHistory: { enabled: false }
        },
        estimatedTokens: 3500
      },
      
      'minimal': {
        name: 'Minimal',
        description: 'Bare essentials only (2-3K tokens) - fastest generation',
        config: {
          enhancedMemory: { enabled: false },
          knowledgeBase: { enabled: false },
          contextGuides: { 
            enabled: true,
            guides: {
              'scraper-guide': { enabled: false },
              'basic-selectors': { enabled: true },
              'puppeteer-tactics': { enabled: false },
              'error-handling': { enabled: true },
              'date-parsing': { enabled: false }
            }
          },
          htmlContext: { enabled: true, maxChars: 3000 },
          promptOptimizer: { enabled: false },
          pageStructureAnalysis: { enabled: true },
          attemptHistory: { enabled: false }
        },
        estimatedTokens: 2500
      }
    };
  }

  // Apply a preset
  applyPreset(presetName) {
    const preset = this.getPresets()[presetName];
    if (!preset) return false;

    // Apply preset config
    for (const [systemName, systemConfig] of Object.entries(preset.config)) {
      if (this.config[systemName]) {
        this.config[systemName] = { ...this.config[systemName], ...systemConfig };
      }
    }

    this.saveConfig();
    return true;
  }

  // Generate summary for UI display
  getSummary() {
    const enabled = [];
    const disabled = [];

    for (const [key, system] of Object.entries(this.config)) {
      if (system.enabled) {
        enabled.push({
          name: system.name,
          tokens: system.avgTokens,
          description: system.description
        });
      } else {
        disabled.push({
          name: system.name,
          tokens: system.avgTokens,
          description: system.description
        });
      }
    }

    return {
      enabled,
      disabled,
      estimates: this.tokenEstimates,
      totalEnabled: enabled.length,
      totalDisabled: disabled.length,
      recommendation: this.getRecommendation()
    };
  }

  getRecommendation() {
    const tokens = this.tokenEstimates.total;
    
    if (tokens <= 4096) {
      return {
        level: 'optimal',
        message: '✅ Fits in GPU inference (4K context) - excellent performance',
        color: 'green'
      };
    } else if (tokens <= 6144) {
      return {
        level: 'good',
        message: '✓ Good configuration (6K context) - low CPU usage expected',
        color: 'blue'
      };
    } else if (tokens <= 12000) {
      return {
        level: 'acceptable',
        message: '⚠ Large context (12K) - requires Ollama, may use some CPU',
        color: 'orange'
      };
    } else {
      return {
        level: 'risky',
        message: '⚠️ Very large context (>12K) - high CPU usage likely',
        color: 'red'
      };
    }
  }

  // Export current configuration
  exportConfig() {
    return JSON.stringify(this.config, null, 2);
  }

  // Import configuration
  importConfig(jsonString) {
    try {
      const imported = JSON.parse(jsonString);
      this.config = this.mergeWithDefaults(imported);
      this.saveConfig();
      return true;
    } catch (e) {
      console.error('Failed to import config:', e);
      return false;
    }
  }
}

// Export for use in extension
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AgentConfigManager };
}

if (typeof window !== 'undefined') {
  window.AgentConfigManager = AgentConfigManager;
}
