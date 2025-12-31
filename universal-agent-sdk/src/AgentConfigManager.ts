import type { AgentConfig, IntelligenceConfig, TokenEstimates } from './types';
import { SystemCapabilityDetector } from './SystemCapabilityDetector';

export class AgentConfigManager {
  private config: IntelligenceConfig;
  private detector: SystemCapabilityDetector;

  constructor(intelligence?: Partial<IntelligenceConfig>, preset?: string) {
    this.detector = new SystemCapabilityDetector();
    this.config = this.getDefaultConfig();
    
    if (preset) {
      this.applyPreset(preset);
    }
    
    if (intelligence) {
      this.config = { ...this.config, ...intelligence };
    }
  }

  private getDefaultConfig(): IntelligenceConfig {
    return {
      rag: {
        enabled: true,
        maxEpisodes: 3,
        similarityThreshold: 0.7
      },
      knowledge: {
        enabled: true,
        domainSpecific: true
      },
      guides: {
        enabled: true,
        selected: ['basic-selectors', 'error-handling']
      },
      htmlContext: {
        enabled: true,
        maxChars: 10000
      },
      pageAnalysis: {
        enabled: true
      },
      compression: {
        enabled: false,
        target: 'none'
      },
      history: {
        enabled: true,
        maxAttempts: 3
      },
      conversation: {
        enabled: false,
        maxMessages: 10
      }
    };
  }

  async calculateTokenEstimates(): Promise<TokenEstimates> {
    let total = 800; // Base prompt
    
    if (this.config.rag.enabled) {
      total += this.config.rag.maxEpisodes * 250;
    }
    
    if (this.config.knowledge.enabled) {
      total += 400;
    }
    
    if (this.config.guides.enabled) {
      total += this.config.guides.selected.length * 300;
    }
    
    if (this.config.htmlContext.enabled) {
      total += Math.floor(this.config.htmlContext.maxChars / 4);
    }
    
    if (this.config.pageAnalysis.enabled) {
      total += 200;
    }
    
    if (this.config.history.enabled) {
      total += this.config.history.maxAttempts * 200;
    }
    
    const capabilities = await this.detector.detectAll();
    const limits = this.detector.getRecommendedLimits();
    
    let cpuRisk: 'none' | 'low' | 'medium' | 'high' = 'none';
    if (total <= limits.gpuSafe) cpuRisk = 'none';
    else if (total <= limits.balanced) cpuRisk = 'low';
    else if (total <= limits.ollama32K) cpuRisk = 'medium';
    else cpuRisk = 'high';
    
    return {
      basePrompt: 800,
      withContexts: total,
      optimized: this.config.compression.enabled ? Math.floor(total * 0.5) : total,
      total: total,
      fitsInGPU: total <= 4096,
      cpuRisk
    };
  }

  getGenerationConfig() {
    return {
      useRAG: this.config.rag.enabled,
      ragEpisodes: this.config.rag.maxEpisodes,
      useKnowledge: this.config.knowledge.enabled,
      useContextGuides: this.config.guides.enabled,
      enabledGuides: this.config.guides.selected,
      useHTMLContext: this.config.htmlContext.enabled,
      htmlMaxChars: this.config.htmlContext.maxChars,
      usePromptOptimizer: this.config.compression.enabled,
      usePageAnalysis: this.config.pageAnalysis.enabled,
      useAttemptHistory: this.config.history.enabled,
      maxHistoryAttempts: this.config.history.maxAttempts
    };
  }

  setEnabled(system: string, enabled: boolean): void {
    const parts = system.split('.');
    let current: any = this.config;
    
    for (let i = 0; i < parts.length - 1; i++) {
      current = current[parts[i]];
    }
    
    current[parts[parts.length - 1]] = enabled;
  }

  applyPreset(preset: string): boolean {
    const presets: Record<string, Partial<IntelligenceConfig>> = {
      'maximum': {
        rag: { enabled: true, maxEpisodes: 3 },
        knowledge: { enabled: true, domainSpecific: true },
        guides: { enabled: true, selected: ['basic-selectors', 'error-handling', 'best-practices'] },
        htmlContext: { enabled: true, maxChars: 10000 },
        pageAnalysis: { enabled: true },
        compression: { enabled: false, target: 'none' },
        history: { enabled: true, maxAttempts: 3 }
      },
      'balanced': {
        rag: { enabled: true, maxEpisodes: 2 },
        knowledge: { enabled: true, domainSpecific: true },
        guides: { enabled: true, selected: ['basic-selectors', 'error-handling'] },
        htmlContext: { enabled: true, maxChars: 5000 },
        pageAnalysis: { enabled: true },
        compression: { enabled: false, target: 'none' },
        history: { enabled: true, maxAttempts: 2 }
      },
      'gpu': {
        rag: { enabled: true, maxEpisodes: 1 },
        knowledge: { enabled: false, domainSpecific: false },
        guides: { enabled: true, selected: ['basic-selectors'] },
        htmlContext: { enabled: true, maxChars: 2000 },
        pageAnalysis: { enabled: true },
        compression: { enabled: true, target: 'gpu' },
        history: { enabled: false, maxAttempts: 0 }
      },
      'minimal': {
        rag: { enabled: false, maxEpisodes: 0 },
        knowledge: { enabled: false, domainSpecific: false },
        guides: { enabled: true, selected: ['basic-selectors'] },
        htmlContext: { enabled: true, maxChars: 3000 },
        pageAnalysis: { enabled: true },
        compression: { enabled: false, target: 'none' },
        history: { enabled: false, maxAttempts: 0 }
      }
    };

    const presetConfig = presets[preset];
    if (!presetConfig) return false;

    this.config = { ...this.config, ...presetConfig };
    return true;
  }
}
